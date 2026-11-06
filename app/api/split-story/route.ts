import OpenAI from "openai";

export async function POST(req: Request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { sentence } = await req.json();

  const result = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        // Few keywords → the model fills in the usual steps; more detail → it follows the user exactly.
        content:
          "You help an AAC (Augmentative and Alternative Communication) app make a 4-picture story. " +
          "The user cannot speak, and builds a message from symbol tiles or a few typed words.\n\n" +
          "Turn the message into exactly 4 scenes that show, in order, what happens: beginning, middle, end.\n\n" +
          "- If the message is only a few keywords (e.g. \"hospital blood test\"), fill in the usual everyday steps of that event " +
          "so the 4 pictures make sense on their own. Keep it calm, simple and reassuring, with nothing frightening or graphic.\n" +
          "- If the message gives details (people, feelings, objects, what happens first or after), use all of them. " +
          "Never drop or contradict what the user said; every feeling the user mentions must be shown in a scene. " +
          "Only add steps where the user gave none.\n" +
          "- All 4 scenes follow the same person through one event, not separate unrelated pictures.\n" +
          "- Each scene is one picture with one clear action, written in English as an image prompt of 5–12 words, " +
          "even if the message is in Arabic.\n" +
          "- Each picture is drawn separately, so mention the setting in every scene (e.g. \"in the hospital\").\n" +
          "- Write people's names exactly as the user wrote them. Don't invent names or add family members the user didn't mention; " +
          "use roles like \"a nurse\" or \"a doctor\".\n" +
          "- No text, signs or speech bubbles in the scenes.\n\n" +
          "Return ONLY valid JSON: {\"scenes\": [\"...\", \"...\", \"...\", \"...\"]}",
      },
      {
        role: "user",
        content: `Message: "${sentence}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
    temperature: 0.4,
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
