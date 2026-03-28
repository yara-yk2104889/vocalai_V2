import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt: `
            Create a simple visual verification image for this intended message: "${prompt}".

            Requirements:
            - Do NOT add any text, labels, captions, letters, words, speech bubbles, or checkmarks.
            - Do NOT format it like an AAC card, flashcard, symbol board, worksheet, or poster.
            - Do NOT place the concept inside a bordered card or frame.
            - Show only a clean, natural, easy-to-understand visual scene.
            - Make the meaning obvious from the image itself.
            - Keep the composition simple, uncluttered, and child-friendly.
            - Use a plain white or very light background.
            - Focus on the key meaning of the message, not decorative details.
            - If the message is about wanting or requesting something, show that visually through the scene rather than writing words.

            The image should function as a meaning-check image, not as a final AAC symbol.
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
    console.error("Generate image route error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate image" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}