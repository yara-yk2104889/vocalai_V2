import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Streams raw PCM (16-bit little-endian, 24 kHz, mono) to the browser as Gemini
// generates it, so playback starts after ~0.5 s instead of waiting ~3 s for the
// whole clip. Flash-Lite TTS was the fastest Gemini TTS model in test-latency.mjs.
const TTS_MODEL = "gemini-3.8-flash-lite-tts";

type AudioStream = AsyncIterator<{ candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] }>;

// Next chunk of audio bytes from the Gemini stream, or null when it has ended.
async function nextAudio(stream: AudioStream): Promise<Uint8Array | null> {
  for (;;) {
    const { value, done } = await stream.next();
    if (done) return null;
    const parts = value.candidates?.[0]?.content?.parts ?? [];
    const audio = parts.flatMap(p => (p.inlineData?.data ? [Buffer.from(p.inlineData.data, "base64")] : []));
    if (audio.length) return new Uint8Array(Buffer.concat(audio));
  }
}

export async function POST(req: Request) {
  try {
    const { text, gender } = await req.json();

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const voice = gender === "male" ? "Fenrir" : "Aoede";

    // No "Read aloud…" instruction: TTS models speak the text as given, and the
    // 3.8 models read such an instruction out loud as part of the sentence.
    const response = await ai.models.generateContentStream({
      model: TTS_MODEL,
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    });
    const stream: AudioStream = response[Symbol.asyncIterator]();

    // Wait for the first chunk before replying, so a failure still returns a
    // JSON error and the client can fall back to the browser voice.
    const first = await nextAudio(stream);
    if (!first) {
      return Response.json({ error: "No audio returned from Gemini" }, { status: 500 });
    }

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first);
      },
      async pull(controller) {
        try {
          const chunk = await nextAudio(stream);
          if (chunk) controller.enqueue(chunk);
          else controller.close();
        } catch (error) {
          console.error("Speak route stream error:", error);
          controller.error(error);
        }
      },
      async cancel() {
        await stream.return?.();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "audio/L16; rate=24000; channels=1",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Speak route error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
