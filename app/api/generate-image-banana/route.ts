// Pollinations.ai image generation — completely free, no API key needed

export const maxDuration = 60; // allow up to 60s (Pollinations can be slow)

const PROMPT = (userPrompt: string) =>
  `Create a simple visual verification image for this intended message: "${userPrompt}". No text, labels, captions, letters, words, or speech bubbles. No AAC card, flashcard, or poster format. Clean, natural, easy-to-understand visual scene. Simple, uncluttered, child-friendly composition. Plain white or very light background. Focus on the key meaning, not decorative details.`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const encodedPrompt = encodeURIComponent(PROMPT(prompt));
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;

    // Pollinations returns the image directly — fetch it and convert to base64
    const imageRes = await fetch(url, { signal: AbortSignal.timeout(55000) });

    if (!imageRes.ok) {
      return Response.json({ error: "Pollinations request failed" }, { status: 500 });
    }

    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mime = imageRes.headers.get("content-type") ?? "image/jpeg";

    return Response.json({ url: `data:${mime};base64,${base64}` });
  } catch (error) {
    console.error("generate-image-pollinations error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 },
    );
  }
}
