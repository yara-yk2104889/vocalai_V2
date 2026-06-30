import OpenAI from "openai";

export async function POST(req: Request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { image } = await req.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 160,
      messages: [
        {
          role: "system",
          content: `You extract NON-IDENTIFYING visual appearance attributes from a photo to personalize AAC (Augmentative and Alternative Communication) avatar-style images.

Focus on:
- Approximate age group (child/teen/young adult/adult/elderly)
- Apparent gender presentation
- Hair color and style, or head covering if present
- Skin tone (light/medium/olive/dark)
- Glasses (yes/no)
- Visible assistive devices (wheelchair, walker, hearing aids, etc.)
- Clothing style and cultural markers — if the person wears a hijab, niqab, traditional dress, or other culturally significant attire, describe it explicitly (e.g. "wearing a hijab and modest long-sleeved clothing", "wearing a thobe", "wearing traditional embroidered dress"). These cues are critical for respectful, consistent representation.

Do NOT identify the person. Do NOT describe facial features. Do NOT label ethnicity.
Return ONE concise sentence under 35 words capturing all relevant attributes including cultural/clothing cues.
Example: "Young woman with olive skin tone wearing a hijab and modest long-sleeved clothing, seated in a wheelchair."`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: "Describe appearance attributes for AAC image personalization, including any cultural clothing or head coverings. One sentence only." },
          ],
        },
      ],
    });

    const appearance = response.choices[0].message.content?.trim() ?? null;
    return Response.json({ appearance });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("analyze-appearance error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
