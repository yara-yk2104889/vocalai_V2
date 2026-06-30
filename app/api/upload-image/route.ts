import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { imageUrl } = await req.json();

    // imageUrl is a base64 data URL — parse it directly instead of fetching
    const [, base64Data] = imageUrl.split(",");
    if (!base64Data) throw new Error("Invalid image URL format");
    const buffer = Buffer.from(base64Data, "base64");

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
