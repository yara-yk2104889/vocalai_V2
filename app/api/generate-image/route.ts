import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, style, location, gender, condition, age, language, appearance } = body;

    const locationLabel: Record<string, string> = {
      cafe: "a café",
      playground: "a children's playground",
      classroom: "a school classroom",
      majlis: "a family majlis (traditional sitting room)",
      home: "a home",
    };
    const contextClues = [
      location && `Setting: ${locationLabel[location] ?? location}`,
      gender && `User gender: ${gender}`,
      condition && `User condition: ${condition}`,
      age && `User age: ${age}`,
      appearance && `User appearance: ${appearance}`,
    ].filter(Boolean).join("; ");

    const styleInstructions = style === "cartoon"
      ? `
            - Use a bright, friendly cartoon illustration style — bold outlines, flat colors, cheerful and expressive.
            - Think children's picture book or animated film aesthetic.
            - Characters and objects should be rounded, soft, and approachable.
            - Use vibrant, saturated colors.`
      : style === "symbolic"
      ? `
            - Use a clean AAC symbol style — simple, flat, high-contrast vector-like illustration.
            - Think Boardmaker, SymbolStix, or PCS (Picture Communication Symbols) aesthetics.
            - Single central object or scene on a plain white background.
            - Bold, clear outlines with minimal detail — immediately recognizable at small sizes.
            - No shadows, gradients, or photorealistic textures.
            - Use a limited, clean color palette. Each element should be easily distinguishable.`
      : `
            - Use a realistic photographic style — natural lighting, real-world textures and colors.
            - The scene should look like an actual photograph or high-quality photorealistic render.
            - Avoid cartoon or illustrated aesthetics.`;

    const sharedRequirements = style === "symbolic" ? `
            - Format it like a real AAC symbol card — a single clear symbol centered on a plain white or light background, optionally inside a simple border or frame.
            - Style it like Boardmaker, SymbolStix, or PCS symbols.
            - The text label at the bottom MUST be a natural, complete phrase expressing the combined meaning — NOT a list of the input words. For example, if the input is "sad don't understand", the label should be "I don't understand", not "Sad Don't understand".
            - The text label MUST be written in ${language === "ar" ? "Arabic" : "English"} only.${language === "ar" ? `
            - CRITICAL for Arabic text: every word's letters MUST be fully connected and joined as in standard handwritten Arabic — do NOT render disconnected, isolated, or broken letters. Use correct Arabic cursive script (النسخ العربي) with proper letter joining. For example "مساعدة" must appear as one fully joined word, not "م س ا ع د ة". Use a clean, bold, easy-to-read Arabic font with no letter-spacing gaps.` : ""}
            - Focus on one single concept or scene — no complex scenes.
            - Make it immediately recognizable at a small size.` : `
            - Do NOT add any text, labels, captions, letters, words, speech bubbles, or checkmarks.
            - Do NOT format it like an AAC card, flashcard, symbol board, worksheet, or poster.
            - Do NOT place the concept inside a bordered card or frame.
            - Show only a clean, natural, easy-to-understand visual scene.
            - Make the meaning obvious from the image itself.
            - Keep the composition simple, uncluttered, and child-friendly.
            - Use a plain white or very light background.
            - Focus on the key meaning of the message, not decorative details.
            - If the message is about wanting or requesting something, show that visually through the scene rather than writing words.`;

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt: `
            The following words are AAC symbol tiles selected by a user to communicate a message: "${prompt}".
            Interpret them together as a single, coherent communication intent — do NOT treat them as a list or label them word by word.
            For example: "sad don't understand" means the user is sad because they don't understand something; "I want water" means the user wants a drink of water.
            Generate a visual image that naturally represents this combined meaning.
            ${contextClues ? `Context about the user and setting: ${contextClues}.` : ""}

            Requirements:
            ${sharedRequirements}
            ${styleInstructions}
            `,
      size: "1024x1024",
    });

    const imageBase64 = response.data?.[0]?.b64_json;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image returned from OpenAI" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const imageUrl = `data:image/png;base64,${imageBase64}`;

    return Response.json({ url: imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Generate image route error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}