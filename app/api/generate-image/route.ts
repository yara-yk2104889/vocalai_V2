import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, style, location, gender, condition, age, scenario } = body;

    const locationLabel: Record<string, string> = { pharmacy: "a pharmacy", cafe: "a café", majlis: "a family majlis (traditional sitting room)" };
    const contextClues = [
      location && `Setting: ${locationLabel[location] ?? location}`,
      scenario && `Scenario: ${scenario}`,
      gender && `User gender: ${gender}`,
      condition && `User condition: ${condition}`,
      age && `User age: ${age}`,
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
            - A short text label at the bottom is encouraged, as in real AAC cards.
            - Focus on one single concept — no complex scenes.
            - Make it immediately recognizable at a small size.` : `
            - Show only a clean, natural, easy-to-understand visual scene.
            - Make the meaning obvious from the image itself.
            - Keep the composition simple, uncluttered, and child-friendly.
            - Use a plain white or very light background.
            - Focus on the key meaning of the message, not decorative details.
            - If the message is about wanting or requesting something, show that visually through the scene rather than writing words.`;

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt: `
            Create a visual image for this intended message: "${prompt}".
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