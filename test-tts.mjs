/**
 * TTS voice sampler — tests ElevenLabs, Hamsa, and Gemini.
 * Run from inside vocalai_v2/:
 *   node --env-file=../.env.local test-tts.mjs
 *
 * Output: tts-samples/ folder with one audio file per voice.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "tts-samples-LONG"); // or tts-samples
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const SAMPLES = {
  en: "Hi! How are you today? I hope you're doing well. I was thinking about something a little while ago... Have you tried the new coffee shop that opened near the metro station? They say it's really great. What do you think about going to try it together tomorrow after work?",
  ar: "أهلاً! كيف حالك اليوم؟ أتمنى أن تكون بخير. كنت أفكر في شيء منذ قليل... هل جربت القهوة الجديدة التي افتتحوها بالقرب من محطة المترو؟ يقولون إن طعمها رائع جداً، ما رأيك أن نذهب لتجربتها معاً غداً بعد العمل؟!",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function save(filename, buffer) {
  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log(`  ✓  ${filename}`);
}

/** Wraps raw PCM bytes in a WAV header (Gemini returns raw 24 kHz 16-bit mono PCM). */
function pcmToWav(pcmBuffer) {
  const header = Buffer.alloc(44);
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const channels = 1;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);            // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);
  return Buffer.concat([header, pcmBuffer]);
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

async function testOpenAI() {
  console.log("\n── OpenAI (gpt-4o-mini-tts) ─────────────────────────────────");
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // All 13 voices available on gpt-4o-mini-tts
  const voices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"];

  for (const voice of voices) {
    for (const [lang, text] of Object.entries(SAMPLES)) {
      const response = await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
      });
      save(`openai-${voice}-${lang}.mp3`, Buffer.from(await response.arrayBuffer()));
    }
  }
}

// ── ElevenLabs ───────────────────────────────────────────────────────────────

async function testElevenLabs() {
  console.log("\n── ElevenLabs (eleven_multilingual_v2) ─────────────────────");
  const apiKey = process.env.ELEVEN_API_KEY;

  const sample = [
    // Arabic voices
    { name: "Salma",  voice_id: "a1KZUXKFVFDOb33I1uqr", lang: "ar" },
    { name: "Amria",  voice_id: "cdxrkuYK4nZwDSkjw5sa", lang: "ar" },
    { name: "Karim",  voice_id: "oUCSlKjkoFDoKamPHpAV", lang: "ar" },
    // English voices
    { name: "Lauren", voice_id: "DODLEQrClDo8wCz460ld", lang: "en" },
    { name: "Russel", voice_id: "ZauUyVXAz5znrgRuElJ5", lang: "en" },
  ];

  for (const v of sample) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${v.voice_id}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: SAMPLES[v.lang],
          model_id: "eleven_multilingual_v2",
          language_code: v.lang,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (!res.ok) {
      const errBody = await res.text();
      console.log(`  ✗  ${v.name} — ${res.status}: ${errBody}`);
      continue;
    }
    const safeName = v.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    save(`elevenlabs-${safeName}-${v.lang}.mp3`, Buffer.from(await res.arrayBuffer()));
  }
}

// ── Hamsa ────────────────────────────────────────────────────────────────────

async function testHamsa() {
  console.log("\n── Hamsa TTS (Jobs API) ─────────────────────────────────────");
  const apiKey = process.env.HAMSA_API;
  const headers = { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" };

  // 1. Get project ID from API key
  const projectRes = await fetch("https://api.tryhamsa.com/v1/projects/by-api-key", { headers });
  if (!projectRes.ok) {
    const body = await projectRes.text();
    throw new Error(`Project fetch failed: ${projectRes.status} — ${body}`);
  }
  const { data: projectData } = await projectRes.json();
  const projectId = projectData.id;

  // 2. Fetch available voices
  const voicesRes = await fetch(`https://api.tryhamsa.com/v2/tts/voices?source=jobs&page=1&perPage=20&projectId=${projectId}`, { headers });
  if (!voicesRes.ok) {
    const body = await voicesRes.text();
    throw new Error(`Voices list failed: ${voicesRes.status} — ${body}`);
  }
  const { data: { voices } } = await voicesRes.json();

  //  (from Hamsa docs — names may not exist in  account)
  // const WANTED = [
  //   { name: "Deema",  dialect: "qat", lang: "ar" }, // Qatari female
  //   { name: "Faisal", dialect: "qat", lang: "ar" }, // Qatari male
  //   { name: "Salem",  dialect: "msa", lang: "ar" }, // MSA male
  //   { name: "Aseel",  dialect: "msa", lang: "ar" }, // MSA female
  //   { name: "Marwan", dialect: "leb", lang: "ar" }, // Lebanese male
  //   { name: "Sawsan", dialect: "leb", lang: "ar" }, // Lebanese female
  //   { name: "Emma",   dialect: "en",  lang: "en" }, // English female
  //   { name: "James",  dialect: "en",  lang: "en" }, // English male
  // ];

  // Active list — matched to voices actually in this account
  const WANTED = [
    { name: "Abdulmajeed", lang: "ar" },
    { name: "Haroun",      lang: "ar" },
    { name: "Raghda",      lang: "ar" },
    { name: "Lara",        lang: "ar" },
    { name: "Maram",       lang: "ar" },
    { name: "Naeem",       lang: "ar" },
    { name: "James",       lang: "en" },
    { name: "Ryan",        lang: "en" },
    { name: "Emily",       lang: "en" },
    { name: "Alex",        lang: "en" },
  ];

  const picks = WANTED.map(w => {
    const match = voices.find(v => v.name?.trim().toLowerCase() === w.name.toLowerCase());
    if (!match) console.log(`  ⚠  Voice "${w.name}" not found in account`);
    return match ? { ...match, lang: w.lang } : null;
  }).filter(Boolean);

  console.log(`  Matched ${picks.length}/${WANTED.length} voices`);

  // 3. Submit all jobs in parallel
  const jobs = await Promise.all(picks.map(async v => {
    const res = await fetch("https://api.tryhamsa.com/v1/jobs/text-to-speech", {
      method: "POST",
      headers,
      body: JSON.stringify({ voiceId: v.id, text: SAMPLES[v.lang] }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.log(`  ✗  ${v.name} — submit failed ${res.status}: ${body}`);
      return null;
    }
    const body = await res.json();
    const data = body.data ?? body;
    const immediateUrl = data.jobResponse?.ttsMediaFile ?? data.mediaUrl ?? data.url ?? null;
    console.log(`  ⏳  ${v.name} — job ${data.id} (status: ${data.status})`);
    return { jobId: data.id, voice: v, immediateUrl };
  }));

  // 4. Poll each job until COMPLETED or FAILED (max 60s)
  for (const job of jobs.filter(Boolean)) {
    let audioUrl = job.immediateUrl ?? null;

    if (!audioUrl) {
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await fetch(`https://api.tryhamsa.com/v1/jobs/${job.jobId}?projectId=${projectId}`, { headers });
        if (!pollRes.ok) {
          const errBody = await pollRes.text();
          console.log(`  poll ${attempt + 1} [${job.voice.name}]: ${pollRes.status} — ${errBody}`);
          break;
        }
        const body = await pollRes.json();
        const data = body.data ?? body;
        if (data.status === "COMPLETED") {
          audioUrl = data.jobResponse?.ttsMediaFile ?? data.mediaUrl ?? data.url ?? null;
          break;
        }
        if (data.status === "FAILED") {
          console.log(`  ✗  ${job.voice.name} — job failed`);
          break;
        }
      }
    }

    if (!audioUrl) {
      console.log(`  ✗  ${job.voice.name} — timed out or no audio URL`);
      continue;
    }

    const audioRes = await fetch(audioUrl);
    const safeName = job.voice.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    save(`hamsa-${safeName}-${job.voice.lang}.wav`, Buffer.from(await audioRes.arrayBuffer()));
  }
}

// ── Soniox ───────────────────────────────────────────────────────────────────

async function testSoniox() {
  console.log("\n── Soniox (tts-rt-v1) ───────────────────────────────────────");
  const apiKey = process.env.SONIOX_API_KEY;
  const sonioxDir = path.join(__dirname, "tts-samples-soniox");
  if (!fs.existsSync(sonioxDir)) fs.mkdirSync(sonioxDir);

  // All 28 voices support all 60+ languages including Arabic
  const voices = [
    // Female
    "Maya", "Nina", "Emma", "Claire", "Grace",
    "Mina", "Lucia", "Sofia", "Isla", "Victoria",
    "Ruby", "Elise", "Priya", "Meera",
    // Male
    "Daniel", "Noah", "Jack", "Adrian", "Owen",
    "Kenji", "Rafael", "Mateo", "Oliver", "Arthur",
    "Cooper", "Mason", "Arjun", "Rohan",
  ];

  for (const voice of voices) {
    for (const [lang, text] of Object.entries(SAMPLES)) {
      const res = await fetch("https://tts-rt.soniox.com/tts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-rt-v1",
          language: lang,
          voice,
          audio_format: "mp3",
          text,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.log(`  ✗  ${voice} (${lang}) — ${res.status}: ${errBody}`);
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(sonioxDir, `soniox-${voice.toLowerCase()}-${lang}.mp3`), buf);
      console.log(`  ✓  soniox-${voice.toLowerCase()}-${lang}.mp3`);
    }
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────

async function testGemini() {
  console.log("\n── Gemini (gemini-2.5-flash-preview-tts) ───────────────────");
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];

  // Free tier: 3 requests/min — wait 22s between each to stay under the limit
  let requestCount = 0;
  for (const voice of voices) {
    for (const [lang, text] of Object.entries(SAMPLES)) {
      if (requestCount > 0 && requestCount % 3 === 0) {
        console.log(`  ⏳ Rate limit pause (22s)…`);
        await new Promise(r => setTimeout(r, 22000));
      }
      requestCount++;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: `Read aloud exactly as written: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const audioData =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        console.log(`  ✗  ${voice} (${lang}) — no audio data returned`);
        continue;
      }

      const pcm = Buffer.from(audioData, "base64");
      save(`gemini-${voice.toLowerCase()}-${lang}.wav`, pcmToWav(pcm));
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`Saving samples to: ${OUT_DIR}`);
console.log(`EN: "${SAMPLES.en}"`);
console.log(`AR: "${SAMPLES.ar}"`);

// await testOpenAI().catch(e => console.error("OpenAI error:", e.message));
// await testElevenLabs().catch(e => console.error("ElevenLabs error:", e.message));
// await testHamsa().catch(e => console.error("Hamsa error:", e.message));
// await testSoniox().catch(e => console.error("Soniox error:", e.message));
await testGemini().catch(e => console.error("Gemini error:", e.message));

console.log("\nDone — open the tts-samples/ folder and listen.");
