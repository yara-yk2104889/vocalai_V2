import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { note, language, refinementKeywords } = await req.json();

    const langInstruction =
      language === "ar"
        ? "Return all alternative descriptions in Arabic only."
        : "Return all alternative descriptions in English.";

    const refinementInstruction = refinementKeywords
      ? `The user wants images that incorporate these keywords: "${refinementKeywords}". EVERY alternative description MUST reflect these keywords — treat them as the primary focus.`
      : "";

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You help clarify intended meanings for AAC (Augmentative and Alternative Communication) users. Given a message whose generated image didn't match, suggest 3 alternative short visual descriptions (4–7 words each) that could better represent what the user meant. Each should be concrete and suitable for image generation. ${langInstruction} Return ONLY valid JSON in this shape: {"alternatives": ["...", "...", "..."]}`,
        },
        {
          role: "user",
          content: `The user's message: "${note}"\nThe generated image did not match. ${refinementInstruction} Suggest 3 alternative visual descriptions. ${langInstruction}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);
    const alternatives: string[] =
      parsed.alternatives ?? parsed.suggestions ?? parsed.options ?? [];

    return Response.json({ alternatives: alternatives.slice(0, 3) });
  } catch (err) {
    console.error("suggest-alternatives error:", err);
    return Response.json({ error: "Failed to suggest alternatives" }, { status: 500 });
  }
}
