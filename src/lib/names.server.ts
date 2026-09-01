/** Isolated OCR module for extracting a student-name list from an image. */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

const SYSTEM_PROMPT = `You extract student name lists from photos of class rosters, in Arabic or French.
Read every name in the image, in the order they appear. Ignore headers, numbers, dates, marks and any column that is not a person's name.
Respond with ONLY this JSON object, no markdown fences:
{"names":["...","..."]}
If no names are readable respond with {"names":[]}.`;

export async function extractNamesFromImages(
  images: string[],
): Promise<string[]> {
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
            ...images.map((url) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
            { type: "text" as const, text: "Extract the names as JSON." },
          ],
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
  const text = json.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("PARSE_ERROR");
  let parsed: { names?: unknown };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("PARSE_ERROR");
  }
  const names = Array.isArray(parsed.names) ? parsed.names : [];
  return names.map((n) => String(n).trim()).filter(Boolean);
}
