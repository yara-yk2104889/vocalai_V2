import { GoogleGenAI } from "@google/genai";

function pcmToWav(pcmBuffer: Buffer): Buffer {
  const sampleRate   = 24000;
  const bitsPerSample = 16;
  const channels     = 1;
  const byteRate     = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign   = (channels * bitsPerSample) / 8;
  const header       = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export async function POST(req: Request) {
  try {
    const { text, gender, language } = await req.json();

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const voice = gender === "male" ? "Fenrir" : "Aoede";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text: `Read aloud exactly as written: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    });

    const audioData =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      return Response.json({ error: "No audio returned from Gemini" }, { status: 500 });
    }

    const wav = pcmToWav(Buffer.from(audioData, "base64"));

    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.byteLength),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Speak route error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
