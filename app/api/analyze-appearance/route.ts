import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You extract NON-IDENTIFYING visual appearance attributes from a photo to personalize AAC (Augmentative and Alternative Communication) avatar-style images.
Focus ONLY on: approximate age group (child/teen/young adult/adult/elderly), apparent gender presentation, hair color and style, skin tone (light/medium/olive/dark), glasses (yes/no), and any clearly visible assistive devices (wheelchair, walker, hearing aids, etc.).
Do NOT identify the person. Do NOT describe facial features in detail. Do NOT label ethnicity.
Return ONE concise sentence under 25 words suitable as an image prompt fragment.
Example: "Young child with short dark curly hair, medium skin tone, wearing glasses, seated in a wheelchair."`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: "Describe appearance attributes for AAC image personalization. One sentence only." },
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
