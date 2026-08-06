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
      culturalGrounding,
      noCharacter,
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
      culturalGrounding?: boolean;
      noCharacter?: boolean;
    };

    const count = Math.min(Math.max(1, rawCount ?? 1), 4);

    const contextParts = [
      location  && `Setting: ${location}`,
      !noCharacter && gender    && `User gender: ${gender}`,
      !noCharacter && condition && `User condition: ${condition}`,
      !noCharacter && age       && `User age: ${age}`,
      !noCharacter && appearance && `User appearance: ${appearance}`,
    ].filter(Boolean) as string[];

    const peopleDesc = noCharacter
      ? ""
      : (importantPeople ?? [])
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

    const appearanceRule = !noCharacter && appearance
      ? `IMPORTANT — appearance consistency: The character representing the user MUST reflect ALL of the following attributes throughout: ${appearance}. If a head covering (e.g. hijab) is mentioned, ALL clothing must be consistent with modest dress — covered arms, no exposed hair. Maintain coherent, respectful cultural representation.`
      : "";

    const autismRule =
      !noCharacter && condition === "autism"
        ? `IMPORTANT — facial expressions: Do NOT depict sad, distressed, crying, or negative facial expressions on any character. All characters must have neutral or positive (calm, content, or happy) expressions only.`
        : "";

    const peopleRule = peopleDesc
      ? `Important people in the user's life (match their appearance when depicted): ${peopleDesc}.`
      : "";

    const noCharacterRule = noCharacter
      ? `IMPORTANT — no people: Do NOT include any person, human character, human figure, hands, or body parts anywhere in the image. Depict only the object, food, or scene itself, with no humans present.`
      : "";

    const culturalRule = culturalGrounding
      ? `Cultural context: ONLY if the scene is specifically about food, drink, or clothing, ground that specific food/drink/clothing in Gulf/Middle Eastern regional culture — e.g. regional dishes (dates, hummus, kabsa, shawarma, luqaimat, karak tea) or traditional clothing (thobe, kandura, abaya, ghutra). Do NOT add food, drink, cultural clothing, or other Gulf/Arab decorative elements to scenes that are not themselves about food, drink, or clothing — e.g. a scene about a person, place, or activity unrelated to eating/drinking/dress must NOT include food or regional dress props just for flavor.`
      : `Cultural context: Use culturally neutral, universally recognizable imagery. Do NOT include Gulf, Arab, or Middle Eastern-specific cultural elements such as regional dishes (kabsa, shawarma, luqaimat, karak tea), traditional Gulf clothing (thobe, kandura, abaya, ghutra), or Gulf/Arab-specific settings. Objects and scenes should look generic and globally familiar.`;

    const fullPrompt = `
The following words are AAC symbol tiles selected by a user to communicate a message: "${prompt}".
Interpret them together as a single, coherent communication intent — do NOT treat them as a list or label them word by word.
For example: "sad don't understand" means the user is sad because they don't understand something; "I want water" means the user wants a drink of water.
Generate a visual image that naturally represents this combined meaning.
${contextClues ? `Context about the user and setting: ${contextClues}.` : ""}
${noCharacterRule}
${appearanceRule}
${autismRule}
${peopleRule}
${culturalRule}

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
