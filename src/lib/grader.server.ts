/**
 * ISOLATED OCR + GRADING MODULE.
 *
 * Swap the implementation here (stronger OCR / different model) without
 * touching the UI. Contract: two base64 data URLs in, a score out.
 *
 * Determinism rules:
 *  - temperature/top_p pinned to 0
 *  - the system prompt below is a FIXED constant, never templated per request
 *  - the final score is summed in code from the per-question breakdown
 */

export type GradeQuestion = {
  question_number: number;
  correct_answer: string;
  student_answer: string;
  points_earned: number;
  points_possible: number;
  reasoning: string;
};

export type GradeResult = {
  score: number;
  total: number;
  questions: GradeQuestion[];
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

/** FIXED grading prompt — do not build dynamically. */
const SYSTEM_PROMPT = `You are a strict, deterministic exam grader with expert OCR for handwritten and printed Arabic and French.

You receive two SETS of images:
SET A = the student's answer sheet, which may span several pages, given in page order.
SET B = the official correction / answer key sheet, which may also span several pages, given in page order.

Treat each set as ONE continuous document. Read ALL pages of a set together before doing anything: questions may continue across page breaks, and a question's answer may start on one page and finish on the next. Never grade a page in isolation and never duplicate a question that appears on more than one page.

Follow these steps IN ORDER, and write the result of every step into the JSON output:
STEP 1 — Read all pages of SET B and list every question: its number, its exact correct answer, and its point value (points_possible).
STEP 2 — Read all pages of SET A and, for each of those questions, extract exactly what the student wrote. If nothing was written anywhere in SET A, use the empty string "".
STEP 3 — For each question, compare the student's answer with the correct answer and decide full points, partial points, or zero. Give a one-line reason in "reasoning".
STEP 4 — Only after doing steps 1-3 for EVERY question, output the JSON.

Grading rules (apply identically every time):
- Ignore differences in spelling accents, letter shape, spacing, and capitalization if the meaning is clearly identical.
- Award partial points only when the answer key explicitly allows partial credit or the answer is partially complete; otherwise award full or zero.
- Never invent questions that are not on the key. Never skip a question on the key.
- points_earned must never exceed points_possible.

If the sheets are too blurry, empty, or unreadable, respond with exactly {"error": "unreadable"}.

Otherwise respond with ONLY this JSON object, no markdown fences, no explanation:
{"questions":[{"question_number":1,"correct_answer":"...","student_answer":"...","points_earned":2,"points_possible":2,"reasoning":"..."}],"total_score":5,"total_possible":6}`;

const USER_INSTRUCTION =
  "Grade the student's sheet (SET A, all pages) against the key (SET B, all pages). Follow STEP 1 to STEP 4 and return only the JSON object.";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function pageBlocks(label: string, images: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = [
    { type: "text", text: `${label} — ${images.length} page(s), in order:` },
  ];
  images.forEach((url, i) => {
    blocks.push({ type: "text", text: `Page ${i + 1} of ${images.length}:` });
    blocks.push({ type: "image_url", image_url: { url } });
  });
  return blocks;
}

export async function gradeSheets(
  studentImages: string[],
  keyImages: string[],
): Promise<GradeResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      top_p: 0,
      seed: 7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            ...pageBlocks("SET A — student's answer sheet", studentImages),
            ...pageBlocks("SET B — correction / answer key sheet", keyImages),
            { type: "text", text: USER_INSTRUCTION },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("NO_CREDITS");
    throw new Error(`AI error ${res.status}: ${body.slice(0, 300)}`);
  }


  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("PARSE_ERROR");

  let parsed: {
    questions?: unknown;
    total_score?: unknown;
    total_possible?: unknown;
    error?: string;
  };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("PARSE_ERROR");
  }
  if (parsed.error) throw new Error("UNREADABLE");

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: GradeQuestion[] = rawQuestions
    .map((q, i) => {
      const o = (q ?? {}) as Record<string, unknown>;
      const possible = num(o["points_possible"]);
      const earned = clamp(num(o["points_earned"]), 0, possible);
      return {
        question_number:
          typeof o["question_number"] === "number" ? o["question_number"] : i + 1,
        correct_answer: String(o["correct_answer"] ?? ""),
        student_answer: String(o["student_answer"] ?? ""),
        points_earned: earned,
        points_possible: possible,
        reasoning: String(o["reasoning"] ?? ""),
      };
    })
    .filter((q) => q.points_possible > 0);

  if (questions.length === 0) throw new Error("PARSE_ERROR");

  // Sum in code — never trust the model's stated total.
  const score = round2(questions.reduce((s, q) => s + q.points_earned, 0));
  const summedPossible = round2(
    questions.reduce((s, q) => s + q.points_possible, 0),
  );
  const statedPossible = num(parsed.total_possible);
  const total = summedPossible > 0 ? summedPossible : statedPossible > 0 ? statedPossible : 20;

  return { score: clamp(score, 0, total), total, questions };
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number): number {
  return round2(Math.min(Math.max(n, min), max));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
