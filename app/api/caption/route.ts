import OpenAI from "openai";

export async function POST(req: Request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { words, language } = await req.json();

    if (!words?.trim()) {
      return Response.json({ caption: null });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 40,
      messages: [
        {
          role: "system",
          content: `You are an AAC caption helper. The user selected these symbol tiles in order: you must form a grammatically correct sentence using ONLY those words — do not add, remove, or replace any content words. You may only add minimal grammar words (like "to", "and") if needed to connect the given words. Keep it short. No punctuation at the end. ${language === "ar" ? "Reply in Arabic only." : "Reply in English only."}`,
        },
        { role: "user", content: `Tiles: ${words}` },
      ],
    });

    const caption = response.choices[0].message.content?.trim() ?? null;
    return Response.json({ caption });
  } catch {
    return Response.json({ caption: null });
  }
}
