/**
 * ISOLATED CLASS-INSIGHTS MODULE.
 * Takes an aggregated per-question loss summary for a class and returns a
 * short Arabic pedagogical analysis. No student data leaves beyond aggregates.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

const SYSTEM_PROMPT = `أنت مفتش تربوي خبير. تتلقى ملخصًا إحصائيًا لأداء قسم دراسي في اختبار: لكل سؤال نسبة النقاط المفقودة ونسبة التلاميذ الذين أخطأوا فيه.

مهمتك:
1. حدّد أهم 2 إلى 3 أسئلة فقدَ فيها القسم أكبر قدر من النقاط.
2. لكل واحد منها اكتب سطرًا واحدًا يصف الصعوبة بنسبة مئوية واضحة.
3. أضف من 2 إلى 3 توصيات بيداغوجية عملية وقصيرة.

أجب بالعربية فقط وبهذا الشكل JSON دون أي نص إضافي:
{"issues":[{"question_number":3,"headline":"80% من القسم واجهوا صعوبة في ...","detail":"..."}],"recommendations":["...","..."]}`;

export type ClassInsightItem = {
  question_number: number;
  headline: string;
  detail: string;
};

export type ClassInsights = {
  issues: ClassInsightItem[];
  recommendations: string[];
};

export type QuestionAggregate = {
  question_number: number;
  students: number;
  lost_points: number;
  possible_points: number;
  students_with_errors: number;
  correct_answer?: string;
};

export async function analyzeClass(
  className: string,
  aggregates: QuestionAggregate[],
): Promise<ClassInsights> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      top_p: 0,
      seed: 7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `القسم: ${className}\nالبيانات:\n${JSON.stringify(aggregates)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("NO_CREDITS");
    throw new Error(`AI error ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const match = (json.choices?.[0]?.message?.content ?? "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("PARSE_ERROR");

  let parsed: { issues?: unknown; recommendations?: unknown };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("PARSE_ERROR");
  }

  const issues: ClassInsightItem[] = (
    Array.isArray(parsed.issues) ? parsed.issues : []
  )
    .slice(0, 3)
    .map((raw, i) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      return {
        question_number:
          typeof o["question_number"] === "number"
            ? o["question_number"]
            : i + 1,
        headline: String(o["headline"] ?? ""),
        detail: String(o["detail"] ?? ""),
      };
    });

  const recommendations = (
    Array.isArray(parsed.recommendations) ? parsed.recommendations : []
  )
    .slice(0, 4)
    .map((r) => String(r));

  return { issues, recommendations };
}
