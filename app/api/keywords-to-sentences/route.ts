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

  const intentionInstruction =
    intention === "question"
      ? "All 3 sentences MUST be either questions or direct requests — mix both naturally (e.g. 'Can I have...?', 'What is the dose?', 'I need this medicine.', 'Please help me.'). Some sentences can be questions, others can be requests — vary them."
      : intention === "conversation"
      ? "All 3 sentences MUST be conversational — social, friendly, or sharing-oriented (e.g. greetings, comments, joining a discussion). Do NOT phrase them as requests or questions about needs."
      : "";

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.9,
    messages: [
      {
        role: "system",
        content: `Generate short AAC-friendly sentences an AAC user can say. ${langInstruction} ${styleInstruction} ${intentionInstruction}`,
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

Return exactly 3 sentences. They MUST vary from each other:
- Sentence 1: use different keywords or a different angle than sentence 2 and 3
- Sentence 2: vary the structure or focus (e.g. ask about something else, or phrase it differently)
- Sentence 3: offer a third distinct option — not a rephrasing of 1 or 2

Do NOT repeat the same idea with slightly different words. Each sentence should feel like a genuinely different thing the user might want to say. ${langInstruction}
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
