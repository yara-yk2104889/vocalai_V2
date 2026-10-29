import OpenAI from "openai";

// Writes a name in Arabic script (e.g. "Sara" → "سارة"), so the Arabic voice
// says it like an Arabic name instead of reading out English letters.
export async function POST(req: Request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return Response.json({ error: "No name provided" }, { status: 400 });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Write the given person's name in Arabic script, the way an Arabic speaker would spell it (e.g. "Sara" → "سارة", "Mohammed" → "محمد", "Emily" → "إيميلي"). Transliterate the name; do not translate its meaning. Return ONLY valid JSON in this shape: {"arabic": "..."}`,
        },
        { role: "user", content: name.trim() },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    const arabic = typeof parsed.arabic === "string" ? parsed.arabic.trim() : "";
    if (!arabic) throw new Error("No Arabic name returned");

    return Response.json({ arabic });
  } catch (err) {
    console.error("transliterate-name error:", err);
    return Response.json({ error: "Failed to transliterate name" }, { status: 500 });
  }
}
