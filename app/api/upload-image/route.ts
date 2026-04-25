import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("Failed to fetch image");
    const buffer = Buffer.from(await res.arrayBuffer());

    const fileName = `${Date.now()}.png`;

    const { error } = await supabase.storage
      .from("response-images")
      .upload(fileName, buffer, { contentType: "image/png" });

    if (error) throw error;

    const { data } = supabase.storage
      .from("response-images")
      .getPublicUrl(fileName);

    return Response.json({ url: data.publicUrl });
  } catch (err) {
    console.error("upload-image error:", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
