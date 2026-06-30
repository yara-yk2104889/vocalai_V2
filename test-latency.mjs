/**
 * TTS latency tester — measures time-to-audio for each provider.
 * Run from inside vocalai_v2/:
 *   node --env-file=../.env.local test-latency.mjs
 *
 * Measures: time from sending request → full audio received (ms).
 * Note: Hamsa uses a Jobs API (async), so latency = job submit only (no audio download).
 */

import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLES = {
  en: "Hello! How are you today? Let's play!",
  ar: "مرحبا! كيف حالك اليوم؟ هيا نلعب!",
};

const results = [];

function record(service, lang, ms, note = "") {
  results.push({ service, lang, ms, note });
  const noteStr = note ? `  (${note})` : "";
  console.log(`  ${service.padEnd(12)} ${lang.toUpperCase()}  →  ${ms} ms${noteStr}`);
}

async function time(fn) {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

async function latencyOpenAI() {
  console.log("\n── OpenAI (gpt-4o-mini-tts, voice: alloy) ───────────────────");
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (const [lang, text] of Object.entries(SAMPLES)) {
    const ms = await time(async () => {
      const res = await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: text,
      });
      await res.arrayBuffer();
    });
    record("OpenAI", lang, ms);
  }
}

// ── ElevenLabs ───────────────────────────────────────────────────────────────

async function latencyElevenLabs() {
  console.log("\n── ElevenLabs (eleven_multilingual_v2) ──────────────────────");
  const apiKey = process.env.ELEVEN_API_KEY;

  // Lauren for EN, Salma for AR
  const voices = {
    en: { name: "Lauren", id: "DODLEQrClDo8wCz460ld" },
    ar: { name: "Salma",  id: "a1KZUXKFVFDOb33I1uqr" },
  };

  for (const [lang, text] of Object.entries(SAMPLES)) {
    const v = voices[lang];
    const ms = await time(async () => {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            language_code: lang,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }
      await res.arrayBuffer();
    }).catch(e => { console.log(`  ✗  ElevenLabs ${lang}: ${e.message}`); return null; });
    if (ms !== null) record("ElevenLabs", lang, ms);
  }
}

// ── Hamsa ────────────────────────────────────────────────────────────────────

async function latencyHamsa() {
  console.log("\n── Hamsa (Jobs API — measures job submit time only) ─────────");
  const apiKey = process.env.HAMSA_API;
  const headers = { "Authorization": `Token ${apiKey}`, "Content-Type": "application/json" };

  // Get project ID
  const projectRes = await fetch("https://api.tryhamsa.com/v1/projects/by-api-key", { headers });
  if (!projectRes.ok) throw new Error(`Project fetch failed: ${projectRes.status}`);
  const { data: { id: projectId } } = await projectRes.json();

  // Get voices to find IDs
  const voicesRes = await fetch(`https://api.tryhamsa.com/v2/tts/voices?source=jobs&page=1&perPage=20&projectId=${projectId}`, { headers });
  if (!voicesRes.ok) throw new Error(`Voices fetch failed: ${voicesRes.status}`);
  const { data: { voices } } = await voicesRes.json();

  const picks = {
    ar: voices.find(v => v.name?.toLowerCase() === "haroun"),
    en: voices.find(v => v.name?.toLowerCase() === "alex"),
  };

  for (const [lang, text] of Object.entries(SAMPLES)) {
    const voice = picks[lang];
    if (!voice) { console.log(`  ⚠  No voice found for ${lang}`); continue; }

    const ms = await time(async () => {
      const res = await fetch("https://api.tryhamsa.com/v1/jobs/text-to-speech", {
        method: "POST",
        headers,
        body: JSON.stringify({ voiceId: voice.id, text }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }
      await res.json();
    }).catch(e => { console.log(`  ✗  Hamsa ${lang}: ${e.message}`); return null; });

    if (ms !== null) record("Hamsa", lang, ms, "job submit only, no audio download");
  }
}

// ── Soniox ───────────────────────────────────────────────────────────────────

async function latencySoniox() {
  console.log("\n── Soniox (tts-rt-v1, voice: Adrian) ───────────────────────");
  const apiKey = process.env.SONIOX_API_KEY;

  for (const [lang, text] of Object.entries(SAMPLES)) {
    const ms = await time(async () => {
      const res = await fetch("https://tts-rt.soniox.com/tts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "tts-rt-v1", language: lang, voice: "Adrian", audio_format: "mp3", text }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }
      await res.arrayBuffer();
    }).catch(e => { console.log(`  ✗  Soniox ${lang}: ${e.message}`); return null; });
    if (ms !== null) record("Soniox", lang, ms);
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────

async function latencyGemini() {
  console.log("\n── Gemini (gemini-2.5-flash-preview-tts, voice: Puck) ───────");
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (const [lang, text] of Object.entries(SAMPLES)) {
    const ms = await time(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: `Read aloud exactly as written: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
        },
      });
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("No audio data returned");
    }).catch(e => { console.log(`  ✗  Gemini ${lang}: ${e.message}`); return null; });
    if (ms !== null) record("Gemini", lang, ms);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("TTS Latency Test");
console.log(`EN: "${SAMPLES.en}"`);
console.log(`AR: "${SAMPLES.ar}"`);

await latencyOpenAI().catch(e => console.error("OpenAI error:", e.message));
await latencyElevenLabs().catch(e => console.error("ElevenLabs error:", e.message));
await latencyHamsa().catch(e => console.error("Hamsa error:", e.message));
await latencySoniox().catch(e => console.error("Soniox error:", e.message));
await latencyGemini().catch(e => console.error("Gemini error:", e.message));

// ── Summary table ─────────────────────────────────────────────────────────────

console.log("\n════════════════════════════════════════════════");
console.log("  RESULTS SUMMARY");
console.log("════════════════════════════════════════════════");
console.log(`  ${"Service".padEnd(12)} ${"Lang".padEnd(6)} ${"ms".padStart(6)}  Note`);
console.log("  " + "─".repeat(50));
for (const r of results) {
  const note = r.note ? `  ${r.note}` : "";
  console.log(`  ${r.service.padEnd(12)} ${r.lang.toUpperCase().padEnd(6)} ${String(r.ms).padStart(6)} ms${note}`);
}
console.log("════════════════════════════════════════════════\n");
