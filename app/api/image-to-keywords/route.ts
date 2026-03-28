import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, context, customKeywords, language } = body;

    const langInstruction =
      language === "ar"
        ? "Generate ALL keywords in Arabic. Output must be in Arabic only."
        : "Generate all keywords in English.";

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AAC (Augmentative and Alternative Communication) keyword assistant. Your job is to look at the provided image and generate useful, concrete keywords an AAC user can tap to build a sentence in the given situation. Prioritise what you actually SEE in the image — objects, actions, people, context — combined with the scenario details. ${langInstruction} Respond with ONLY a comma-separated list of single words or very short phrases. No preamble, no numbering, no explanations.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image },
            },
            {
              type: "text",
              text: `Look carefully at the image above. Based on what you see AND the situation below, generate 5–7 AAC keywords.

Situation:
- Location: ${context.location}
- Time: ${context.timeOfDay}
- Goal: ${context.goal}
${customKeywords.length > 0 ? `- User also wants to include: ${customKeywords.join(", ")}` : ""}

Output a plain comma-separated list only. ${langInstruction}`,
            },
          ],
        },
      ],
    });

    const text = response.choices[0].message.content || "";

    const keywords = text
      .split(/\n|,|،|\d+\.\s*/g)
      .map((k) => k.trim().replace(/^[-*•]\s*/, ""))
      .filter((k) => k.length > 0 && k.length <= 40 && !/[:]/.test(k))
      .slice(0, 8);

    return Response.json({ keywords });
  } catch (err) {
    console.error("image-to-keywords error:", err);
    return Response.json({ error: "Failed to generate keywords" }, { status: 500 });
  }
}
