import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();
  const { keywords, context, language, style, intention } = body;

  const langInstruction =
    language === "ar"
      ? "Generate ALL sentences in Arabic. Output must be in Arabic only."
      : "Generate all sentences in English.";

  const styleInstruction =
    style === "simple"
      ? "Use very short, simple sentences (4–6 words max). Low cognitive load."
      : "Use clear, natural sentences suitable for the context.";

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Generate short AAC-friendly sentences an AAC user can say. ${langInstruction} ${styleInstruction}`,
      },
      {
        role: "user",
        content: `
Context:
Location: ${context.location}
Goal: ${context.goal}
Intention: ${intention}

Keywords:
${keywords.join(", ")}

Return exactly 3 short natural sentences the user could say. ${langInstruction}
`,
      },
    ],
  });

  const text = response.choices[0].message.content || "";

  const sentences = text
    .split("\n")
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return Response.json({ sentences });
}
