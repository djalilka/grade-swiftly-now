/**
 * ISOLATED OCR + GRADING MODULE.
 *
 * Swap the implementation here (stronger OCR / different model) without
 * touching the UI. Contract: two base64 data URLs in, a score out.
 */

export type GradeResult = {
  score: number;
  total: number;
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

const SYSTEM_PROMPT = `You are an exam grader with expert OCR for handwritten and printed Arabic and French.
You receive two images:
1) The student's answer sheet.
2) The official correction / answer key sheet, which states the correct answers and the points for each question (e.g. "Q1: ... (2 pts)").

Read both sheets carefully, match the student's answers to the key question by question, award full/partial points per the key, and compute the total.
If the key does not state a maximum, assume the standard total of 20.
Respond with ONLY a JSON object, no markdown, no explanation:
{"score": <number>, "total": <number>}`;

export async function gradeSheets(
  studentImage: string,
  keyImage: string,
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
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Student's answer sheet:" },
            { type: "image_url", image_url: { url: studentImage } },
            { type: "text", text: "Correction / answer key sheet:" },
            { type: "image_url", image_url: { url: keyImage } },
            { type: "text", text: 'Return only {"score": n, "total": n}.' },
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
  const parsed = JSON.parse(match[0]) as { score?: number; total?: number };
  if (typeof parsed.score !== "number") throw new Error("PARSE_ERROR");

  return {
    score: Math.round(parsed.score * 100) / 100,
    total: typeof parsed.total === "number" && parsed.total > 0 ? parsed.total : 20,
  };
}
