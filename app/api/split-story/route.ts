import OpenAI from "openai";

export async function POST(req: Request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { sentence } = await req.json();

  const result = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You help an AAC (Augmentative and Alternative Communication) system for non-verbal children. " +
          "Given a message built from symbol tiles, split it into 2–4 short visual scenes that together tell the story. " +
          "Each scene must be a concrete, visual phrase of 3–6 words suitable as an image generation prompt. " +
          "Keep the narrative order. Return ONLY valid JSON: {\"scenes\": [\"...\", \"...\", ...]}",
      },
      {
        role: "user",
        content: `Message: "${sentence}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 200,
    temperature: 0.3,
  });

  const raw = result.choices[0].message.content ?? "{}";
  let scenes: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    scenes = Array.isArray(parsed.scenes) ? parsed.scenes.slice(0, 4) : [];
  } catch {
    scenes = [];
  }

  // Fallback: if GPT returns nothing useful, use the raw sentence as one scene
  if (scenes.length === 0) {
    scenes = [sentence];
  }

  return Response.json({ scenes });
}
