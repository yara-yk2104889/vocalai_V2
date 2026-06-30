import OpenAI from "openai";

export async function POST(req: Request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body = await req.json();
    const {
      prompt,
      style,
      location,
      gender,
      condition,
      age,
      appearance,
      importantPeople,
      count: rawCount,
    } = body as {
      prompt: string;
      style: "realistic" | "cartoon" | "symbolic";
      location?: string;
      gender?: string;
      condition?: string;
      age?: string;
      appearance?: string;
      importantPeople?: { name: string; description: string }[];
      count?: number;
    };

    const count = Math.min(Math.max(1, rawCount ?? 1), 4);

    const contextParts = [
      location  && `Setting: ${location}`,
      gender    && `User gender: ${gender}`,
      condition && `User condition: ${condition}`,
      age       && `User age: ${age}`,
      appearance && `User appearance: ${appearance}`,
    ].filter(Boolean) as string[];

    const peopleDesc =
      (importantPeople ?? [])
        .map(p => `${p.name}: ${p.description}`)
        .join("; ");

    const contextClues = contextParts.join("; ");

    const styleInstructions =
      style === "cartoon"
        ? `
          - Bright, friendly cartoon illustration — bold outlines, flat colors, cheerful and expressive.
          - Children's picture book or animated film aesthetic.
          - Rounded, soft, approachable characters and objects.
          - Vibrant, saturated colors.`
        : style === "symbolic"
        ? `
          - Clean AAC symbol style — simple, flat, high-contrast, vector-like illustration.
          - Boardmaker / SymbolStix / PCS aesthetics.
          - Single central object or scene on a plain white background.
          - Bold, clear outlines with minimal detail — immediately recognizable at small sizes.
          - No shadows, gradients, or photorealistic textures.
          - Limited, clean color palette.`
        : `
          - Realistic photographic style — natural lighting, real-world textures and colors.
          - Looks like an actual photograph or high-quality photorealistic render.
          - Avoid cartoon or illustrated aesthetics.`;

    const sharedRequirements =
      style === "symbolic"
        ? `
          - Format like a real AAC symbol card — a single clear symbol centered on a plain white or light background.
          - Do NOT include any text, letters, words, labels, or captions anywhere in the image.
          - Focus on one single concept or scene.
          - Immediately recognizable at small size.`
        : `
          - Do NOT add any text, labels, captions, letters, words, or speech bubbles.
          - Do NOT format as an AAC card, flashcard, symbol board, worksheet, or poster.
          - Show only a clean, natural, easy-to-understand visual scene.
          - Keep the composition simple, uncluttered, and child-friendly.
          - Use a plain white or very light background.
          - Focus on the key meaning — not decorative details.`;

    const appearanceRule = appearance
      ? `IMPORTANT — appearance consistency: The character representing the user MUST reflect ALL of the following attributes throughout: ${appearance}. If a head covering (e.g. hijab) is mentioned, ALL clothing must be consistent with modest dress — covered arms, no exposed hair. Maintain coherent, respectful cultural representation.`
      : "";

    const autismRule =
      condition === "autism"
        ? `IMPORTANT — facial expressions: Do NOT depict sad, distressed, crying, or negative facial expressions on any character. All characters must have neutral or positive (calm, content, or happy) expressions only.`
        : "";

    const peopleRule = peopleDesc
      ? `Important people in the user's life (match their appearance when depicted): ${peopleDesc}.`
      : "";

    const fullPrompt = `
The following words are AAC symbol tiles selected by a user to communicate a message: "${prompt}".
Interpret them together as a single, coherent communication intent — do NOT treat them as a list or label them word by word.
For example: "sad don't understand" means the user is sad because they don't understand something; "I want water" means the user wants a drink of water.
Generate a visual image that naturally represents this combined meaning.
${contextClues ? `Context about the user and setting: ${contextClues}.` : ""}
${appearanceRule}
${autismRule}
${peopleRule}

Requirements:
${sharedRequirements}
${styleInstructions}
`.trim();

    // Generate `count` images in parallel
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        client.images.generate({
          model: "gpt-image-1",
          prompt: fullPrompt,
          size: "1024x1024",
        })
      )
    );

    const urls = results
      .map(r => {
        const b64 = r.data?.[0]?.b64_json;
        return b64 ? `data:image/png;base64,${b64}` : null;
      })
      .filter((u): u is string => u !== null);

    // Return both `urls` (new) and `url` (legacy compat)
    return Response.json({ urls, url: urls[0] ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("generate-image error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
