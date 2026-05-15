// OpenAI TTS route — disabled. Re-enable by removing these block comments
// and wiring up the frontend (see commented-out speakSelectedSentence in page.tsx).

/*
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Maps profile to the most fitting OpenAI TTS voice + optional instructions
function resolveVoice(
  gender: string,
  age: string,
  language: string,
): { voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | "coral" | "sage" | "ash"; instructions: string } {
  const ageNum = parseInt(age, 10);
  const isChild = !isNaN(ageNum) && ageNum < 13;
  const isTeen = !isNaN(ageNum) && ageNum >= 13 && ageNum < 18;
  const isFemale = gender === "female";
  const isMale = gender === "male";
  const isArabic = language === "ar";

  if (isChild && isFemale) {
    return {
      voice: "nova",
      instructions: isArabic
        ? "تحدثي بصوت طفولي ناعم ومشرق ومبهج. وتير بطيئة وواضحة."
        : "Speak in a soft, bright, cheerful child-like voice. Slow and clear pace.",
    };
  }
  if (isChild && isMale) {
    return {
      voice: "fable",
      instructions: isArabic
        ? "تحدث بصوت طفولي حيوي ومرح. وتيرة بطيئة وواضحة."
        : "Speak in an energetic, playful child-like voice. Slow and clear pace.",
    };
  }
  if (isChild) {
    return {
      voice: "nova",
      instructions: isArabic
        ? "تحدث بصوت طفولي لطيف وواضح."
        : "Speak in a gentle, clear child-like voice.",
    };
  }
  if (isTeen && isFemale) {
    return {
      voice: "nova",
      instructions: isArabic
        ? "صوت شبابي هادئ وطبيعي."
        : "Calm, natural youthful female voice.",
    };
  }
  if (isTeen && isMale) {
    return {
      voice: "echo",
      instructions: isArabic
        ? "صوت شبابي هادئ وطبيعي."
        : "Calm, natural youthful male voice.",
    };
  }
  if (isFemale) {
    return {
      voice: "nova",
      instructions: isArabic
        ? "صوت نسائي هادئ وطبيعي ودافئ."
        : "Calm, warm, natural adult female delivery.",
    };
  }
  if (isMale) {
    return {
      voice: "onyx",
      instructions: isArabic
        ? "صوت رجالي هادئ وعميق وطبيعي."
        : "Calm, deep, natural adult male delivery.",
    };
  }
  // Neutral default
  return {
    voice: "alloy",
    instructions: isArabic
      ? "صوت هادئ وواضح وطبيعي."
      : "Calm, clear, natural voice.",
  };
}

export async function POST(req: Request) {
  try {
    const { text, gender, age, language } = await req.json();

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const { voice, instructions } = resolveVoice(gender ?? "", age ?? "", language ?? "en");

    const mp3 = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      instructions,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Speak route error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
*/
