import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { words, language } = await req.json();

    if (!words?.trim()) {
      return Response.json({ caption: null });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 20,
      messages: [
        {
          role: "system",
          content: `Turn these AAC symbol words into one short, natural sentence. Use only simple, common words. Maximum 7 words. No punctuation at the end. ${language === "ar" ? "Reply in Arabic only." : "Reply in English only."}`,
        },
        { role: "user", content: words },
      ],
    });

    const caption = response.choices[0].message.content?.trim() ?? null;
    return Response.json({ caption });
  } catch {
    return Response.json({ caption: null });
  }
}
