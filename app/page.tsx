"use client";
import { type CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  Delete as BackspaceIcon,
  Eye,
  EyeOff,
  Pencil,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  Home,
  Lock,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tileImageFor } from "@/lib/tile-images";

// ─── IndexedDB image cache ────────────────────────────────────────────────────
// localStorage can't hold base64 images (5 MB limit).
// We store them in IDB keyed as "genId:imgIdx" so they survive page reloads.

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("vocalai_images", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("images");
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}
async function idbPut(key: string, value: string): Promise<void> {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction("images", "readwrite");
    tx.objectStore("images").put(value, key);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}
async function idbGet(key: string): Promise<string | null> {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction("images", "readonly").objectStore("images").get(key);
    req.onsuccess = () => res((req.result as string) ?? null);
    req.onerror   = () => rej(req.error);
  });
}

// ─── TTS: streaming playback + cache ──────────────────────────────────────────
// /api/speak streams raw PCM (16-bit little-endian, 24 kHz, mono) from Gemini.
// Each sentence is a TtsJob that fills in as chunks arrive; playback starts on
// the first chunk (~0.5 s) instead of waiting for the whole clip.
// Jobs start while the sentence is still being built (see the prefetch effect in
// AACApp) and are kept in memory, so Speak usually plays at once. Sentences that
// are actually spoken are also saved to IDB, so repeated phrases are instant
// after reloads.

const TTS_SAMPLE_RATE = 24000;
const TTS_MEMORY_MAX  = 40;  // recent sentences kept for this session
const TTS_DB_MAX      = 300; // spoken phrases kept across reloads (~50–200 KB each)

interface TtsJob {
  chunks: Uint8Array[];                        // PCM received so far
  listeners: Set<(chunk: Uint8Array) => void>; // called for each new chunk
  started: Promise<void>;                      // first chunk arrived (rejects if none ever does)
  done: Promise<Blob>;                         // the whole clip, once the stream ends
}

const ttsMemory = new Map<string, TtsJob>();

function ttsKey(text: string, gender: string, language: string) {
  // Must match the voice choice in /api/speak: "male" → Fenrir, anything else → Aoede.
  return `${gender === "male" ? "male" : "female"}|${language}|${text}`;
}

function ttsDbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    // v2 stores raw PCM; v1 stored WAV, so its entries are dropped on upgrade.
    const req = indexedDB.open("vocalai_tts", 2);
    req.onupgradeneeded = () => {
      if (req.result.objectStoreNames.contains("audio")) req.result.deleteObjectStore("audio");
      req.result.createObjectStore("audio");
    };
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}
async function ttsDbGet(key: string): Promise<Blob | null> {
  const db = await ttsDbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction("audio", "readonly").objectStore("audio").get(key);
    req.onsuccess = () => res((req.result as { blob: Blob } | undefined)?.blob ?? null);
    req.onerror   = () => rej(req.error);
  });
}
async function ttsDbPut(key: string, blob: Blob): Promise<void> {
  const db = await ttsDbOpen();
  return new Promise((res, rej) => {
    const tx    = db.transaction("audio", "readwrite");
    const store = tx.objectStore("audio");
    store.put({ blob, savedAt: Date.now() }, key);
    // Once over the cap, drop the phrases spoken least recently.
    const entries: { key: IDBValidKey; savedAt: number }[] = [];
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        entries.push({ key: cursor.key, savedAt: cursor.value.savedAt });
        cursor.continue();
        return;
      }
      if (entries.length <= TTS_DB_MAX) return;
      entries
        .sort((a, b) => a.savedAt - b.savedAt)
        .slice(0, entries.length - TTS_DB_MAX)
        .forEach(e => store.delete(e.key));
    };
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// Returns the job for a sentence: from memory, else a new one that reads IDB or
// streams from Gemini. Concurrent calls for the same sentence share one job.
function loadTtsAudio(text: string, gender: string, language: string): TtsJob {
  const key = ttsKey(text, gender, language);
  const hit = ttsMemory.get(key);
  if (hit) {
    ttsMemory.delete(key); // re-insert so it counts as recently used
    ttsMemory.set(key, hit);
    return hit;
  }

  const chunks: Uint8Array[] = [];
  const listeners = new Set<(chunk: Uint8Array) => void>();
  let markStarted!: () => void;
  const firstChunk = new Promise<void>(res => { markStarted = res; });
  const push = (chunk: Uint8Array) => {
    chunks.push(chunk);
    listeners.forEach(l => l(chunk));
    markStarted();
  };

  const done = (async () => {
    const saved = await ttsDbGet(key).catch(() => null);
    if (saved) {
      push(new Uint8Array(await saved.arrayBuffer()));
      return saved;
    }
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, gender, language }),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value.length) push(value);
    }
    return new Blob(chunks as BlobPart[], { type: "audio/L16" });
  })();

  const job: TtsJob = {
    chunks,
    listeners,
    started: Promise.race([firstChunk, done.then(() => { throw new Error("No audio received"); })]),
    done,
  };
  // Prefetches never await these; keep failures from surfacing as unhandled rejections.
  job.started.catch(() => {});
  // Forget failures so the next attempt retries instead of replaying the error.
  done.catch(() => { if (ttsMemory.get(key) === job) ttsMemory.delete(key); });

  ttsMemory.set(key, job);
  if (ttsMemory.size > TTS_MEMORY_MAX) ttsMemory.delete(ttsMemory.keys().next().value as string);
  return job;
}

let ttsCtx: AudioContext | null = null;
let ttsStopCurrent: (() => void) | null = null;

// Call while still handling the tap: browsers only let audio start from a user gesture.
function ttsAudioContext(): AudioContext {
  if (!ttsCtx) {
    // On iPhone/iPad, Web Audio is silenced by the mute switch unless the session is "playback".
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
    ttsCtx = new AudioContext();
  }
  if (ttsCtx.state === "suspended") void ttsCtx.resume();
  return ttsCtx;
}

// Plays a job through Web Audio, scheduling each chunk straight after the previous
// one so the stream sounds like one continuous clip. Stops whatever was playing.
function playTtsJob(job: TtsJob, ctx: AudioContext) {
  ttsStopCurrent?.();
  const sources: AudioBufferSourceNode[] = [];
  let nextTime = 0;
  let leftover: Uint8Array | null = null; // odd trailing byte split across network chunks

  const play = (chunk: Uint8Array) => {
    let bytes = chunk;
    if (leftover) {
      bytes = new Uint8Array(leftover.length + chunk.length);
      bytes.set(leftover);
      bytes.set(chunk, leftover.length);
      leftover = null;
    }
    if (bytes.length % 2) {
      leftover = bytes.slice(-1);
      bytes = bytes.subarray(0, bytes.length - 1);
    }
    const samples = bytes.length / 2;
    if (!samples) return;
    const view   = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const buffer = ctx.createBuffer(1, samples, TTS_SAMPLE_RATE);
    const out    = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) out[i] = view.getInt16(i * 2, true) / 32768;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    // A small lead absorbs network jitter; if the stream falls behind, resume after a short gap.
    nextTime = Math.max(nextTime, ctx.currentTime + 0.03);
    source.start(nextTime);
    nextTime += buffer.duration;
    sources.push(source);
  };

  job.chunks.forEach(play);
  job.listeners.add(play);
  job.done.catch(() => {}).finally(() => job.listeners.delete(play));
  ttsStopCurrent = () => {
    job.listeners.delete(play);
    sources.forEach(s => { try { s.stop(); } catch { /* already stopped */ } });
  };
}

let ttsSpeakId = 0; // latest Speak press; an older press that resolves later must not play

// ─── Types ────────────────────────────────────────────────────────────────────

interface AacTile {
  emoji: string;
  en: string;
  ar: string;
  imageUrl?: string;    // single custom photo or generated image
  typed?: boolean;      // word typed on the keyboard (editable with Delete)
  storyImages?: string[]; // multiple scenes — makes this a story tile
}

interface GeneratedImage {
  url: string;
  label?: string;
}

interface ChildProfile {
  name: string;
  age: string;
  gender: string;
  language: "en" | "ar";
  condition: string;
  photoPreview: string;
  appearance: string;
}

interface ImportantPerson {
  id: string;
  name: string;
  photoPreview: string;
  description: string;
}

interface RecentGeneration {
  id: string;
  tiles: AacTile[];
  images: string[];
  caption: string;
  style: string;
  timestamp: string;
  note?: string;
}

interface LibraryItem {
  id: string;
  en: string;
  ar: string;
  images: string[]; // 1 image = single generation, 2+ = story
  timestamp: string;
}

// ─── Tile data ────────────────────────────────────────────────────────────────

const TILES: Record<string, AacTile[]> = {
  core: [
    { emoji: "👋", en: "Hello",    ar: "مرحبا"  },
    { emoji: "🙋", en: "I want",   ar: "أريد"   },
    { emoji: "🆘", en: "Help",     ar: "مساعدة" },
    { emoji: "❓", en: "Question", ar: "سؤال"   },
    { emoji: "➕", en: "More",     ar: "أكثر"   },
    { emoji: "🛑", en: "Stop",     ar: "توقف"   },
    { emoji: "⏳", en: "Wait",     ar: "انتظر"  },
    { emoji: "👍", en: "Yes",      ar: "نعم"    },
    { emoji: "👎", en: "No",       ar: "لا"     },
    { emoji: "😊", en: "Happy",    ar: "سعيد"   },
    { emoji: "😢", en: "Sad",      ar: "حزين"   },
    { emoji: "🤒", en: "Sick",     ar: "مريض"   },
    { emoji: "🏠", en: "Home",     ar: "البيت"  },
    { emoji: "🚽", en: "Toilet",   ar: "الحمام" },
    { emoji: "👋", en: "Bye",      ar: "وداعاً" },
  ],
  feelings: [
    { emoji: "😊", en: "Happy",      ar: "سعيد"  },
    { emoji: "😢", en: "Sad",        ar: "حزين"  },
    { emoji: "😡", en: "Angry",      ar: "غاضب"  },
    { emoji: "😴", en: "Tired",      ar: "متعب"  },
    { emoji: "🤒", en: "Sick",       ar: "مريض"  },
    { emoji: "😰", en: "Scared",     ar: "خائف"  },
    { emoji: "🤕", en: "Hurt",       ar: "ألم"   },
    { emoji: "😍", en: "Love",       ar: "أحب"   },
    { emoji: "😎", en: "Cool",       ar: "رائع"  },
    { emoji: "🥱", en: "Bored",      ar: "ممل"   },
    { emoji: "😤", en: "Frustrated", ar: "محبط"  },
    { emoji: "🥰", en: "Loved",      ar: "محبوب" },
    { emoji: "🚰", en: "Thirsty",    ar: "عطشان" },
    { emoji: "🍽️", en: "Hungry",     ar: "جائع"  },
    { emoji: "🤢", en: "Nauseous",   ar: "غثيان" },
  ],
  activities: [
    { emoji: "🎮", en: "Play",         ar: "العب"          },
    { emoji: "📖", en: "Read",         ar: "اقرأ"          },
    { emoji: "😴", en: "Sleep",        ar: "نوم"           },
    { emoji: "🌳", en: "Go Outside",   ar: "اذهب للخارج"    },
    { emoji: "🌅", en: "Wake Up",      ar: "استيقظ"       },
    { emoji: "🪥", en: "Brush Teeth",  ar: "اغسل الأسنان" },
    { emoji: "🎒", en: "Go School",    ar: "اذهب للمدرسة"  },
    { emoji: "🏃", en: "Run",          ar: "اركض"          },
    { emoji: "🛁", en: "Bath",         ar: "استحمام"       },
    { emoji: "🎨", en: "Draw",         ar: "ارسم"          },
    { emoji: "📺", en: "Watch TV",     ar: "أحضر تلفزيون"  },
    { emoji: "⚽", en: "Ball",         ar: "كرة"           },
    { emoji: "🚗", en: "Go Car",       ar: "اذهب بالسيارة" },
    { emoji: "🛒", en: "Go Shopping",  ar: "اذهب للتسوق"    },
  ],
  people: [
    { emoji: "👨",   en: "Dad",     ar: "أبي"      },
    { emoji: "👩",   en: "Mom",     ar: "أمي"      },
    { emoji: "👦",   en: "Brother", ar: "أخي"      },
    { emoji: "👧",   en: "Sister",  ar: "أختي"     },
    { emoji: "👩‍🏫", en: "Teacher", ar: "المعلمة"  },
    { emoji: "👨‍⚕️", en: "Doctor",  ar: "الطبيب"   },
    { emoji: "👩‍⚕️", en: "Nurse", ar: "الممرضة" },
    { emoji: "👫",   en: "Friend",  ar: "صديق"     },
    { emoji: "👴",   en: "Grandpa", ar: "جدي"      },
    { emoji: "👵",   en: "Grandma", ar: "جدتي"     },
  ],
  questions: [
    { emoji: "❓", en: "What?",     ar: "ماذا؟"      },
    { emoji: "🕐", en: "When?",     ar: "متى؟"       },
    { emoji: "📍", en: "Where?",    ar: "أين؟"       },
    { emoji: "👤", en: "Who?",      ar: "من؟"        },
    { emoji: "🤔", en: "Why?",      ar: "لماذا؟"     },
    { emoji: "🔢", en: "How many?", ar: "كم؟"        },
    { emoji: "✅", en: "Can I?",    ar: "هل يمكنني؟" },
    { emoji: "🙏", en: "Please",    ar: "من فضلك"    },
  ],
  phrases: [
    { emoji: "🪪", en: "__my_name__",          ar: "__my_name__"             },
    { emoji: "🤝", en: "Nice to meet you",     ar: "سعيد بلقائك"            },
    { emoji: "🙂", en: "How are you?",         ar: "كيف حالك؟"              },
    { emoji: "🙏", en: "Thank you",            ar: "شكراً"                  },
    { emoji: "😊", en: "You're welcome",       ar: "عفواً"                  },
    { emoji: "🆘", en: "I need help please",   ar: "أحتاج مساعدة من فضلك"  },
    { emoji: "🔁", en: "Can you repeat that?", ar: "هل يمكنك إعادة ذلك؟"   },
    { emoji: "🤷", en: "I don't understand",   ar: "لا أفهم"                },
  ],
  sensory: [
    { emoji: "🛑", en: "I need a break",       ar: "أحتاج استراحة"          },
    { emoji: "🔇", en: "Too loud",             ar: "صوت عالٍ جداً"          },
    { emoji: "😤", en: "Feeling overwhelmed",  ar: "أشعر بضغط"             },
    { emoji: "💡", en: "Too bright",           ar: "الإضاءة قوية جداً"      },
    { emoji: "🤗", en: "Need a hug",           ar: "أريد عناقاً"           },
    { emoji: "😴", en: "I am tired",           ar: "أنا متعب"              },
    { emoji: "😰", en: "I feel anxious",       ar: "أشعر بقلق"            },
    { emoji: "🧘", en: "Calm down please",     ar: "هدّئوني من فضلكم"      },
    { emoji: "🚪", en: "I want to leave",      ar: "أريد المغادرة"         },
    { emoji: "🥶", en: "Cold",                 ar: "بردان"                 },
    { emoji: "🥵", en: "Hot",                  ar: "حرّان"                 },
  ],
  food_drink: [
    { emoji: "🍎", en: "Apple",      ar: "تفاحة"    },
    { emoji: "🍞", en: "Bread",      ar: "خبز"      },
    { emoji: "🍌", en: "Banana",     ar: "موزة"     },
    { emoji: "🥪", en: "Sandwich",   ar: "ساندويش"  },
    { emoji: "🍕", en: "Pizza",      ar: "بيتزا"    },
    { emoji: "🍚", en: "Rice",       ar: "أرز"      },
    { emoji: "🍳", en: "Egg",        ar: "بيضة"     },
    { emoji: "🍗", en: "Chicken",    ar: "دجاج"     },
    { emoji: "🍪", en: "Cookie",     ar: "بسكويت"   },
    { emoji: "🍇", en: "Grapes",     ar: "عنب"      },
    { emoji: "🍓", en: "Strawberry", ar: "فراولة"   },
    { emoji: "🥗", en: "Salad",      ar: "سلطة"     },
    { emoji: "💧", en: "Water",      ar: "ماء"           },
    { emoji: "🥛", en: "Milk",       ar: "حليب"          },
    { emoji: "🧃", en: "Juice",      ar: "عصير"          },
    { emoji: "☕", en: "Coffee",     ar: "قهوة"          },
    { emoji: "🍵", en: "Tea",        ar: "شاي"           },
    { emoji: "🥤", en: "Soda",       ar: "مشروب غازي"    },
    { emoji: "🍶", en: "Warm drink", ar: "مشروب دافئ"    },
    { emoji: "🧊", en: "Ice",        ar: "ثلج"           },
  ],
  body_parts: [
    { emoji: "🧠", en: "Head",     ar: "الرأس"        },
    { emoji: "👁️", en: "Eye",      ar: "العين"        },
    { emoji: "👂", en: "Ear",      ar: "الأذن"        },
    { emoji: "👃", en: "Nose",     ar: "الأنف"        },
    { emoji: "👄", en: "Mouth",    ar: "الفم"         },
    { emoji: "🦷", en: "Teeth",    ar: "الأسنان"      },
    { emoji: "🗣️", en: "Throat",   ar: "الحلق"        },
    { emoji: "🫀", en: "Chest",    ar: "الصدر"        },
    { emoji: "🟠", en: "Stomach",  ar: "المعدة"       },
    { emoji: "🦴", en: "Back",     ar: "الظهر"        },
    { emoji: "🤷", en: "Shoulder", ar: "الكتف"        },
    { emoji: "💪", en: "Arm",      ar: "الذراع"       },
    { emoji: "✋",  en: "Hand",     ar: "اليد"         },
    { emoji: "👆", en: "Finger",   ar: "الأصبع"       },
    { emoji: "🦵", en: "Leg",      ar: "الساق"        },
    { emoji: "🦶", en: "Foot",     ar: "القدم"        },
  ],
  pains: [
    // Wong-Baker-style pain scale — kept first since this is the first
    // thing clinicians look for on a hospital communication board.
    { emoji: "😀", en: "No pain",           ar: "لا يوجد ألم"      },
    { emoji: "🙂", en: "Hurts a little",    ar: "يؤلم قليلاً"      },
    { emoji: "😕", en: "Hurts a little more", ar: "يؤلم أكثر قليلاً" },
    { emoji: "😣", en: "Hurts more",        ar: "يؤلم بشكل أكبر"   },
    { emoji: "😫", en: "Hurts way more",    ar: "يؤلم كثيراً"      },
    { emoji: "😭", en: "Hurts a lot",       ar: "يؤلم جداً"        },
    { emoji: "🤕", en: "It hurts",           ar: "يؤلمني"          },
    { emoji: "🔥", en: "Burning",            ar: "حرقان"           },
    { emoji: "⚡", en: "Sharp pain",         ar: "ألم حاد"         },
    { emoji: "🐢", en: "Dull ache",          ar: "ألم خفيف مستمر"  },
    { emoji: "🤢", en: "Nausea",             ar: "غثيان"           },
    { emoji: "😵", en: "Dizzy",              ar: "دوخة"            },
    { emoji: "🤒", en: "Fever",              ar: "حرارة"           },
    { emoji: "🩸", en: "Bleeding",           ar: "نزيف"            },
    { emoji: "😮‍💨", en: "Trouble breathing", ar: "صعوبة في التنفس" },
  ],
};

// Extra tiles shown only on the hospital board, appended on top of the shared
// category tiles above (general board is unaffected). Keyed by category id.
const HOSPITAL_EXTRA_TILES: Record<string, AacTile[]> = {

  phrases: [
    { emoji: "🆘", en: "Call the nurse",      ar: "نادِ الممرضة"        },
    { emoji: "📞", en: "Call the doctor",     ar: "اتصل بالطبيب"       },
    { emoji: "🚨", en: "I need help now",     ar: "أحتاج المساعدة الآن" },
    { emoji: "🔄", en: "Turn me",             ar: "قلّبني"             },
    { emoji: "⬆️", en: "Sit me up",           ar: "اجلسني"             },
    { emoji: "😮‍💨", en: "I can't breathe",    ar: "لا أستطيع التنفس"   },
  ],
};

const CATEGORIES_GENERAL = [
  { id: "core",       enLabel: "Core",       arLabel: "أساسي"  },
  { id: "food_drink", enLabel: "Food/Drink", arLabel: "طعام وشراب" },
  { id: "feelings",   enLabel: "Feelings",   arLabel: "مشاعر"  },
  { id: "people",     enLabel: "People",     arLabel: "أشخاص"  },
  { id: "activities", enLabel: "Activities", arLabel: "أنشطة"  },
  { id: "questions",  enLabel: "Questions",  arLabel: "أسئلة"  },
  { id: "phrases",    enLabel: "Phrases",    arLabel: "جمل"    },
  { id: "sensory",    enLabel: "Sensory",    arLabel: "حسي"    },
];

const CATEGORIES_HOSPITAL = [
  { id: "core",        enLabel: "Core",       arLabel: "أساسي"        },
  { id: "food_drink",  enLabel: "Food/Drink", arLabel: "طعام وشراب"   },
  { id: "feelings",    enLabel: "Feelings",   arLabel: "مشاعر"        },
  { id: "people",      enLabel: "People",     arLabel: "أشخاص"        },
  { id: "body_parts",  enLabel: "Body Parts", arLabel: "أجزاء الجسم"  },
  { id: "pains",       enLabel: "Pain",       arLabel: "الألم"        },
  { id: "phrases",     enLabel: "Phrases",    arLabel: "جمل"          },
  { id: "sensory",     enLabel: "Sensory",    arLabel: "حسي"          },
];

const CATEGORY_COLORS: Record<string, string> = {
  core:       "bg-blue-50   hover:bg-blue-100   border-blue-200",
  feelings:   "bg-pink-50   hover:bg-pink-100   border-pink-200",
  activities: "bg-green-50  hover:bg-green-100  border-green-200",
  people:     "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
  questions:  "bg-purple-50 hover:bg-purple-100 border-purple-200",
  phrases:    "bg-rose-50   hover:bg-rose-100   border-rose-200",
  sensory:    "bg-teal-50   hover:bg-teal-100   border-teal-200",
  food_drink: "bg-orange-50 hover:bg-orange-100 border-orange-200",
  body_parts: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
  pains:      "bg-red-50    hover:bg-red-100    border-red-200",
};

const STYLE_OPTIONS: { id: "symbolic" | "cartoon" | "realistic"; en: string; ar: string }[] = [
  { id: "symbolic",  en: "Symbolic",  ar: "رمزي"   },
  { id: "cartoon",   en: "Cartoon",   ar: "كرتوني" },
  { id: "realistic", en: "Realistic", ar: "واقعي"  },
];

const CONNECTORS: { en: string; ar: string }[] = [
  { en: "I",      ar: "أنا"   },
  { en: "the",    ar: "الـ"   },
  { en: "a",      ar: "يوجد"  },
  { en: "my",     ar: "لدي"   },
  { en: "and",    ar: "و"     },
  { en: "then",   ar: "ثم"    },
  { en: "with",   ar: "مع"    },
  { en: "not",    ar: "لا"    },
  { en: "to",     ar: "إلى"   },
  { en: "go",     ar: "أذهب"  },
  { en: "after",  ar: "بعد"   },
  { en: "before", ar: "قبل"   },
  { en: "in",     ar: "في"    },
  { en: "at",     ar: "عند"   },
];

const DEFAULT_PIN = "1234";

const PARENT_TABS = ["profile", "people", "history"] as const;

// Function words that can't be pictured on their own, so a message of only these gets a hint instead of an image.
const FILLER_WORDS = new Set([
  "the", "a", "an", "my", "and", "then", "with", "to", "in", "at", "on", "of", "for",
  "after", "before", "not", "i", "me", "is", "it",
  "و", "ثم", "مع", "إلى", "الى", "في", "عند", "بعد", "قبل", "أنا", "لدي", "الـ", "يوجد", "من", "على",
]);

function hasContentWord(words: string[]): boolean {
  return words.some(w => {
    const n = w.toLowerCase().replace(/[?!.,؟،]/g, "");
    return n !== "" && !FILLER_WORDS.has(n);
  });
}

type GenBlockedReason = "busy" | "empty" | "filler";

// wide = laptop / landscape tablet (original layout), stacked = tablet in portrait, phone = phone in either orientation.
type LayoutMode = "wide" | "stacked" | "phone";

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

function getLayoutMode(): LayoutMode {
  const w = window.innerWidth, h = window.innerHeight;
  if (w < 640 || (h < 500 && w < 1000)) return "phone";
  return h > w ? "stacked" : "wide";
}

function getServerLayoutMode(): LayoutMode {
  return "wide";
}

// Non-color marker for the selected option in pick-one groups (WCAG 1.4.1).
function SelectedTick({ on }: { on: boolean }) {
  return on ? <Check className="h-3 w-3 shrink-0" strokeWidth={3} aria-hidden="true" /> : null;
}

type ComboPhrase = { en: (t: string) => string; ar: (t: string) => string };
const COMBO_PHRASES_BY_CAT: Record<string, ComboPhrase[]> = {
  food_drink: [
    { en: t => `I want ${t}`,       ar: t => `أريد ${t}`      },
    { en: t => `I like ${t}`,       ar: t => `أحب ${t}`       },
    { en: t => `I don't want ${t}`, ar: t => `لا أريد ${t}`   },
    { en: t => `More ${t}`,         ar: t => `المزيد من ${t}` },
    { en: t => `No more ${t}`,      ar: t => `لا مزيد من ${t}` },
  ],
  feelings: [
    { en: t => `I feel ${t}`,       ar: t => `أشعر بـ${t}`    },
    { en: t => `I am not ${t}`,     ar: t => `لست ${t}`        },
  ],
  activities: [
    { en: t => `I want to ${t}`,        ar: t => `أريد أن ${t}`    },
    { en: t => `I don't want to ${t}`,  ar: t => `لا أريد أن ${t}` },
    { en: t => `Can we ${t}?`,          ar: t => `هل يمكننا ${t}؟` },
  ],
  people: [
    { en: t => `I want ${t}`,    ar: t => `أريد ${t}`      },
    { en: t => `I miss ${t}`,    ar: t => `أشتاق لـ${t}`   },
    { en: t => `Where is ${t}?`, ar: t => `أين ${t}؟`      },
  ],
  // sensory: no combo phrases — long-press menu disabled for this category
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function getCroppedImg(
  src: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  const SIZE = 512;
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext("2d")!.drawImage(
    img,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, SIZE, SIZE,
  );
  return canvas.toDataURL("image/jpeg", 0.88);
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// Bump this whenever CATEGORIES_GENERAL/CATEGORIES_HOSPITAL's canonical order changes,
// to force a one-time reset of anyone's already-persisted category order.
const CATEGORY_LAYOUT_VERSION = 2;

// Drops ids no longer in the category set, appends any new ones — keeps a
// persisted category order in sync when the underlying category list changes.
function reconcileOrder(order: string[], validIds: string[]): string[] {
  const kept = order.filter(id => validIds.includes(id));
  const missing = validIds.filter(id => !kept.includes(id));
  return [...kept, ...missing];
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AACApp() {
  // ── Mode & auth
  const [mode, setMode]                = useState<"child" | "parent">("child");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput]        = useState("");
  const [pinError, setPinError]        = useState(false);

  // ── Language
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const isRTL = language === "ar";

  // ── Context strip
  const [locationLabel, setLocationLabel] = useState("");
  const [timeLabel, setTimeLabel]         = useState("");

  // ── Child mode
  const [selectedTiles, setSelectedTiles]     = useState<AacTile[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [imageStyle, setImageStyle]           = useState<"symbolic" | "cartoon" | "realistic">("symbolic");
  const [imageMode, setImageMode]             = useState<"single" | "story">("single");
  const [hideCharacter, setHideCharacter]     = useState(false);
  const [isGenerating, setIsGenerating]       = useState(false);
  const [genFailed, setGenFailed]             = useState(false);
  const [genStatus, setGenStatus]             = useState(""); // screen-reader announcement
  const [genHint, setGenHint]                 = useState<{ reason: "empty" | "filler"; n: number } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [caption, setCaption]                 = useState("");
  const [storyIndex, setStoryIndex]           = useState(0);

  // ── Child profile
  const [profile, setProfile] = useState<ChildProfile>({
    name: "", age: "", gender: "", language: "en", condition: "",
    photoPreview: "", appearance: "",
  });
  const [profilePhotoLoading, setProfilePhotoLoading] = useState(false);

  // ── Important people
  const [importantPeople, setImportantPeople]             = useState<ImportantPerson[]>([]);
  const [newPersonName, setNewPersonName]                 = useState("");
  const [newPersonDesc, setNewPersonDesc]                 = useState("");
  const [newPersonPhoto, setNewPersonPhoto]               = useState("");
  const [newPersonPhotoLoading, setNewPersonPhotoLoading] = useState(false);

  // ── Recent generations
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);

  // ── Library (saved single images + stories, for redisplay only)
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  // ── Custom tiles
  const [customTiles, setCustomTiles] = useState<Record<string, AacTile[]>>({});

  // ── Customise Board modal
  const [showCustomiseModal, setShowCustomiseModal]   = useState(false);
  const [customiseView, setCustomiseView]             = useState<"menu" | "arrange" | "add">("menu");

  // ── Image generation preferences
  const [culturalGrounding, setCulturalGrounding] = useState(false);

  // ── Board type (general vs. hospital) ──────────────────────────────────────
  const [boardType, setBoardType] = useState<"general" | "hospital">("general");
  const CATEGORIES = boardType === "hospital" ? CATEGORIES_HOSPITAL : CATEGORIES_GENERAL;

  // ── Board layout settings — kept separately per board type since each has a
  // different set of category ids
  const [categoryOrderByBoard, setCategoryOrderByBoard] = useState<Record<"general" | "hospital", string[]>>({
    general:  CATEGORIES_GENERAL.map(c => c.id),
    hospital: CATEGORIES_HOSPITAL.map(c => c.id),
  });
  const [hiddenCategoriesByBoard, setHiddenCategoriesByBoard] = useState<Record<"general" | "hospital", string[]>>({
    general: [], hospital: [],
  });
  const categoryOrder       = categoryOrderByBoard[boardType];
  const hiddenCategories    = hiddenCategoriesByBoard[boardType];
  function setCategoryOrder(update: string[] | ((prev: string[]) => string[])) {
    setCategoryOrderByBoard(prev => ({
      ...prev,
      [boardType]: typeof update === "function" ? (update as (p: string[]) => string[])(prev[boardType]) : update,
    }));
  }
  function setHiddenCategories(update: string[] | ((prev: string[]) => string[])) {
    setHiddenCategoriesByBoard(prev => ({
      ...prev,
      [boardType]: typeof update === "function" ? (update as (p: string[]) => string[])(prev[boardType]) : update,
    }));
  }
  const [tilesPerColumn, setTilesPerColumn]     = useState(4);

  // ── Category label overrides
  const [categoryLabels, setCategoryLabels] = useState<Record<string, { en: string; ar: string }>>({});
  const [renamingCatId, setRenamingCatId]   = useState<string | null>(null);
  const [renameDraftEn, setRenameDraftEn]   = useState("");
  const [renameDraftAr, setRenameDraftAr]   = useState("");

  // ── Board arrange mode
  const [isArrangingCategories, setIsArrangingCategories] = useState(false);
  const [draggedCatId, setDraggedCatId]   = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [textMode, setTextMode]   = useState(false);
  const layoutMode = useSyncExternalStore(subscribeResize, getLayoutMode, getServerLayoutMode);
  const isPhone   = layoutMode === "phone";
  const isStacked = layoutMode === "stacked";
  const [phoneImageOpen, setPhoneImageOpen] = useState(false);
  const [freeText, setFreeText]   = useState("");
  const freeTextRef = useRef<HTMLInputElement | null>(null);
  const wordStripRef = useRef<HTMLDivElement | null>(null);
  const [longPressMenu, setLongPressMenu] = useState<{
    tile: AacTile; phrases: ComboPhrase[];
    popupLeft: number; popupTop: number; arrowLeft: number;
    hoveredIdx: number;
  } | null>(null);
  const longPressTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef  = useRef<{ x: number; y: number } | null>(null);
  const longPressRectRef   = useRef<DOMRect | null>(null);
  const longPressActiveRef = useRef(false);
  const [customCategory, setCustomCategory]           = useState(CATEGORIES[0].id);
  const [customIconType, setCustomIconType]           = useState<"emoji" | "photo" | "generated">("emoji");
  const [customEmoji, setCustomEmoji]                 = useState("");
  const [customImageUrl, setCustomImageUrl]           = useState("");
  const [customLabelEn, setCustomLabelEn]             = useState("");
  const [customLabelAr, setCustomLabelAr]             = useState("");
  const [customCameraOn, setCustomCameraOn]           = useState(false);
  const [showCropModal, setShowCropModal]             = useState(false);
  const [cropSrc, setCropSrc]                         = useState("");
  const [cropPos, setCropPos]                         = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom]                       = useState(1);
  const [croppedAreaPx, setCroppedAreaPx]             = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [customCameraStream, setCustomCameraStream]   = useState<MediaStream | null>(null);
  const customVideoRef  = useRef<HTMLVideoElement>(null);
  const customCanvasRef = useRef<HTMLCanvasElement>(null);
  const customFileRef   = useRef<HTMLInputElement>(null);

  // ── Parent tab
  const [parentTab, setParentTab] = useState<"profile" | "people" | "history">("profile");
  const [editingNoteId, setEditingNoteId]       = useState<string | null>(null);
  const [noteInput, setNoteInput]               = useState("");
  const [showHistoryGallery, setShowHistoryGallery] = useState(false);
  const [showLibraryGallery, setShowLibraryGallery] = useState(false);

  // ── Add to board / library modal (single images)
  const [showAddToBoard, setShowAddToBoard]         = useState(false);
  const [addToBoardUrl, setAddToBoardUrl]           = useState("");
  const [addToBoardLabelEn, setAddToBoardLabelEn]   = useState("");
  const [addToBoardLabelAr, setAddToBoardLabelAr]   = useState("");
  const [addToBoardCategory, setAddToBoardCategory] = useState(CATEGORIES[0].id);
  const [addToBoardDest, setAddToBoardDest]         = useState<"board" | "library">("board");
  const [showAddStoryPicker, setShowAddStoryPicker] = useState(false);
  const [storyName, setStoryName]                   = useState("");
  const [viewingStory, setViewingStory]             = useState<AacTile | null>(null);

  const PRESET_CONDITIONS = ["autism", "cerebral-palsy", "down-syndrome", "aphasia", "als", "other", ""];
  const isOtherCondition = !PRESET_CONDITIONS.includes(profile.condition) || profile.condition === "other";

  // ── Camera refs — profile
  const profileVideoRef  = useRef<HTMLVideoElement>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement>(null);
  const profileFileRef   = useRef<HTMLInputElement>(null);
  const [profileCameraOn, setProfileCameraOn]         = useState(false);
  const [profileCameraStream, setProfileCameraStream] = useState<MediaStream | null>(null);

  // ── Camera refs — person
  const personVideoRef  = useRef<HTMLVideoElement>(null);
  const personCanvasRef = useRef<HTMLCanvasElement>(null);
  const personFileRef   = useRef<HTMLInputElement>(null);
  const [personCameraOn, setPersonCameraOn]         = useState(false);
  const [personCameraStream, setPersonCameraStream] = useState<MediaStream | null>(null);

  // ─── Effects ──────────────────────────────────────────────────────────────

  // ── localStorage: load on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const savedProfile     = localStorage.getItem("vocalai_profile");
        const savedPeople      = localStorage.getItem("vocalai_people");
        const savedTiles       = localStorage.getItem("vocalai_custom_tiles");
        const savedLanguage    = localStorage.getItem("vocalai_language");
        const savedStyle       = localStorage.getItem("vocalai_image_style");
        const savedHistory     = localStorage.getItem("vocalai_history");
        const savedLibrary     = localStorage.getItem("vocalai_library");
        const savedCultural    = localStorage.getItem("vocalai_cultural_grounding");
        const savedCatOrder    = localStorage.getItem("vocalai_category_order");
        const savedHidden      = localStorage.getItem("vocalai_hidden_categories");
        const savedTilesPerCol = localStorage.getItem("vocalai_tiles_per_column");
        const savedCatLabels   = localStorage.getItem("vocalai_category_labels");
        const savedBoardType   = localStorage.getItem("vocalai_board_type");
        if (savedProfile)     setProfile(JSON.parse(savedProfile));
        if (savedPeople)      setImportantPeople(JSON.parse(savedPeople));
        if (savedLanguage)    setLanguage(savedLanguage as "en" | "ar");
        if (savedStyle)       setImageStyle(savedStyle as "symbolic" | "cartoon" | "realistic");
        if (savedCultural !== null) setCulturalGrounding(savedCultural === "true");
        if (savedBoardType === "hospital" || savedBoardType === "general") setBoardType(savedBoardType);
        if (savedCatOrder) {
          const parsed = JSON.parse(savedCatOrder);
          setCategoryOrderByBoard(prev => Array.isArray(parsed) ? { ...prev, general: parsed } : { ...prev, ...parsed });
        }
        if (savedHidden) {
          const parsed = JSON.parse(savedHidden);
          setHiddenCategoriesByBoard(prev => Array.isArray(parsed) ? { ...prev, general: parsed } : { ...prev, ...parsed });
        }
        // One-time layout reset when the canonical category order changes (e.g. food/drink
        // merge, category reordering) — bump CATEGORY_LAYOUT_VERSION whenever that happens.
        // Below that version, snap straight to canonical order; at/above it, just reconcile
        // (drop stale ids, append new ones) so manual "arrange" customization survives.
        const savedLayoutVersion = Number(localStorage.getItem("vocalai_category_layout_version") ?? "1");
        if (savedLayoutVersion < CATEGORY_LAYOUT_VERSION) {
          setCategoryOrderByBoard({
            general:  CATEGORIES_GENERAL.map(c => c.id),
            hospital: CATEGORIES_HOSPITAL.map(c => c.id),
          });
        } else {
          setCategoryOrderByBoard(prev => ({
            general:  reconcileOrder(prev.general,  CATEGORIES_GENERAL.map(c => c.id)),
            hospital: reconcileOrder(prev.hospital, CATEGORIES_HOSPITAL.map(c => c.id)),
          }));
        }
        localStorage.setItem("vocalai_category_layout_version", String(CATEGORY_LAYOUT_VERSION));
        setHiddenCategoriesByBoard(prev => ({
          general:  prev.general.filter(id => CATEGORIES_GENERAL.some(c => c.id === id)),
          hospital: prev.hospital.filter(id => CATEGORIES_HOSPITAL.some(c => c.id === id)),
        }));
        if (savedTilesPerCol) setTilesPerColumn(Number(savedTilesPerCol));
        if (savedCatLabels)   setCategoryLabels(JSON.parse(savedCatLabels));

        if (savedTiles) {
          const parsed = JSON.parse(savedTiles) as Record<string, AacTile[]>;
          const resolved: Record<string, AacTile[]> = {};
          for (const [cat, tiles] of Object.entries(parsed)) {
            resolved[cat] = await Promise.all(
              tiles.map(async tile => {
                let updatedTile = { ...tile };
                if (tile.imageUrl?.startsWith("idb:")) {
                  const data = await idbGet(tile.imageUrl.slice(4)).catch(() => null);
                  updatedTile = { ...updatedTile, imageUrl: data ?? undefined };
                }
                if (tile.storyImages?.length) {
                  const restored = await Promise.all(
                    tile.storyImages.map(async url => {
                      if (url.startsWith("idb:")) {
                        return (await idbGet(url.slice(4)).catch(() => null)) ?? "";
                      }
                      return url;
                    })
                  );
                  updatedTile = { ...updatedTile, storyImages: restored.filter(Boolean) };
                }
                return updatedTile;
              })
            );
          }
          setCustomTiles(resolved);
        }

        if (savedHistory) {
          const history = JSON.parse(savedHistory) as RecentGeneration[];
          // Restore any images that were offloaded to IndexedDB ("idb:<key>" placeholders)
          const restored = await Promise.all(
            history.map(async gen => {
              const images = await Promise.all(
                gen.images.map(async url => {
                  if (url.startsWith("idb:")) {
                    return (await idbGet(url.slice(4)).catch(() => null)) ?? "";
                  }
                  return url;
                })
              );
              return { ...gen, images: images.filter(Boolean) };
            })
          );
          setRecentGenerations(restored);
        }

        if (savedLibrary) {
          const library = JSON.parse(savedLibrary) as LibraryItem[];
          const restored = await Promise.all(
            library.map(async item => {
              const images = await Promise.all(
                item.images.map(async url => {
                  if (url.startsWith("idb:")) {
                    return (await idbGet(url.slice(4)).catch(() => null)) ?? "";
                  }
                  return url;
                })
              );
              return { ...item, images: images.filter(Boolean) };
            })
          );
          setLibraryItems(restored);
        }
      } catch { /* corrupted data — start fresh */ }
    })();
  }, []);

  // ── localStorage: save on change ─────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("vocalai_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("vocalai_people", JSON.stringify(importantPeople));
  }, [importantPeople]);

  useEffect(() => {
    // Offload imageUrl data: URLs to IndexedDB, store "idb:<key>" refs in localStorage.
    (async () => {
      const forStorage: Record<string, AacTile[]> = {};
      for (const [cat, tiles] of Object.entries(customTiles)) {
        forStorage[cat] = await Promise.all(
          tiles.map(async (tile, idx) => {
            let updatedTile = { ...tile };
            if (tile.imageUrl?.startsWith("data:")) {
              const key = `tile:${cat}:${idx}`;
              await idbPut(key, tile.imageUrl).catch(() => {});
              updatedTile = { ...updatedTile, imageUrl: `idb:${key}` };
            }
            if (tile.storyImages?.length) {
              const offloaded = await Promise.all(
                tile.storyImages.map(async (url, imgIdx) => {
                  if (url.startsWith("data:")) {
                    const key = `tile:${cat}:${idx}:story:${imgIdx}`;
                    await idbPut(key, url).catch(() => {});
                    return `idb:${key}`;
                  }
                  return url;
                })
              );
              updatedTile = { ...updatedTile, storyImages: offloaded };
            }
            return updatedTile;
          })
        );
      }
      try {
        localStorage.setItem("vocalai_custom_tiles", JSON.stringify(forStorage));
      } catch { /* silently ignore quota errors */ }
    })();
  }, [customTiles]);

  useEffect(() => {
    localStorage.setItem("vocalai_language", language);
    document.documentElement.lang = language;
  }, [language]);

  // Keep the newest word in view once the message bar overflows (RTL scrolls toward negative scrollLeft).
  useEffect(() => {
    const strip = wordStripRef.current;
    if (strip) strip.scrollLeft = isRTL ? -strip.scrollWidth : strip.scrollWidth;
  }, [selectedTiles.length, freeText, textMode, isRTL]);

  useEffect(() => {
    localStorage.setItem("vocalai_image_style", imageStyle);
  }, [imageStyle]);

  useEffect(() => {
    localStorage.setItem("vocalai_cultural_grounding", String(culturalGrounding));
  }, [culturalGrounding]);

  useEffect(() => {
    // Offload base64 data: URLs to IndexedDB and store "idb:<key>" placeholders in localStorage.
    // This keeps localStorage small while making images available after reload.
    (async () => {
      const forStorage = await Promise.all(
        recentGenerations.map(async gen => {
          const images = await Promise.all(
            gen.images.map(async (url, idx) => {
              if (url.startsWith("data:")) {
                const key = `${gen.id}:${idx}`;
                await idbPut(key, url).catch(() => {});
                return `idb:${key}`;
              }
              return url; // already an idb: ref or external URL
            })
          );
          return { ...gen, images };
        })
      );
      try {
        localStorage.setItem("vocalai_history", JSON.stringify(forStorage));
      } catch {
        // Fallback: drop images entirely (very unlikely since we use idb: refs)
        try {
          localStorage.setItem("vocalai_history", JSON.stringify(
            forStorage.map(g => ({ ...g, images: [] }))
          ));
        } catch { /* give up gracefully */ }
      }
    })();
  }, [recentGenerations]);

  useEffect(() => {
    // Offload base64 data: URLs to IndexedDB and store "idb:<key>" placeholders in localStorage.
    (async () => {
      const forStorage = await Promise.all(
        libraryItems.map(async item => {
          const images = await Promise.all(
            item.images.map(async (url, idx) => {
              if (url.startsWith("data:")) {
                const key = `lib:${item.id}:${idx}`;
                await idbPut(key, url).catch(() => {});
                return `idb:${key}`;
              }
              return url;
            })
          );
          return { ...item, images };
        })
      );
      try {
        localStorage.setItem("vocalai_library", JSON.stringify(forStorage));
      } catch {
        try {
          localStorage.setItem("vocalai_library", JSON.stringify(
            forStorage.map(item => ({ ...item, images: [] }))
          ));
        } catch { /* give up gracefully */ }
      }
    })();
  }, [libraryItems]);

  useEffect(() => {
    localStorage.setItem("vocalai_category_order", JSON.stringify(categoryOrderByBoard));
  }, [categoryOrderByBoard]);

  useEffect(() => {
    localStorage.setItem("vocalai_hidden_categories", JSON.stringify(hiddenCategoriesByBoard));
  }, [hiddenCategoriesByBoard]);

  useEffect(() => {
    localStorage.setItem("vocalai_board_type", boardType);
  }, [boardType]);

  useEffect(() => {
    localStorage.setItem("vocalai_tiles_per_column", String(tilesPerColumn));
  }, [tilesPerColumn]);

  useEffect(() => {
    localStorage.setItem("vocalai_category_labels", JSON.stringify(categoryLabels));
  }, [categoryLabels]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14`,
          { headers: { "User-Agent": "VocalAI-AAC/2.0" } }
        );
        const d = await res.json();
        const place =
          d.address?.suburb        ||
          d.address?.neighbourhood ||
          d.address?.city_district ||
          d.address?.city          ||
          d.address?.town          ||
          "";
        if (place) setLocationLabel(place);
      } catch { /* silent */ }
    }, () => {});
  }, []);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTimeLabel(
        now.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", {
          hour: "2-digit", minute: "2-digit", hour12: true,
        })
      );
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isRTL]);

  useEffect(() => {
    if (profileCameraOn && profileCameraStream && profileVideoRef.current) {
      profileVideoRef.current.srcObject = profileCameraStream;
      profileVideoRef.current.play().catch(() => {});
    }
  }, [profileCameraOn, profileCameraStream]);

  useEffect(() => {
    if (personCameraOn && personCameraStream && personVideoRef.current) {
      personVideoRef.current.srcObject = personCameraStream;
      personVideoRef.current.play().catch(() => {});
    }
  }, [personCameraOn, personCameraStream]);

  useEffect(() => {
    if (customCameraOn && customCameraStream && customVideoRef.current) {
      customVideoRef.current.srcObject = customCameraStream;
      customVideoRef.current.play().catch(() => {});
    }
  }, [customCameraOn, customCameraStream]);

  useEffect(() => {
    return () => {
      profileCameraStream?.getTracks().forEach(t => t.stop());
      personCameraStream?.getTracks().forEach(t => t.stop());
    };
  }, [profileCameraStream, personCameraStream]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function submitPin() {
    if (pinInput === DEFAULT_PIN) {
      setShowPinModal(false);
      setPinInput("");
      setMode("parent");
    } else {
      setPinError(true);
      setPinInput("");
    }
  }

  function returnToChild() {
    setMode("child");
    setLanguage(profile.language);
    stopProfileCamera();
    stopPersonCamera();
  }

  function getTilesForCategory(cat: string): AacTile[] {
    const builtIn = [
      ...(TILES[cat] ?? []),
      ...(boardType === "hospital" ? (HOSPITAL_EXTRA_TILES[cat] ?? []) : []),
    ].map(t => ({ ...t, imageUrl: tileImageFor(cat, t.en) }));

    let base: AacTile[];
    if (cat === "people") {
      base = [
        ...builtIn,
        ...importantPeople.map(p => ({ emoji: "👤", en: p.name, ar: p.name })),
      ];
    } else if (cat === "phrases") {
      const name = profile.name.trim();
      base = builtIn.map(t =>
        t.en === "__my_name__"
          ? { ...t, en: name ? `My name is ${name}` : "My name is…", ar: name ? `اسمي ${name}` : "اسمي…" }
          : t
      );
    } else {
      base = builtIn;
    }
    return [...base, ...(customTiles[cat] ?? [])];
  }

  // ── Board layout helpers ───────────────────────────────────────────────────
  function getCatLabel(id: string) {
    const override = categoryLabels[id];
    const base = CATEGORIES.find(c => c.id === id);
    return isRTL
      ? (override?.ar || base?.arLabel || id)
      : (override?.en || base?.enLabel || id);
  }

  const visibleCategories = categoryOrder
    .map(id => CATEGORIES.find(c => c.id === id))
    .filter((c): c is typeof CATEGORIES[0] => !!c && !hiddenCategories.includes(c.id));

  // Phones show one category at a time, so a category is always selected there.
  const shownCategory = isPhone ? (expandedCategory ?? visibleCategories[0]?.id ?? null) : expandedCategory;
  const boardCols = Math.max(visibleCategories.length, 1);
  // Tablet portrait: size the board to its width-limited square tiles so the image panel gets the remaining height.
  const stackedBoardHeight = `calc(72px + ${tilesPerColumn} * ((100vw - ${16 + (boardCols - 1) * 6}px) / ${boardCols}) + ${(tilesPerColumn - 1) * 6}px)`;

  function moveCategoryUp(id: string) {
    setCategoryOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveCategoryDown(id: string) {
    setCategoryOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function toggleHideCategory(id: string) {
    if (expandedCategory === id) setExpandedCategory(null);
    setHiddenCategories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function openAddToBoard(imageUrl: string, prefillLabel: string) {
    setAddToBoardUrl(imageUrl);
    setAddToBoardLabelEn(prefillLabel);
    setAddToBoardLabelAr("");
    setAddToBoardCategory(CATEGORIES[0].id);
    setAddToBoardDest("board");
    setShowAddToBoard(true);
  }

  function saveToBoard() {
    if (!addToBoardUrl || !addToBoardLabelEn.trim()) return;
    const tile: AacTile = {
      emoji: "",
      en: addToBoardLabelEn.trim(),
      ar: addToBoardLabelAr.trim() || addToBoardLabelEn.trim(),
      imageUrl: addToBoardUrl,
    };
    setCustomTiles(prev => ({ ...prev, [addToBoardCategory]: [...(prev[addToBoardCategory] ?? []), tile] }));
    setShowAddToBoard(false);
  }

  function saveSingleToLibrary() {
    if (!addToBoardUrl || !addToBoardLabelEn.trim()) return;
    const item: LibraryItem = {
      id: uid(),
      en: addToBoardLabelEn.trim(),
      ar: addToBoardLabelAr.trim() || addToBoardLabelEn.trim(),
      images: [addToBoardUrl],
      timestamp: new Date().toISOString(),
    };
    setLibraryItems(prev => [item, ...prev]);
    setShowAddToBoard(false);
  }

  function saveStoryToLibrary() {
    const name = storyName.trim() || (isRTL ? "قصتي" : "My Story");
    const item: LibraryItem = {
      id: uid(),
      en: name,
      ar: name,
      images: generatedImages.map(g => g.url),
      timestamp: new Date().toISOString(),
    };
    setLibraryItems(prev => [item, ...prev]);
    setShowAddStoryPicker(false);
    setStoryName("");
  }

  function removeLibraryItem(id: string) {
    setLibraryItems(prev => prev.filter(item => item.id !== id));
  }

  function addCustomTile() {
    if ((!customEmoji && !customImageUrl) || !customLabelEn.trim()) return;
    const tile: AacTile = {
      emoji: customIconType === "emoji" ? customEmoji : "",
      en: customLabelEn.trim(),
      ar: customLabelAr.trim() || customLabelEn.trim(),
      imageUrl: customIconType !== "emoji" ? customImageUrl : undefined,
    };
    setCustomTiles(prev => ({ ...prev, [customCategory]: [...(prev[customCategory] ?? []), tile] }));
    setCustomEmoji(""); setCustomImageUrl(""); setCustomLabelEn(""); setCustomLabelAr("");
    setCustomIconType("emoji"); setShowCustomiseModal(false);
    stopCustomCamera();
  }

  function stopCustomCamera() {
    customCameraStream?.getTracks().forEach(t => t.stop());
    setCustomCameraStream(null);
    setCustomCameraOn(false);
  }

  function addTile(tile: AacTile) {
    // Commit any pending typed text as a word first, so tapping a tile after
    // typing doesn't jump the typed word to the end — it keeps its place.
    const typed = freeText.trim();
    setSelectedTiles(prev => [
      ...prev,
      ...(typed ? [{ emoji: "", en: typed, ar: typed, typed: true }] : []),
      tile,
    ]);
    if (typed) setFreeText("");
    setGeneratedImages([]);
    setCaption("");
    setGenFailed(false);
  }

  const COMBO_ITEM_H  = 52;
  const COMBO_HEADER_H = 56;

  function tilePointerProps(tile: AacTile, catId: string) {
    const phrases = COMBO_PHRASES_BY_CAT[catId] ?? [];
    return {
      onPointerDown(e: React.PointerEvent) {
        longPressActiveRef.current = false;
        longPressStartRef.current  = { x: e.clientX, y: e.clientY };
        longPressRectRef.current   = e.currentTarget.getBoundingClientRect();
        longPressTimerRef.current  = setTimeout(() => {
          if (!phrases.length) return;
          const rect    = longPressRectRef.current!;
          const PW      = 224;
          const ITEM_H  = COMBO_ITEM_H;
          const HDR_H   = COMBO_HEADER_H;
          const popupH  = HDR_H + phrases.length * ITEM_H + 8; // +8 bottom padding
          const centerX = rect.left + rect.width / 2;
          const popupLeft = Math.max(8, Math.min(centerX - PW / 2, window.innerWidth - PW - 8));
          const popupTop  = Math.max(8, rect.top - popupH - 12);
          const arrowLeft = Math.min(Math.max(centerX - popupLeft - 8, 12), PW - 24);
          longPressActiveRef.current = true;
          setLongPressMenu({ tile, phrases, popupLeft, popupTop, arrowLeft, hoveredIdx: -1 });
        }, 500);
      },
      onPointerMove(e: React.PointerEvent) {
        if (longPressActiveRef.current || !longPressStartRef.current) return;
        const dx = e.clientX - longPressStartRef.current.x;
        const dy = e.clientY - longPressStartRef.current.y;
        if (dx * dx + dy * dy > 64) {
          clearTimeout(longPressTimerRef.current!);
          longPressTimerRef.current = null;
        }
      },
      onPointerUp() {
        clearTimeout(longPressTimerRef.current!);
        longPressTimerRef.current = null;
        // Normal taps are handled by onClick; this just cancels the long-press timer
      },
      onPointerCancel() {
        clearTimeout(longPressTimerRef.current!);
        longPressTimerRef.current  = null;
        longPressActiveRef.current = false;
      },
    };
  }

  function removeTileAt(index: number) {
    setSelectedTiles(prev => prev.filter((_, i) => i !== index));
    setGeneratedImages([]);
    setCaption("");
    setGenFailed(false);
  }

  function clearAll() {
    setSelectedTiles([]);
    setFreeText("");
    setGeneratedImages([]);
    setCaption("");
    setGenFailed(false);
  }

  const sentenceText = [...selectedTiles.map(t => isRTL ? t.ar : t.en), freeText.trim()].filter(Boolean).join(" ");

  // Prefetch: start generating audio once the sentence stops changing, so it is
  // usually ready by the time Speak is pressed. Typing waits longer than tile
  // taps so half-typed words don't each trigger a request.
  useEffect(() => {
    if (!sentenceText) return;
    const id = setTimeout(
      () => { loadTtsAudio(sentenceText, profile.gender, language); },
      freeText.trim() ? 1000 : 400,
    );
    return () => clearTimeout(id);
  }, [sentenceText, freeText, profile.gender, language]);

  async function speakSentence() {
    const text = sentenceText;
    if (!text || typeof window === "undefined") return;
    const speakId = ++ttsSpeakId;
    try {
      const ctx = ttsAudioContext(); // before any await, while still inside the tap
      const job = loadTtsAudio(text, profile.gender, language);
      await job.started;
      if (speakId !== ttsSpeakId) return; // a newer Speak press took over
      playTtsJob(job, ctx);
      const key = ttsKey(text, profile.gender, language);
      job.done.then(blob => ttsDbPut(key, blob)).catch(() => {});
    } catch (e) {
      if (speakId !== ttsSpeakId) return;
      console.error("[Gemini TTS] failed, falling back to Web Speech:", e);
      ttsStopCurrent?.();
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = isRTL ? "ar-SA" : "en-US";
        window.speechSynthesis.speak(utterance);
      } catch { /* silent */ }
    }
  }

  const profileContext = {
    location:         locationLabel      || undefined,
    gender:           profile.gender     || undefined,
    condition:        profile.condition  || undefined,
    age:              profile.age        || undefined,
    appearance:       profile.appearance || undefined,
    culturalGrounding,
    noCharacter:      hideCharacter,
  };

  function genHintText(reason: GenBlockedReason): string {
    if (reason === "busy")  return isRTL ? "لا تزال الصورة قيد الإنشاء…" : "Still making the picture…";
    if (reason === "empty") return isRTL ? "اختر كلمات أولاً، ثم اضغط ✨ صورة" : "Pick some words first, then tap ✨ Picture";
    return isRTL ? "أضف كلمة تُظهر شيئاً، مثل ماء أو العب" : "Add a word that shows something, like water or play";
  }

  const messageWords = [
    ...selectedTiles.flatMap(t => t.en.split(/\s+/)),
    ...freeText.trim().split(/\s+/),
  ].filter(Boolean);
  const genBlockedReason: GenBlockedReason | null =
    isGenerating ? "busy" :
    messageWords.length === 0 ? "empty" :
    !hasContentWord(messageWords) ? "filler" : null;
  const activeGenHint = genHint && genHint.reason === genBlockedReason ? genHint : null;

  async function handleGenerate() {
    if (isPhone) setPhoneImageOpen(true);
    if (genBlockedReason) {
      const reason = genBlockedReason;
      const text = genHintText(reason);
      // Clear first so the live region re-announces even when the same hint repeats.
      setGenStatus("");
      setTimeout(() => setGenStatus(text), 50);
      if (reason !== "busy") setGenHint(h => ({ reason, n: (h?.n ?? 0) + 1 }));
      return;
    }
    setGenHint(null);
    setIsGenerating(true);
    setGenFailed(false);
    setGeneratedImages([]);
    setCaption("");
    setShowAddStoryPicker(false);
    setGenStatus(imageMode === "story"
      ? (isRTL ? "جارٍ توليد القصة…" : "Generating story…")
      : (isRTL ? "جارٍ توليد الصورة…" : "Generating image…"));

    const words = [...selectedTiles.map(t => isRTL ? t.ar : t.en), freeText.trim()].filter(Boolean).join(" ");

    try {
      if (imageMode === "single") {
        const prompt = [...selectedTiles.map(t => t.en), freeText.trim()].filter(Boolean).join(" ");
        const matchingPeople = importantPeople.filter(p =>
          selectedTiles.some(t => t.en.toLowerCase() === p.name.toLowerCase())
        );

        const [imagesRes, captionRes] = await Promise.all([
          fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt, style: imageStyle, ...profileContext,
              importantPeople: matchingPeople.map(p => ({ name: p.name, description: p.description })),
              count: 1,
            }),
          }).then(r => r.json()),
          fetch("/api/caption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words, language }),
          }).then(r => r.json()).catch(() => ({ caption: null })),
        ]);

        const urls: string[] = imagesRes.urls ?? (imagesRes.url ? [imagesRes.url] : []);
        if (urls.length === 0) throw new Error(imagesRes.error ?? "No image returned");
        const cap: string = captionRes.caption ?? "";
        setGeneratedImages(urls.map(url => ({ url })));
        setGenStatus(isRTL ? "الصورة جاهزة" : "Image ready");
        setStoryIndex(0);
        setCaption(cap);
        setRecentGenerations(prev => [{
          id: uid(), tiles: [...selectedTiles], images: urls,
          caption: cap, style: imageStyle, timestamp: new Date().toISOString(),
        }, ...prev].slice(0, 20));

      } else {
        const sentence = [...selectedTiles.map(t => t.en), freeText.trim()].filter(Boolean).join(" ");

        const [splitRes, captionRes] = await Promise.all([
          fetch("/api/split-story", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sentence }),
          }).then(r => r.json()),
          fetch("/api/caption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words, language }),
          }).then(r => r.json()).catch(() => ({ caption: null })),
        ]);

        const scenes: string[] = (splitRes.scenes ?? []).slice(0, 4);
        const storyImages = await Promise.all(
          scenes.map(scene =>
            fetch("/api/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: scene, style: imageStyle, ...profileContext,
                importantPeople: importantPeople
                  .filter(p => scene.toLowerCase().includes(p.name.toLowerCase()))
                  .map(p => ({ name: p.name, description: p.description })),
                count: 1,
              }),
            }).then(r => r.json()).then(d => ({
              url: (d.urls?.[0] ?? d.url ?? "") as string,
              label: scene,
            }))
          )
        );

        const readyImages = storyImages.filter(img => img.url);
        if (readyImages.length === 0) throw new Error("No story images returned");
        const cap: string = (captionRes as { caption?: string }).caption ?? "";
        setGeneratedImages(readyImages);
        const n = readyImages.length;
        setGenStatus(isRTL
          ? `القصة جاهزة، ${n === 1 ? "صورة واحدة" : n === 2 ? "صورتان" : `${n} صور`}`
          : `Story ready, ${n} ${n === 1 ? "picture" : "pictures"}`);
        setStoryIndex(0);
        setCaption(cap);
        setRecentGenerations(prev => [{
          id: uid(), tiles: [...selectedTiles],
          images: storyImages.map(img => img.url).filter(Boolean),
          caption: cap, style: imageStyle, timestamp: new Date().toISOString(),
        }, ...prev].slice(0, 20));
      }
    } catch (err) {
      console.error("Generate error:", err);
      setCaption("");
      setGenFailed(true);
      setGenStatus(isRTL
        ? "تعذّر توليد الصورة. يرجى المحاولة مرة أخرى."
        : "Couldn't generate the image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function analyzePhoto(dataUrl: string, target: "profile" | "person") {
    if (target === "profile") setProfilePhotoLoading(true);
    else setNewPersonPhotoLoading(true);
    try {
      const res  = await fetch("/api/analyze-appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const appearance = data.appearance ?? "";
      if (target === "profile") setProfile(p => ({ ...p, appearance }));
      else setNewPersonDesc(appearance);
      if (!appearance) console.warn("[analyzePhoto] API returned empty appearance for", target);
    } catch (e) {
      console.error("[analyzePhoto] failed for", target, e);
      if (target === "profile")
        setProfile(p => ({ ...p, appearance: "" }));
    } finally {
      if (target === "profile") setProfilePhotoLoading(false);
      else setNewPersonPhotoLoading(false);
    }
  }

  async function startCamera(target: "profile" | "person") {
    if (target === "profile") stopProfileCamera();
    else stopPersonCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (target === "profile") { setProfileCameraStream(stream); setProfileCameraOn(true); }
      else { setPersonCameraStream(stream); setPersonCameraOn(true); }
    } catch {
      alert(isRTL ? "لم نتمكن من الوصول إلى الكاميرا." : "Could not access camera.");
    }
  }

  function stopProfileCamera() {
    profileCameraStream?.getTracks().forEach(t => t.stop());
    setProfileCameraStream(null);
    setProfileCameraOn(false);
  }

  function stopPersonCamera() {
    personCameraStream?.getTracks().forEach(t => t.stop());
    setPersonCameraStream(null);
    setPersonCameraOn(false);
  }

  function captureFromCamera(target: "profile" | "person") {
    const videoRef  = target === "profile" ? profileVideoRef  : personVideoRef;
    const canvasRef = target === "profile" ? profileCanvasRef : personCanvasRef;
    const stopFn    = target === "profile" ? stopProfileCamera : stopPersonCamera;
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopFn();
    if (target === "profile") {
      setProfile(p => ({ ...p, photoPreview: dataUrl, appearance: "" }));
      analyzePhoto(dataUrl, "profile");
    } else {
      setNewPersonPhoto(dataUrl);
      analyzePhoto(dataUrl, "person");
    }
  }

  function addPerson() {
    if (!newPersonName.trim()) return;
    setImportantPeople(prev => [
      ...prev,
      { id: uid(), name: newPersonName.trim(), photoPreview: newPersonPhoto, description: newPersonDesc },
    ]);
    setNewPersonName("");
    setNewPersonDesc("");
    setNewPersonPhoto("");
    if (personFileRef.current) personFileRef.current.value = "";
  }

  function removePerson(id: string) {
    setImportantPeople(prev => prev.filter(p => p.id !== id));
  }

  function saveNote(id: string) {
    setRecentGenerations(prev =>
      prev.map(g => g.id === id ? { ...g, note: noteInput.trim() } : g)
    );
    setEditingNoteId(null);
    setNoteInput("");
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-slate-50" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── PIN Modal ── */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-3xl p-8 shadow-2xl space-y-5 text-center"
            >
              <div className="text-5xl">🔒</div>
              <h2 className="text-xl font-bold text-slate-800">
                {isRTL ? "أدخل الرمز السري" : "Enter PIN"}
              </h2>
              <Input
                type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                value={pinInput} autoFocus
                onChange={e => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(false); }}
                onKeyDown={e => { if (e.key === "Enter" && pinInput.length === 4) submitPin(); }}
                className={`text-center text-2xl tracking-[0.5em] rounded-2xl h-14 ${pinError ? "border-red-400 bg-red-50" : ""}`}
                placeholder="••••"
              />
              {pinError && (
                <p className="text-red-500 text-sm font-medium">
                  {isRTL ? "رمز غير صحيح" : "Incorrect PIN"}
                </p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-2xl"
                  onClick={() => { setShowPinModal(false); setPinInput(""); setPinError(false); }}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Button>
                <Button className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700"
                  disabled={pinInput.length !== 4} onClick={submitPin}>
                  {isRTL ? "دخول" : "Enter"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add to Board Modal ── */}
      <AnimatePresence>
        {showAddToBoard && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex flex-col"
            onClick={() => setShowAddToBoard(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl flex flex-col"
              style={{ maxHeight: "90dvh" }}
              onClick={e => e.stopPropagation()}
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">
                  {isRTL ? "حفظ الصورة" : "Save Image"}
                </h2>
                <button
                  onClick={() => setShowAddToBoard(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >✕</button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-5" style={{ scrollbarWidth: "none" }}>
                {/* Image preview */}
                {addToBoardUrl && (
                  <img
                    src={addToBoardUrl}
                    alt=""
                    className="w-32 h-32 rounded-2xl object-cover border border-slate-200 shadow-sm mx-auto"
                  />
                )}

                {/* Destination */}
                <div role="group" aria-label={isRTL ? "حفظ في" : "Save to"} className="flex rounded-xl overflow-hidden border border-slate-200">
                  {[
                    { id: "board",   en: "Add to Board",  ar: "إضافة إلى اللوحة" },
                    { id: "library", en: "Add to Library", ar: "إضافة إلى المكتبة" },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      aria-pressed={addToBoardDest === opt.id}
                      onClick={() => setAddToBoardDest(opt.id as "board" | "library")}
                      className={`inline-flex items-center justify-center gap-1 flex-1 py-2 text-xs font-bold transition-colors ${
                        addToBoardDest === opt.id
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <SelectedTick on={addToBoardDest === opt.id} />
                      {isRTL ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>

                {/* Category picker — board only */}
                {addToBoardDest === "board" && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">
                      {isRTL ? "الفئة" : "Category"}
                    </p>
                    <div role="group" aria-label={isRTL ? "الفئة" : "Category"} className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          aria-pressed={addToBoardCategory === cat.id}
                          onClick={() => setAddToBoardCategory(cat.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${CATEGORY_COLORS[cat.id] ?? ""} ${addToBoardCategory === cat.id ? "ring-2 ring-blue-500 ring-offset-1" : ""} text-slate-700`}
                        >
                          <SelectedTick on={addToBoardCategory === cat.id} />
                          {getCatLabel(cat.id)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Labels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {isRTL ? "الاسم (EN) *" : "Label (EN) *"}
                    </label>
                    <input
                      lang="en"
                      value={addToBoardLabelEn}
                      onChange={e => setAddToBoardLabelEn(e.target.value)}
                      placeholder="e.g. Playing"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {isRTL ? "الاسم (AR)" : "Label (AR)"}
                    </label>
                    <input
                      dir="rtl"
                      lang="ar"
                      value={addToBoardLabelAr}
                      onChange={e => setAddToBoardLabelAr(e.target.value)}
                      placeholder="مثال: يلعب"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="px-5 pb-6 pt-3 border-t border-slate-100">
                <button
                  onClick={addToBoardDest === "board" ? saveToBoard : saveSingleToLibrary}
                  disabled={!addToBoardLabelEn.trim()}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm transition-colors"
                >
                  {addToBoardDest === "board"
                    ? (isRTL ? "حفظ في اللوحة" : "Save to Board")
                    : (isRTL ? "حفظ في المكتبة" : "Save to Library")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Story Viewer Modal ── */}
      <AnimatePresence>
        {viewingStory && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col"
            onClick={() => setViewingStory(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative m-auto w-full max-w-md max-h-[92dvh] bg-white rounded-3xl flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
                <h2 className="text-base font-bold text-slate-800 break-words min-w-0">{viewingStory.en}</h2>
                <button
                  onClick={() => setViewingStory(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 shrink-0"
                >✕</button>
              </div>

              {/* Scene grid */}
              <div
                className="flex-1 overflow-y-auto p-4"
                style={{ scrollbarWidth: "none" } as CSSProperties}
              >
                <div
                  className="gap-3"
                  style={{
                    display: "grid",
                    gridTemplateColumns: (viewingStory.storyImages?.length ?? 0) === 1 ? "1fr" : "repeat(2, 1fr)",
                  }}
                >
                  {viewingStory.storyImages?.map((src, idx) => (
                    <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                      <img src={src} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => setViewingStory(null)}
                  className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                >
                  {isRTL ? "إغلاق" : "Close"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rename Category Modal ── */}
      <AnimatePresence>
        {renamingCatId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={() => setRenamingCatId(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
              dir={isRTL ? "rtl" : "ltr"}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">
                  {isRTL ? "تغيير اسم الفئة" : "Rename category"}
                </h3>
                <button
                  onClick={() => setRenamingCatId(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >✕</button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label lang="en" className="text-xs font-semibold text-slate-600">Name (EN)</label>
                  <input
                    lang="en"
                    value={renameDraftEn}
                    onChange={e => setRenameDraftEn(e.target.value)}
                    placeholder="e.g. Food"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label lang="ar" className="text-xs font-semibold text-slate-600">الاسم (AR)</label>
                  <input
                    dir="rtl"
                    lang="ar"
                    value={renameDraftAr}
                    onChange={e => setRenameDraftAr(e.target.value)}
                    placeholder="مثال: طعام"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (renameDraftEn.trim() || renameDraftAr.trim()) {
                      setCategoryLabels(prev => ({
                        ...prev,
                        [renamingCatId]: { en: renameDraftEn.trim(), ar: renameDraftAr.trim() },
                      }));
                    }
                    setRenamingCatId(null);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm transition-colors"
                >
                  {isRTL ? "حفظ" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setCategoryLabels(prev => {
                      const next = { ...prev };
                      delete next[renamingCatId!];
                      return next;
                    });
                    setRenamingCatId(null);
                  }}
                  className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
                >
                  {isRTL ? "إعادة تعيين" : "Reset"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── History Gallery Modal ── */}
      <AnimatePresence>
        {showHistoryGallery && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex flex-col"
            onClick={() => setShowHistoryGallery(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl flex flex-col"
              style={{ maxHeight: "85dvh" }}
              onClick={e => e.stopPropagation()}
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">
                  {isRTL ? "الصور السابقة" : "Past Generations"}
                </h2>
                <button
                  onClick={() => setShowHistoryGallery(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >✕</button>
              </div>

              {/* Gallery — compact board tiles */}
              <div className="overflow-y-auto flex-1 p-4" style={{ scrollbarWidth: "none" }}>
                {recentGenerations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <span className="text-4xl">🖼️</span>
                    <p className="text-sm text-slate-400 font-medium">
                      {isRTL ? "لا توجد صور بعد — ولّد صورة أولاً" : "No generations yet — generate one to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {recentGenerations.flatMap(gen =>
                      gen.images.map((url, imgIdx) => (
                        <button
                          key={`${gen.id}-${imgIdx}`}
                          onClick={() => {
                            setGeneratedImages(gen.images.map(u => ({ url: u })));
                            setCaption(gen.caption);
                            setImageMode(gen.images.length > 1 ? "story" : "single");
                            setShowHistoryGallery(false);
                            setPhoneImageOpen(true);
                          }}
                          className="flex flex-col items-center gap-1 group"
                        >
                          <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-blue-400 group-active:border-blue-600 transition-all shadow-sm">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-xs text-slate-500 leading-tight text-center line-clamp-2 break-words w-full px-0.5">
                            {gen.tiles.map(t => isRTL ? t.ar : t.en).join(" ")}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Library Gallery Modal ── */}
      <AnimatePresence>
        {showLibraryGallery && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex flex-col"
            onClick={() => setShowLibraryGallery(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl flex flex-col"
              style={{ maxHeight: "85dvh" }}
              onClick={e => e.stopPropagation()}
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">
                  {isRTL ? "📁 المكتبة" : "📁 Library"}
                </h2>
                <button
                  onClick={() => setShowLibraryGallery(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >✕</button>
              </div>

              {/* Gallery — saved single images + stories */}
              <div className="overflow-y-auto flex-1 p-4" style={{ scrollbarWidth: "none" }}>
                {libraryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <span className="text-4xl">📁</span>
                    <p className="text-sm text-slate-400 font-medium">
                      {isRTL ? "لا توجد عناصر محفوظة بعد" : "Nothing saved yet"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {libraryItems.map(item => (
                      <div key={item.id} className="flex flex-col items-center gap-1 group relative">
                        <button
                          onClick={() => {
                            setGeneratedImages(item.images.map(u => ({ url: u })));
                            setCaption(isRTL ? item.ar : item.en);
                            setImageMode(item.images.length > 1 ? "story" : "single");
                            setShowLibraryGallery(false);
                            setPhoneImageOpen(true);
                          }}
                          className="relative block w-full"
                        >
                          <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-blue-400 group-active:border-blue-600 transition-all shadow-sm">
                            {item.images.length > 1 ? (
                              <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full">
                                {item.images.slice(0, 4).map((url, i) => (
                                  <img key={i} src={url} alt="" className="w-full h-full object-cover" />
                                ))}
                              </div>
                            ) : (
                              <img src={item.images[0]} alt={item.en} className="w-full h-full object-cover" />
                            )}
                          </div>
                          {item.images.length > 1 && (
                            <span className="absolute top-1 right-1 bg-white/85 rounded-full text-xs leading-none px-1.5 py-0.5 font-bold text-slate-600 shadow-sm">
                              📚 {item.images.length}
                            </span>
                          )}
                        </button>
                        <p className="text-xs text-slate-500 leading-tight text-center line-clamp-2 break-words w-full px-0.5">
                          {isRTL ? item.ar : item.en}
                        </p>
                        <button
                          onClick={() => removeLibraryItem(item.id)}
                          className="absolute top-1 left-1 bg-white/85 hover:bg-white rounded-full p-1 text-red-400 shadow-sm transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Crop Modal ── */}
      <AnimatePresence>
        {showCropModal && cropSrc && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-black"
          >
            {/* Cropper area */}
            <div className="relative flex-1">
              <Cropper
                image={cropSrc}
                crop={cropPos}
                zoom={cropZoom}
                aspect={1}
                onCropChange={setCropPos}
                onZoomChange={setCropZoom}
                onCropComplete={(_, px) => setCroppedAreaPx(px)}
              />
            </div>

            {/* Zoom slider */}
            <div className="shrink-0 bg-black px-6 pt-4 pb-2 flex items-center gap-3">
              <span className="text-white text-xs opacity-60">🔍</span>
              <input
                type="range" min={1} max={3} step={0.01}
                value={cropZoom}
                onChange={e => setCropZoom(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white text-xs opacity-60">🔎</span>
            </div>

            {/* Actions */}
            <div className="shrink-0 bg-black px-6 pb-6 pt-2 flex gap-3">
              <button
                onClick={() => { setShowCropModal(false); setCropSrc(""); }}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-semibold text-sm"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  if (!croppedAreaPx) return;
                  const cropped = await getCroppedImg(cropSrc, croppedAreaPx);
                  setCustomImageUrl(cropped);
                  setShowCropModal(false);
                  setCropSrc("");
                }}
                className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm"
              >
                {isRTL ? "اقتصاص" : "Crop"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Customise Board Modal ── */}
      <AnimatePresence>
        {showCustomiseModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {customiseView !== "menu" && (
                    <button onClick={() => setCustomiseView("menu")}
                      className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                      ←
                    </button>
                  )}
                  <h2 className="font-bold text-lg text-slate-800">
                    {customiseView === "menu"
                      ? (isRTL ? "تخصيص اللوحة" : "Customise Board")
                      : customiseView === "arrange"
                      ? (isRTL ? "ترتيب اللوحة" : "Arrange Board")
                      : (isRTL ? "إضافة بطاقة" : "Add New Tile")}
                  </h2>
                </div>
                <button onClick={() => { setShowCustomiseModal(false); stopCustomCamera(); }}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="p-5 max-h-[75vh] overflow-y-auto" style={{ scrollbarWidth: "none" } as CSSProperties}>

              {/* ── Menu view ── */}
              {customiseView === "menu" && (
                <div className="space-y-4">
                  <button
                    onClick={() => { setShowCustomiseModal(false); setIsArrangingCategories(true); setExpandedCategory(null); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-300 transition-all text-left"
                  >
                    <span className="text-3xl">🗂️</span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{isRTL ? "ترتيب اللوحة" : "Arrange Board"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{isRTL
                        ? <>اسحب الفئات · اضغط <Eye className="inline h-3 w-3 align-[-2px]" role="img" aria-label={isRTL ? "العين" : "eye"} /> للإخفاء أو الإظهار</>
                        : <>Drag to reorder · tap <Eye className="inline h-3 w-3 align-[-2px]" role="img" aria-label={isRTL ? "العين" : "eye"} /> to show/hide</>}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setCustomiseView("add")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-300 transition-all text-left"
                  >
                    <span className="text-3xl">➕</span>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{isRTL ? "إضافة بطاقة جديدة" : "Add New Tile"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{isRTL ? "أضف بطاقة مخصصة إلى أي فئة" : "Add a custom tile to any category"}</p>
                    </div>
                  </button>

                  {/* Grid size — always accessible from menu */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-700">{isRTL ? "عدد البطاقات في العمود" : "Tiles per column"}</p>
                    <div role="group" aria-label={isRTL ? "عدد البطاقات في العمود" : "Tiles per column"} className="flex gap-2">
                      {[3, 4, 5, 6, 8].map(n => (
                        <button key={n} aria-pressed={tilesPerColumn === n} onClick={() => setTilesPerColumn(n)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${tilesPerColumn === n ? "bg-blue-600 text-white border-blue-600 shadow-[inset_0_0_0_3px_#fff]" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Arrange view (grid size only — reorder/hide is on the board) ── */}
              {customiseView === "arrange" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">{isRTL ? "عدد البطاقات في العمود" : "Tiles per column"}</p>
                    <div role="group" aria-label={isRTL ? "عدد البطاقات في العمود" : "Tiles per column"} className="flex gap-2">
                      {[3, 4, 5, 6, 8].map(n => (
                        <button key={n} aria-pressed={tilesPerColumn === n} onClick={() => setTilesPerColumn(n)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${tilesPerColumn === n ? "bg-blue-600 text-white border-blue-600 shadow-[inset_0_0_0_3px_#fff]" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Add Tile view ── */}
              {customiseView === "add" && (
                <div className="space-y-5">

                {/* 1. Category */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{isRTL ? "الفئة" : "Category"}</p>
                  <div role="group" aria-label={isRTL ? "الفئة" : "Category"} className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} aria-pressed={customCategory === cat.id} onClick={() => setCustomCategory(cat.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${CATEGORY_COLORS[cat.id] ?? ""} ${customCategory === cat.id ? "ring-2 ring-blue-500 ring-offset-1" : ""} text-slate-700`}>
                        <SelectedTick on={customCategory === cat.id} />
                        {getCatLabel(cat.id)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Icon type */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{isRTL ? "نوع الأيقونة" : "Icon type"}</p>
                  <div role="group" aria-label={isRTL ? "نوع الأيقونة" : "Icon type"} className="flex rounded-2xl overflow-hidden border border-slate-200">
                    {([
                      { id: "emoji",     en: "🔤 Emoji",     ar: "🔤 رمز"      },
                      { id: "photo",     en: "📷 Photo",     ar: "📷 صورة"     },
                      { id: "generated", en: "🖼️ Generated", ar: "🖼️ مُولَّد" },
                    ] as const).map(opt => (
                      <button key={opt.id} aria-pressed={customIconType === opt.id} onClick={() => { setCustomIconType(opt.id); setCustomImageUrl(""); stopCustomCamera(); }}
                        className={`inline-flex items-center justify-center gap-1 flex-1 py-2 text-xs font-semibold transition-colors ${customIconType === opt.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                        <SelectedTick on={customIconType === opt.id} />
                        {isRTL ? opt.ar : opt.en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Icon content */}
                {customIconType === "emoji" && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">{isRTL ? "أدخل الرمز التعبيري" : "Enter emoji"}</p>
                    <Input
                      value={customEmoji}
                      onChange={e => setCustomEmoji(e.target.value)}
                      placeholder={isRTL ? "مثال: 🌟" : "e.g. 🌟"}
                      className="rounded-xl text-2xl text-center h-14"
                    />
                  </div>
                )}

                {customIconType === "photo" && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">{isRTL ? "الصورة" : "Photo"}</p>
                    {customImageUrl ? (
                      <div className="space-y-2">
                        <img src={customImageUrl} className="w-20 h-20 rounded-2xl object-cover border" alt="custom" />
                        <button onClick={() => setCustomImageUrl("")}
                          className="text-xs text-red-500 hover:underline">
                          {isRTL ? "إزالة" : "Remove"}
                        </button>
                      </div>
                    ) : customCameraOn ? (
                      <div className="space-y-2">
                        <div className="relative rounded-2xl overflow-hidden border bg-black">
                          <video ref={customVideoRef} autoPlay playsInline muted style={{ transform: "scaleX(-1)" }} className="w-full" />
                          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4">
                            <button onClick={stopCustomCamera}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white">
                              <CameraOff className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (!customVideoRef.current || !customCanvasRef.current) return;
                                const c = customCanvasRef.current;
                                const v = customVideoRef.current;
                                c.width = v.videoWidth; c.height = v.videoHeight;
                                const ctx = c.getContext("2d")!;
                                ctx.translate(c.width, 0); ctx.scale(-1, 1);
                                ctx.drawImage(v, 0, 0);
                                setCropSrc(c.toDataURL("image/jpeg", 0.85));
                                setCropPos({ x: 0, y: 0 }); setCropZoom(1);
                                setShowCropModal(true);
                                stopCustomCamera();
                              }}
                              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/30 backdrop-blur-sm">
                              <div className="h-12 w-12 rounded-full bg-white" />
                            </button>
                          </div>
                        </div>
                        <canvas ref={customCanvasRef} className="hidden" />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-sm text-slate-600 cursor-pointer hover:bg-blue-50 transition-colors">
                          📁 {isRTL ? "تحميل" : "Upload"}
                          <input ref={customFileRef} type="file" accept="image/*" className="hidden"
                            onChange={async e => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const src = await toBase64(f);
                              setCropSrc(src); setCropPos({ x: 0, y: 0 }); setCropZoom(1);
                              setShowCropModal(true);
                            }} />
                        </label>
                        <button
                          onClick={async () => {
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
                              setCustomCameraStream(stream); setCustomCameraOn(true);
                            } catch { alert("Could not access camera."); }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                          <Camera className="h-4 w-4" /> {isRTL ? "كاميرا" : "Camera"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {customIconType === "generated" && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">{isRTL ? "اختر صورة مُولَّدة" : "Pick a generated image"}</p>
                    {recentGenerations.flatMap(g => g.images).length === 0 ? (
                      <p className="text-xs text-slate-400">{isRTL ? "لا توجد صور بعد — ولّد صورة أولاً" : "No generated images yet — generate one first"}</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "none" } as CSSProperties}>
                        {recentGenerations.flatMap(g => g.images).map((url, i) => (
                          <button key={i} onClick={() => setCustomImageUrl(url)}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${customImageUrl === url ? "border-blue-500 ring-2 ring-blue-300" : "border-transparent hover:border-blue-300"}`}>
                            <img src={url} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Labels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "الاسم (EN) *" : "Label (EN) *"}</Label>
                    <Input lang="en" value={customLabelEn} onChange={e => setCustomLabelEn(e.target.value)}
                      placeholder={isRTL ? "مثال: نجمة" : "e.g. Star"} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "الاسم (AR)" : "Label (AR)"}</Label>
                    <Input dir="rtl" lang="ar" value={customLabelAr} onChange={e => setCustomLabelAr(e.target.value)}
                      placeholder="مثال: نجمة" className="rounded-xl" />
                  </div>
                </div>

                {/* Preview */}
                {(customEmoji || customImageUrl) && customLabelEn && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">{isRTL ? "معاينة" : "Preview"}</p>
                    <div className={`w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center p-1 ${CATEGORY_COLORS[customCategory] ?? "bg-slate-50 border-slate-200"}`}>
                      {customImageUrl
                        ? <img src={customImageUrl} className="w-10 h-10 object-cover rounded-lg" alt="" />
                        : <span className="text-3xl">{customEmoji}</span>
                      }
                      <span className="text-xs font-semibold text-slate-700 text-center leading-tight mt-1 w-full line-clamp-2 break-words px-0.5">
                        {customLabelEn}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full rounded-full bg-blue-600 hover:bg-blue-700 py-6 font-bold"
                  disabled={(!customEmoji && !customImageUrl) || !customLabelEn.trim()}
                  onClick={addCustomTile}
                >
                  {isRTL ? "إضافة إلى اللوحة" : "Add to Board"}
                </Button>
              </div>
              )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ CHILD MODE ══════════════════ */}
      {mode === "child" && (
        <div className="flex flex-col h-dvh overflow-hidden">
          {/* Always mounted so screen readers announce each change in generation status */}
          <div role="status" aria-live="polite" className="sr-only">{genStatus}</div>
          <a
            href="#board"
            onClick={e => { e.preventDefault(); document.getElementById("board")?.focus(); }}
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-blue-700 focus:text-white focus:font-bold focus:shadow-lg"
          >
            {isRTL ? "تخطَّ إلى اللوحة" : "Skip to board"}
          </a>
          <h1 className="sr-only">{isRTL ? "لوحة التواصل VocalAI" : "VocalAI AAC board"}</h1>

          {/* ── Top nav bar ── */}
          <header dir="ltr" className={`shrink-0 bg-white border-b border-slate-100 py-3 flex items-center shadow-sm z-10 ${isPhone ? "px-2 gap-1.5" : "px-4 gap-3"}`}>
            {/* Lock — LEFT */}
            <button
              onClick={() => { setShowPinModal(true); setPinInput(""); setPinError(false); }}
              className={`shrink-0 h-10 flex items-center gap-1.5 ${isPhone ? "px-2" : "px-3"} rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow-sm`}
            >
              <Lock className="h-5 w-5" aria-hidden="true" />
              {isRTL ? "مقدم الرعاية" : "Carer"}
            </button>

            {/* Context — CENTER */}
            <div className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 min-w-0 ${isPhone ? "invisible" : ""}`}>
              {/* Location display hidden for now — locationLabel is still fetched and sent as image-generation context.
              {locationLabel && (
                <span className="flex items-center gap-1 truncate">
                  <span>📍</span>
                  <span className="truncate">{locationLabel}</span>
                </span>
              )}
              {locationLabel && timeLabel && <span className="text-slate-300 shrink-0">·</span>}
              */}
              {timeLabel && (
                <span className="flex items-center gap-1 shrink-0">
                  <span>🕐</span>
                  <span>{timeLabel}</span>
                </span>
              )}
              {!timeLabel && (
                <span className="text-slate-400 text-xs">
                  {isRTL ? "مساعد التواصل" : "AAC Communication"}
                </span>
              )}
            </div>

            {/* Language + History — RIGHT (or Done button in arrange mode) */}
            {isArrangingCategories ? (
              <button
                onClick={() => { setDraggedCatId(null); setDragOverCatId(null); setIsArrangingCategories(false); }}
                className="px-5 py-2 rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-bold transition-colors shadow-sm shrink-0"
              >
                {isRTL ? "✓ تم" : "✓ Done"}
              </button>
            ) : (
              <div className={`flex items-center shrink-0 ${isPhone ? "gap-1.5" : "gap-2"}`}>
                <button
                  onClick={() => setShowHistoryGallery(true)}
                  className={`h-10 ${isPhone ? "px-2" : "px-3"} rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-1.5 text-white text-sm font-semibold transition-colors shadow-sm`}
                >
                  <HistoryIcon className="h-5 w-5" aria-hidden="true" />
                  {isRTL ? "السجل" : "History"}
                </button>
                <button
                  onClick={() => setShowLibraryGallery(true)}
                  className={`h-10 ${isPhone ? "px-2" : "px-3"} rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-1.5 text-white text-sm font-semibold transition-colors shadow-sm`}
                >
                  <span className="text-lg leading-none" aria-hidden="true">📁</span>
                  {isRTL ? "المكتبة" : "Library"}
                </button>
                <button
                  onClick={() => setLanguage(isRTL ? "en" : "ar")}
                  lang={isRTL ? "en" : "ar"}
                  className={`${isPhone ? "px-3" : "px-4"} py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold transition-colors shadow-sm`}
                >
                  {isRTL ? "EN" : "عربي"}
                </button>
              </div>
            )}
          </header>

          {/* ── Sentence builder bar ── */}
          <div
            role="region"
            aria-label={isRTL ? "الرسالة" : "Message"}
            className={`shrink-0 bg-white border-b border-slate-100 flex items-stretch shadow-sm transition-opacity ${isPhone ? "flex-wrap px-2 py-2 gap-1.5" : "px-3 py-2.5 gap-2"} ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}
          >
            <h2 className="sr-only">{isRTL ? "الرسالة" : "Message"}</h2>
            {/* Text mode toggle button */}
            <button
              onClick={() => {
                if (textMode) { setTextMode(false); return; }
                // Render the input synchronously and focus it within the tap — iPadOS only opens its keyboard on a gesture-driven focus.
                flushSync(() => setTextMode(true));
                freeTextRef.current?.focus();
              }}
              className={`${isPhone ? "flex-1 h-14" : "shrink-0 w-14"} rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all text-slate-700 ${textMode ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-200 hover:bg-orange-50 hover:border-orange-200"}`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">{textMode ? "😊" : "⌨️"}</span>
              <span className="text-xs font-semibold leading-none">
                {textMode ? (isRTL ? "البطاقات" : "Tiles") : (isRTL ? "اكتب" : "Type")}
              </span>
            </button>

            {/* Word strip — always shows tile chips; inline text input appended when keyboard is on */}
            <div
              ref={wordStripRef}
              onClick={e => { if ((e.target as HTMLElement).closest("span[data-tile],button[data-tile],input") === null) speakSentence(); }}
              style={{ scrollbarWidth: "none" } as CSSProperties}
              className={`${isPhone ? "basis-full order-first" : "flex-1"} min-w-0 h-[80px] rounded-2xl border-2 px-3 py-2 flex items-center gap-2.5 flex-nowrap overflow-x-auto overflow-y-hidden cursor-pointer transition-all
                ${textMode
                  ? "bg-orange-50 border-orange-200 hover:border-orange-300"
                  : "bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300"}`}
            >
              {selectedTiles.length === 0 && !freeText.trim() && !textMode && (
                <span className="text-sm text-slate-400 select-none">
                  {isRTL ? "اضغط على بطاقة لبناء رسالتك…" : "Tap a tile to build your message…"}
                </span>
              )}
              {selectedTiles.map((tile, i) => (
                <motion.span
                  data-tile
                  key={`${tile.en}-${i}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={e => { e.stopPropagation(); removeTileAt(i); }}
                  className="relative inline-flex flex-col items-center justify-center min-w-[52px] min-h-[44px] rounded-xl bg-white border border-blue-200 shadow-sm ps-2 pe-4 py-1 shrink-0 cursor-pointer hover:bg-red-50 hover:border-red-300 active:scale-90 transition-all"
                >
                  {tile.imageUrl
                    ? <img src={tile.imageUrl} className="w-7 h-7 object-contain rounded-md" alt="" />
                    : tile.emoji && <span className="text-lg leading-none" aria-hidden="true">{tile.emoji}</span>
                  }
                  <span className="text-base text-slate-700 font-semibold leading-none whitespace-nowrap mt-0.5">
                    {isRTL ? tile.ar : tile.en}
                  </span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeTileAt(i); }}
                    aria-label={isRTL ? `إزالة ${tile.ar}` : `Remove ${tile.en}`}
                    className="absolute -top-1.5 -end-1.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow ring-2 ring-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
                  </button>
                </motion.span>
              ))}
              {/* Typed text shown as a chip when keyboard is hidden but freeText exists */}
              {!textMode && freeText.trim() && (
                <span
                  data-tile
                  className="relative inline-flex items-center gap-1 min-w-[52px] min-h-[44px] rounded-xl bg-orange-50 border border-orange-200 shadow-sm ps-2 pe-5 py-1 shrink-0 text-base font-semibold text-orange-700"
                >
                  <span aria-hidden="true">⌨️</span> {freeText.trim()}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setFreeText(""); }}
                    aria-label={isRTL ? `إزالة ${freeText.trim()}` : `Remove ${freeText.trim()}`}
                    className="absolute -top-1.5 -end-1.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow ring-2 ring-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
                  </button>
                </span>
              )}
              {/* Inline text input when keyboard is on */}
              {textMode && (
                <input
                  ref={freeTextRef}
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); speakSentence(); } }}
                  onClick={e => e.stopPropagation()}
                  placeholder={isRTL ? "اكتب هنا…" : "Type here…"}
                  className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                  dir={isRTL ? "rtl" : "ltr"}
                  autoComplete="off"
                />
              )}
            </div>

            {/* Action buttons: speak, delete last, clear all, generate */}
            <div className={`flex gap-1.5 ${isPhone ? "flex-[4] items-stretch" : "items-center shrink-0"}`}>
              <button
                onClick={speakSentence}
                disabled={selectedTiles.length === 0 && !freeText.trim()}
                className={`${isPhone ? "flex-1 h-14" : "w-14 h-full"} rounded-2xl bg-slate-100 hover:bg-blue-100 active:bg-blue-200 disabled:opacity-30 flex flex-col items-center justify-center gap-1 transition-colors group text-slate-700`}
              >
                <Volume2 className="h-6 w-6 text-slate-600 group-hover:text-blue-600 transition-colors" aria-hidden="true" />
                <span className="text-xs font-semibold leading-none">{isRTL ? "انطق" : "Speak"}</span>
              </button>
              <button
                onClick={() => {
                  if (freeText.length > 0) {
                    setFreeText(prev => prev.slice(0, -1));
                    return;
                  }
                  const last = selectedTiles[selectedTiles.length - 1];
                  removeTileAt(selectedTiles.length - 1);
                  // A typed word goes back to the typing area minus one letter, so it can be corrected letter by letter.
                  if (last?.typed) setFreeText(last.en.slice(0, -1));
                }}
                disabled={selectedTiles.length === 0 && !freeText.trim()}
                className={`${isPhone ? "flex-1 h-14" : "w-14 h-full"} rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 flex flex-col items-center justify-center gap-1 transition-colors text-slate-700`}
              >
                <BackspaceIcon className={`h-6 w-6 text-slate-600 ${isRTL ? "-scale-x-100" : ""}`} aria-hidden="true" />
                <span className="text-xs font-semibold leading-none">{isRTL ? "حذف" : "Delete"}</span>
              </button>
              <button
                onClick={clearAll}
                disabled={selectedTiles.length === 0 && !freeText.trim()}
                className={`${isPhone ? "flex-1 h-14" : "w-14 h-full"} rounded-2xl bg-slate-100 hover:bg-red-100 active:bg-red-200 disabled:opacity-30 flex flex-col items-center justify-center gap-1 transition-colors group text-slate-700`}
              >
                <X className="h-6 w-6 text-slate-600 group-hover:text-red-500 transition-colors" aria-hidden="true" />
                <span className="text-xs font-semibold leading-none">{isRTL ? "مسح" : "Clear"}</span>
              </button>
              <button
                onClick={handleGenerate}
                aria-disabled={genBlockedReason !== null}
                aria-describedby={genBlockedReason ? "gen-blocked-reason" : undefined}
                className={`${isPhone ? "flex-1 h-14" : "w-14 h-full"} rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 flex flex-col items-center justify-center gap-1 transition-colors shadow-md shadow-blue-200 text-white ${genBlockedReason ? "opacity-30" : ""}`}
              >
                {isGenerating
                  ? <RefreshCw className="h-6 w-6 animate-spin" aria-hidden="true" />
                  : <span className="text-2xl leading-none" aria-hidden="true">✨</span>
                }
                <span className="text-xs font-semibold leading-none">{isRTL ? "صورة" : "Picture"}</span>
              </button>
              <span id="gen-blocked-reason" className="sr-only">
                {genBlockedReason ? genHintText(genBlockedReason) : ""}
              </span>
            </div>
          </div>

          {/* ── Main 3-column area ── */}
          <div className={`flex-1 flex overflow-hidden min-h-0 ${isPhone || isStacked ? "flex-col" : ""}`}>

            {/* Left: tile board — ~70% of area */}
            <div id="board" role="main" tabIndex={-1} className="flex flex-col overflow-hidden min-w-0 min-h-0 outline-none" style={isStacked ? { flex: "none", height: stackedBoardHeight, maxHeight: "65%" } : { flex: isPhone ? 1 : 7 }}>
              <h2 className="sr-only">{isRTL ? "اللوحة" : "Board"}</h2>
              <> {/* Category headers */}
              <div className={`shrink-0 border-b border-slate-100 bg-white ${isArrangingCategories ? "p-2 space-y-2" : ""}`}>
                {/* Arrange mode instruction strip */}
                {isArrangingCategories && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-slate-500 font-medium">
                      {isRTL
                        ? <>اسحب للترتيب · اضغط <Eye className="inline h-3 w-3 align-[-2px]" role="img" aria-label={isRTL ? "العين" : "eye"} /> للإخفاء أو الإظهار</>
                        : <>Drag to reorder · tap <Eye className="inline h-3 w-3 align-[-2px]" role="img" aria-label={isRTL ? "العين" : "eye"} /> to show/hide</>}
                    </p>
                    {/* Grid size inline picker */}
                    <div role="group" aria-label={isRTL ? "عدد البطاقات في العمود" : "Tiles per column"} className="flex gap-1 items-center">
                      <span className="text-xs text-slate-500 font-medium">{isRTL ? "صفوف:" : "Rows:"}</span>
                      {[3, 4, 5, 6, 8].map(n => (
                        <button key={n} aria-pressed={tilesPerColumn === n} onClick={() => setTilesPerColumn(n)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${tilesPerColumn === n ? "bg-blue-600 text-white border-blue-600 shadow-[inset_0_0_0_2px_#fff]" : "bg-white text-slate-500 border-slate-200"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chips row */}
                <div className={`flex gap-1.5 px-2 pb-2 ${isArrangingCategories ? "pt-0" : "pt-2"} ${isPhone ? "overflow-x-auto [scrollbar-width:none]" : ""}`}>
                  {(isArrangingCategories ? categoryOrder : visibleCategories.map(c => c.id)).map(id => {
                    const cat = CATEGORIES.find(c => c.id === id);
                    if (!cat) return null;
                    const colors = CATEGORY_COLORS[cat.id] ?? "bg-slate-50 border-slate-200";
                    const isHidden = hiddenCategories.includes(id);
                    const isSelected = shownCategory === cat.id;
                    const isDragOver = dragOverCatId === id;

                    if (isArrangingCategories) {
                      return (
                        <div
                          key={id}
                          draggable
                          onDragStart={() => setDraggedCatId(id)}
                          onDragOver={e => { e.preventDefault(); setDragOverCatId(id); }}
                          onDrop={() => {
                            if (!draggedCatId || draggedCatId === id) return;
                            setCategoryOrder(prev => {
                              const next = [...prev];
                              const from = next.indexOf(draggedCatId);
                              const to = next.indexOf(id);
                              next.splice(from, 1);
                              next.splice(to, 0, draggedCatId);
                              return next;
                            });
                            setDraggedCatId(null);
                            setDragOverCatId(null);
                          }}
                          onDragEnd={() => { setDraggedCatId(null); setDragOverCatId(null); }}
                          className={`${isPhone ? "shrink-0 w-24" : "flex-1 min-w-0"} flex flex-col items-center gap-0.5 rounded-2xl py-1.5 px-1 border-2 cursor-grab active:cursor-grabbing transition-all select-none
                            ${isHidden ? "opacity-40" : ""}
                            ${isDragOver ? "ring-2 ring-blue-500 scale-105" : ""}
                            ${draggedCatId === id ? "opacity-50 scale-95" : ""}
                            ${colors}`}
                        >
                          <div className="flex gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); toggleHideCategory(id); }}
                              className="w-6 h-6 rounded-lg bg-white/80 hover:bg-white border border-slate-300 flex items-center justify-center text-slate-700"
                              onMouseDown={e => e.stopPropagation()}
                              aria-label={isHidden
                                ? (isRTL ? `إظهار ${getCatLabel(id)}` : `Show ${getCatLabel(id)}`)
                                : (isRTL ? `إخفاء ${getCatLabel(id)}` : `Hide ${getCatLabel(id)}`)}
                            >
                              {isHidden
                                ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const base = CATEGORIES.find(c => c.id === id);
                                setRenameDraftEn(categoryLabels[id]?.en || base?.enLabel || "");
                                setRenameDraftAr(categoryLabels[id]?.ar || base?.arLabel || "");
                                setRenamingCatId(id);
                              }}
                              className="w-6 h-6 rounded-lg bg-white/80 hover:bg-white border border-slate-300 flex items-center justify-center text-slate-700"
                              onMouseDown={e => e.stopPropagation()}
                              aria-label={isRTL ? `إعادة تسمية ${getCatLabel(id)}` : `Rename ${getCatLabel(id)}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-slate-700 text-center leading-tight break-words w-full">
                            {getCatLabel(cat.id)}
                          </span>
                          {/* dir="ltr" keeps the arrows in visual order; in Arabic the board runs right-to-left, so "left" means later. */}
                          <div dir="ltr" className="flex gap-1">
                            {(["left", "right"] as const).map(side => {
                              const idx = categoryOrder.indexOf(id);
                              const movesEarlier = (side === "left") !== isRTL;
                              const atEnd = movesEarlier ? idx <= 0 : idx >= categoryOrder.length - 1;
                              return (
                                <button
                                  key={side}
                                  onClick={e => { e.stopPropagation(); if (movesEarlier) moveCategoryUp(id); else moveCategoryDown(id); }}
                                  onMouseDown={e => e.stopPropagation()}
                                  disabled={atEnd}
                                  className="w-6 h-6 rounded-lg bg-white/80 hover:bg-white border border-slate-300 flex items-center justify-center text-slate-700 disabled:opacity-30"
                                  aria-label={side === "left"
                                    ? (isRTL ? `تحريك ${getCatLabel(id)} لليسار` : `Move ${getCatLabel(id)} left`)
                                    : (isRTL ? `تحريك ${getCatLabel(id)} لليمين` : `Move ${getCatLabel(id)} right`)}
                                >
                                  {side === "left"
                                    ? <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                    : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={id}
                        onClick={() => setExpandedCategory(isSelected && !isPhone ? null : cat.id)}
                        aria-pressed={isSelected}
                        className={`${isPhone ? "shrink-0 px-4 whitespace-nowrap" : "flex-1 min-w-0 px-1"} rounded-2xl text-[13px] leading-tight break-words font-bold text-center transition-all active:scale-95 text-slate-700 ${
                          isSelected
                            ? `${colors.replace(/\S*border-\S+/g, "")} border-[3px] border-blue-600 py-[7px] shadow-md`
                            : `${colors} border-2 py-2`
                        }`}
                      >
                        {getCatLabel(cat.id)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emoji area */}
              <div
                className={`flex-1 min-h-0 overflow-hidden p-2 transition-opacity ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}
                style={{ containerType: "size" } as CSSProperties}
              >
                {shownCategory === null ? (
                  /* Home: square tiles shrink to fit the board so it never scrolls */
                  <div
                    style={{
                      "--tile": `min((100cqw - ${(visibleCategories.length - 1) * 6}px) / ${Math.max(visibleCategories.length, 1)}, (100cqh - ${(tilesPerColumn - 1) * 6}px) / ${tilesPerColumn})`,
                      display: "flex",
                      justifyContent: "center",
                      gap: "6px",
                    } as CSSProperties}
                  >
                    {visibleCategories.map(cat => {
                      const colors = CATEGORY_COLORS[cat.id] ?? "bg-slate-50 hover:bg-slate-100 border-slate-200";
                      return (
                      <div
                        key={cat.id}
                        role="group"
                        aria-label={getCatLabel(cat.id)}
                        style={{
                          display: "grid",
                          gridTemplateRows: `repeat(${tilesPerColumn}, var(--tile))`,
                          width: "var(--tile)",
                          gap: "6px",
                        }}
                      >
                      {getTilesForCategory(cat.id).slice(0, tilesPerColumn).map((tile, i) => (
                        <button
                          key={`${cat.id}-${i}`}
                          onClick={() => {
                            if (longPressActiveRef.current) return;
                            if (tile.storyImages?.length) { setViewingStory(tile); return; }
                            addTile(tile);
                          }}
                          {...tilePointerProps(tile, cat.id)}
                          className={`rounded-xl border-2 ${colors} flex flex-col items-center justify-between p-1 active:scale-90 transition-all shadow-sm overflow-hidden`}
                        >
                          <div className="flex-1 flex items-center justify-center min-h-0 relative w-full">
                            {tile.imageUrl
                              ? <>
                                  <img src={tile.imageUrl} className="w-full h-full object-contain rounded-lg" alt="" />
                                  {tile.storyImages?.length && (
                                    <span className="absolute top-0.5 right-0.5 bg-white/80 rounded-full text-xs leading-none px-1 py-0.5 font-bold text-slate-600 shadow-sm">📚</span>
                                  )}
                                </>
                              : <span className="leading-none" style={{ fontSize: "calc(var(--tile) * 0.42)" }}>{tile.emoji}</span>
                            }
                          </div>
                          <span
                            className="shrink-0 font-semibold text-slate-700 text-center leading-tight w-full px-0.5 line-clamp-2 break-words"
                            style={{ fontSize: "clamp(12px, calc(var(--tile) * 0.11), 16px)" }}
                          >
                            {isRTL ? tile.ar : tile.en}
                          </span>
                        </button>
                      ))}
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Expanded: all tiles in a scrollable grid */
                  <div
                    className="h-full overflow-y-auto"
                    style={{ scrollbarWidth: "none" } as CSSProperties}
                  >
                  <h2 className="sr-only">{getCatLabel(shownCategory)}</h2>
                  <div
                    className="gap-1.5"
                    style={{
                      "--tile": isPhone ? "104px" : `calc((100cqw - ${(visibleCategories.length - 1) * 6}px) / ${Math.max(visibleCategories.length, 1)})`,
                      display: "grid",
                      gridTemplateColumns: isPhone ? "repeat(auto-fill, minmax(96px, 1fr))" : `repeat(${visibleCategories.length}, var(--tile))`,
                      justifyContent: "center",
                      direction: isRTL ? "rtl" : "ltr",
                    } as CSSProperties}
                  >
                    {getTilesForCategory(shownCategory).map((tile, i) => {
                      const colors = CATEGORY_COLORS[shownCategory] ?? "bg-slate-50 border-slate-200";
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (longPressActiveRef.current) return;
                            if (tile.storyImages?.length) { setViewingStory(tile); return; }
                            addTile(tile);
                          }}
                          {...tilePointerProps(tile, shownCategory)}
                          className={`w-full aspect-square rounded-2xl border-2 ${colors} flex flex-col items-center justify-between p-1 active:scale-90 transition-all shadow-sm overflow-hidden`}
                        >
                          <div className="flex-1 flex items-center justify-center min-h-0 relative w-full">
                            {tile.imageUrl
                              ? <>
                                  <img src={tile.imageUrl} className="w-full h-full object-contain rounded-lg" alt="" />
                                  {tile.storyImages?.length && (
                                    <span className="absolute top-0.5 right-0.5 bg-white/80 rounded-full text-xs leading-none px-1 py-0.5 font-bold text-slate-600 shadow-sm">📚</span>
                                  )}
                                </>
                              : <span className="leading-none" style={{ fontSize: "calc(var(--tile) * 0.42)" }}>{tile.emoji}</span>
                            }
                          </div>
                          <span
                            className="shrink-0 font-semibold text-slate-700 text-center leading-tight w-full px-0.5 line-clamp-2 break-words"
                            style={{ fontSize: "clamp(12px, calc(var(--tile) * 0.11), 16px)" }}
                          >
                            {isRTL ? tile.ar : tile.en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  </div>
                )}
              </div>
            </>
            </div>

            {/* Middle: connector word sidebar */}
            <div
              className={`shrink-0 border-slate-100 bg-white flex gap-1.5 p-1.5 transition-opacity ${isPhone || isStacked ? "w-full h-14 border-y flex-row overflow-x-auto" : "w-16 border-x flex-col overflow-y-auto"} ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}
              style={{ scrollbarWidth: "none" } as CSSProperties}
            >
              {CONNECTORS.map(word => (
                <button
                  key={word.en}
                  onClick={() => addTile({ emoji: "", en: word.en, ar: word.ar })}
                  className={`${isPhone || isStacked ? "shrink-0 px-3" : "w-full px-0.5"} rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 active:scale-90 border border-slate-200 transition-all py-2 text-center`}
                >
                  <span className="block text-xs font-bold text-slate-700 leading-tight break-words">
                    {isRTL ? word.ar : word.en}
                  </span>
                </button>
              ))}
            </div>

            {/* Right: image panel — ~30% of area */}
            <div
              role="complementary"
              aria-label={isRTL ? "الصورة" : "Image"}
              className={`flex flex-col bg-slate-50 overflow-hidden transition-opacity ${isPhone ? "fixed inset-0 z-40" : isStacked ? "border-t border-slate-100" : "border-x border-slate-100"} ${isPhone && !phoneImageOpen ? "hidden" : ""} ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}
              style={isPhone ? undefined : { flex: isStacked ? 1 : 3, minHeight: 0 }}
            >
              <h2 className="sr-only">{isRTL ? "الصورة" : "Image"}</h2>
              {isPhone && (
                <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-white border-b border-slate-100">
                  <span className="font-bold text-slate-800">{isRTL ? "الصورة" : "Picture"}</span>
                  <button
                    onClick={() => setPhoneImageOpen(false)}
                    className="h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center gap-1.5 text-sm font-semibold text-slate-700"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                    {isRTL ? "إغلاق" : "Close"}
                  </button>
                </div>
              )}
              {/* Mode + style selectors */}
              <div className="shrink-0 p-2 border-b border-slate-100 bg-white space-y-1.5">
                <div role="group" aria-label={isRTL ? "نوع الصورة" : "Image mode"} className="flex rounded-xl overflow-hidden border border-slate-200">
                  {[
                    { id: "single", en: "Single", ar: "واحدة" },
                    { id: "story",  en: "Story",  ar: "قصة"   },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      aria-pressed={imageMode === opt.id}
                      onClick={() => setImageMode(opt.id as "single" | "story")}
                      className={`inline-flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-semibold transition-colors ${
                        imageMode === opt.id
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <SelectedTick on={imageMode === opt.id} />
                      {isRTL ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
                <div role="group" aria-label={isRTL ? "نمط الصورة" : "Image style"} className="flex rounded-xl overflow-hidden border border-slate-200">
                  {STYLE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      aria-pressed={imageStyle === opt.id}
                      onClick={() => setImageStyle(opt.id)}
                      className={`inline-flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-semibold transition-colors ${
                        imageStyle === opt.id
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <SelectedTick on={imageStyle === opt.id} />
                      {isRTL ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
                <button
                  aria-pressed={hideCharacter}
                  onClick={() => setHideCharacter(v => !v)}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-1 text-xs font-semibold transition-colors ${
                    hideCharacter
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <SelectedTick on={hideCharacter} />
                  <span aria-hidden="true">🚫</span>
                  {isRTL ? "عدم تضمين المستخدم في الصورة" : "Don't include user in image"}
                </button>
              </div>


              {/* Image display */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: "none" } as CSSProperties}>
                {/* Error state */}
                {!isGenerating && genFailed && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 gap-3">
                    <div aria-hidden="true" className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-3xl">
                      ⚠️
                    </div>
                    <p className="text-xs text-red-700 font-semibold leading-relaxed">
                      {isRTL ? "تعذّر توليد الصورة" : "Couldn't generate the image"}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {isRTL ? "اضغط ✨ للمحاولة مرة أخرى" : "Tap ✨ to try again"}
                    </p>
                  </div>
                )}

                {/* Empty state */}
                {!isGenerating && !genFailed && generatedImages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">
                      🖼️
                    </div>
                    {activeGenHint ? (
                      <motion.p
                        key={activeGenHint.n}
                        initial={{ scale: 0.92 }}
                        animate={{ scale: [1.08, 1] }}
                        transition={{ duration: 0.35 }}
                        className="text-sm text-amber-900 font-semibold leading-relaxed bg-amber-50 border-2 border-amber-300 rounded-xl px-3 py-2"
                      >
                        {genHintText(activeGenHint.reason)}
                      </motion.p>
                    ) : (
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {isRTL
                          ? "اختر كلمات واضغط ✨ صورة"
                          : "Select words and tap ✨ Picture"}
                      </p>
                    )}
                  </div>
                )}

                {/* Loading */}
                {isGenerating && (
                  imageMode === "story" ? (
                    <div aria-hidden="true" className="grid grid-cols-2 gap-1.5">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="rounded-2xl aspect-square flex flex-col items-center justify-center gap-1.5"
                          style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)" }}
                        >
                          <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
                          <span className="text-xs text-blue-500 font-semibold">
                            {isRTL ? "جارٍ التوليد…" : "Generating…"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="rounded-2xl aspect-square flex flex-col items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)" }}
                    >
                      <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
                      <span className="text-xs text-blue-500 font-semibold">
                        {isRTL ? "جارٍ التوليد…" : "Generating…"}
                      </span>
                    </div>
                  )
                )}

                {/* Caption */}
                {!isGenerating && caption && (
                  <p
                    className="shrink-0 text-sm font-semibold text-slate-700 text-center px-1 leading-snug"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {caption}
                  </p>
                )}

                {/* Images */}
                {!isGenerating && generatedImages.length > 0 && (
                  imageMode === "story" ? (
                    /* ── Story 2×2 grid + batch save ── */
                    <>
                      <div className={`grid gap-1.5 ${isStacked ? "grid-cols-4" : "grid-cols-2"}`}>
                        {generatedImages.map((img, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white"
                          >
                            <img
                              src={img.url}
                              alt={img.label ?? caption}
                              className="w-full h-auto block"
                            />
                            {img.label && (
                              <p className="absolute top-0 inset-x-0 text-xs font-semibold text-white bg-black/50 text-center px-1 py-0.5 leading-tight line-clamp-2 break-words">
                                {img.label}
                              </p>
                            )}
                            <button
                              onClick={() => openAddToBoard(img.url, img.label ?? selectedTiles.map(t => isRTL ? t.ar : t.en).join(" "))}
                              className="absolute bottom-1 right-1 bg-white/90 hover:bg-white active:bg-blue-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-blue-600 shadow-sm transition-all"
                            >
                              💾 {isRTL ? "حفظ" : "Save"}
                            </button>
                          </motion.div>
                        ))}
                      </div>

                      {/* Add story batch button — library only, stories aren't board tiles */}
                      {!showAddStoryPicker ? (
                        <button
                          onClick={() => setShowAddStoryPicker(true)}
                          className="w-full py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          📚 {isRTL ? "إضافة القصة إلى المكتبة" : "Add story to library"}
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-2.5">
                          <p className="text-xs font-bold text-slate-700">
                            {isRTL ? "اسم القصة" : "Story name"}
                          </p>
                          <input
                            type="text"
                            value={storyName}
                            onChange={e => setStoryName(e.target.value)}
                            placeholder={isRTL ? "مثال: روتين الصباح" : "e.g. Morning Routine"}
                            className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400"
                            dir={isRTL ? "rtl" : "ltr"}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveStoryToLibrary}
                              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-colors"
                            >
                              {isRTL ? "حفظ في المكتبة" : "Save to library"}
                            </button>
                            <button
                              onClick={() => setShowAddStoryPicker(false)}
                              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs font-bold transition-colors hover:bg-slate-50"
                            >
                              {isRTL ? "إلغاء" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ── Single image ── */
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white"
                      >
                        <img
                          src={generatedImages[0].url}
                          alt={caption}
                          className={`block ${isStacked ? "max-h-[40dvh] w-auto mx-auto" : "w-full h-auto"}`}
                        />
                      </motion.div>
                      <button
                        onClick={() => openAddToBoard(generatedImages[0].url, selectedTiles.map(t => isRTL ? t.ar : t.en).join(" "))}
                        className="shrink-0 w-full py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        💾 {isRTL ? "حفظ الصورة" : "Save image"}
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div className={`shrink-0 bg-white border-t border-slate-100 ${isPhone ? "px-2 py-2" : "px-4 py-3"} flex items-center justify-between gap-2 transition-opacity ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""} ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={() => {
                setBoardType(prev => prev === "general" ? "hospital" : "general");
                setExpandedCategory(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-semibold text-sm transition-colors border border-blue-200"
            >
              {boardType === "general"
                ? <>🏥 {isRTL ? "المستشفى" : "Hospital"}</>
                : <><Home className="h-4 w-4" /> {isRTL ? "الرئيسية" : "Home"}</>}
            </button>
            <button
              onClick={() => { setShowCustomiseModal(true); setCustomiseView("menu"); setCustomImageUrl(""); setCustomEmoji(""); setCustomLabelEn(""); setCustomLabelAr(""); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-semibold text-sm transition-colors border border-slate-200"
            >
              <Settings className="h-4 w-4" />
              {isRTL ? "تخصيص اللوحة" : "Customise Board"}
            </button>
          </div>
        {/* ── Long-press phrase combo overlay ── */}
        {longPressMenu && (
          <div
            className="fixed inset-0 z-50"
            onPointerMove={e => {
              const relY = e.clientY - longPressMenu.popupTop - COMBO_HEADER_H;
              const idx  = Math.floor(relY / COMBO_ITEM_H);
              const clamped = Math.max(0, Math.min(longPressMenu.phrases.length - 1, idx));
              setLongPressMenu(prev =>
                prev ? { ...prev, hoveredIdx: relY >= 0 && relY < longPressMenu.phrases.length * COMBO_ITEM_H ? clamped : -1 } : null
              );
            }}
            onPointerUp={() => {
              if (longPressMenu.hoveredIdx >= 0) {
                const phrase = longPressMenu.phrases[longPressMenu.hoveredIdx];
                addTile({
                  emoji:    longPressMenu.tile.emoji,
                  en:       phrase.en(longPressMenu.tile.en),
                  ar:       phrase.ar(longPressMenu.tile.ar),
                  imageUrl: longPressMenu.tile.imageUrl,
                });
              }
              longPressActiveRef.current = false;
              setLongPressMenu(null);
            }}
            onPointerCancel={() => { longPressActiveRef.current = false; setLongPressMenu(null); }}
          >
            {/* Dim backdrop */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Tooltip bubble */}
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-visible"
              style={{ left: longPressMenu.popupLeft, top: longPressMenu.popupTop, width: 224 }}
              onPointerDown={e => e.stopPropagation()}
              onPointerUp={e => e.stopPropagation()}
            >
              {/* Tile header */}
              <div
                className="flex items-center gap-2.5 px-4 rounded-t-3xl bg-slate-50 border-b border-slate-100"
                style={{ height: COMBO_HEADER_H }}
              >
                {longPressMenu.tile.imageUrl
                  ? <img src={longPressMenu.tile.imageUrl} className="w-7 h-7 object-cover rounded-lg shrink-0" alt="" />
                  : longPressMenu.tile.emoji
                    ? <span className="text-xl shrink-0">{longPressMenu.tile.emoji}</span>
                    : null
                }
                <span className="text-sm font-bold text-slate-700 leading-tight line-clamp-2 break-words">
                  {isRTL ? longPressMenu.tile.ar : longPressMenu.tile.en}
                </span>
              </div>

              {/* Phrase options */}
              <div className="pb-2">
                {longPressMenu.phrases.map((phrase, i) => (
                  <button
                    key={i}
                    onClick={e => {
                      e.stopPropagation();
                      addTile({
                        emoji:    longPressMenu.tile.emoji,
                        en:       phrase.en(longPressMenu.tile.en),
                        ar:       phrase.ar(longPressMenu.tile.ar),
                        imageUrl: longPressMenu.tile.imageUrl,
                      });
                      longPressActiveRef.current = false;
                      setLongPressMenu(null);
                    }}
                    className={`w-full mx-2 mt-1 flex items-center px-3 rounded-2xl text-sm font-semibold transition-colors text-left
                      ${longPressMenu.hoveredIdx === i
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-700 hover:bg-blue-50'}`}
                    style={{ height: COMBO_ITEM_H - 6, width: "calc(100% - 1rem)", touchAction: "manipulation" }}
                  >
                    {isRTL ? phrase.ar(longPressMenu.tile.ar) : phrase.en(longPressMenu.tile.en)}
                  </button>
                ))}
              </div>

              {/* Downward arrow pointing at tile */}
              <div
                className="absolute bottom-0 translate-y-[7px] w-4 h-4 rotate-45 bg-white border-r border-b border-slate-100"
                style={{ left: longPressMenu.arrowLeft }}
              />
            </motion.div>
          </div>
        )}
        </div>
      )}

      {/* ══════════════════ PARENT MODE ══════════════════ */}
      {mode === "parent" && (
        <div className="flex flex-col min-h-screen">

          <header dir="ltr" className="bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400 text-white px-4 py-3 flex items-center gap-3 shadow-md sticky top-0 z-10">
            {/* Back — always LEFT */}
            <button
              onClick={returnToChild}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors shrink-0"
              aria-label={isRTL ? "العودة" : "Go back"}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 text-center font-bold text-lg">
              {isRTL ? "⚙️ إعدادات مقدم الرعاية" : "⚙️ Carer Settings"}
            </h1>
            {/* Language — always RIGHT */}
            <button
              onClick={() => setLanguage(isRTL ? "en" : "ar")}
              lang={isRTL ? "en" : "ar"}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-bold"
            >
              {isRTL ? "EN" : "عربي"}
            </button>
          </header>

          <div
            role="tablist"
            aria-label={isRTL ? "إعدادات مقدم الرعاية" : "Carer settings"}
            className={`flex bg-white/90 backdrop-blur-sm border-b sticky top-[58px] z-10 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            {PARENT_TABS.map((tab, i) => (
              <button
                key={tab}
                id={`parent-tab-${tab}`}
                role="tab"
                aria-selected={parentTab === tab}
                aria-controls={`parent-panel-${tab}`}
                tabIndex={parentTab === tab ? 0 : -1}
                onClick={() => setParentTab(tab)}
                onKeyDown={e => {
                  // RTL + flex-row-reverse keeps the visual order left-to-right, so Right is always "next"
                  const next =
                    e.key === "ArrowRight" ? (i + 1) % PARENT_TABS.length :
                    e.key === "ArrowLeft"  ? (i - 1 + PARENT_TABS.length) % PARENT_TABS.length :
                    e.key === "Home"       ? 0 :
                    e.key === "End"        ? PARENT_TABS.length - 1 : -1;
                  if (next < 0) return;
                  e.preventDefault();
                  setParentTab(PARENT_TABS[next]);
                  document.getElementById(`parent-tab-${PARENT_TABS[next]}`)?.focus();
                }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  parentTab === tab
                    ? "border-b-2 border-blue-700 text-blue-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "profile"
                  ? (isRTL ? "👤 الملف" : "👤 Profile")
                  : tab === "people"
                  ? (isRTL ? "👨 الأشخاص" : "👨 People")
                  : (
                    <span className="inline-flex items-center gap-1">
                      <HistoryIcon className="h-4 w-4" aria-hidden="true" />
                      {isRTL ? "السجل" : "History"}
                    </span>
                  )}
              </button>
            ))}
          </div>

          <div role="main" className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-24">

            {/* ── Profile tab ── */}
            {parentTab === "profile" && (
              <div role="tabpanel" id="parent-panel-profile" aria-labelledby="parent-tab-profile" className="space-y-4">
                <div className="bg-white rounded-3xl p-5 shadow-sm space-y-5">
                  <h2 className={`font-bold text-lg text-slate-800 ${isRTL ? "text-right" : ""}`}>
                    {isRTL ? "الملف الشخصي للمستخدم" : "User Profile"}
                  </h2>

                  <div className={`grid grid-cols-2 gap-3`}>
                    <div className="space-y-1">
                      <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                        {isRTL ? "الاسم" : "Name"}
                      </Label>
                      <Input
                        dir={isRTL ? "rtl" : undefined}
                        value={profile.name}
                        onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                        placeholder={isRTL ? "مثال: سارة" : "e.g. Sara"}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                        {isRTL ? "العمر" : "Age"}
                      </Label>
                      <Input
                        dir={isRTL ? "rtl" : undefined}
                        type="text" inputMode="numeric"
                        value={profile.age}
                        onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
                        placeholder={isRTL ? "مثال: ٧" : "e.g. 7"}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                        {isRTL ? "الجنس" : "Gender"}
                      </Label>
                      <div role="group" aria-label={isRTL ? "الجنس" : "Gender"} className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        {[
                          { v: "male",   en: "Male",   ar: "ذكر"  },
                          { v: "female", en: "Female", ar: "أنثى" },
                        ].map(g => (
                          <button
                            key={g.v}
                            aria-pressed={profile.gender === g.v}
                            onClick={() => setProfile(p => ({ ...p, gender: g.v }))}
                            className={`inline-flex items-center justify-center gap-1 flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                              profile.gender === g.v
                                ? "bg-blue-700 text-white border-blue-700"
                                : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
                            }`}
                          >
                            <SelectedTick on={profile.gender === g.v} />
                            {isRTL ? g.ar : g.en}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                        {isRTL ? "اللغة المفضلة" : "Language"}
                      </Label>
                      <div role="group" aria-label={isRTL ? "اللغة المفضلة" : "Language"} className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        {[
                          { v: "en", label: "English" },
                          { v: "ar", label: "عربي"    },
                        ].map(l => (
                          <button
                            key={l.v}
                            lang={l.v}
                            aria-pressed={profile.language === l.v}
                            onClick={() => setProfile(p => ({ ...p, language: l.v as "en" | "ar" }))}
                            className={`inline-flex items-center justify-center gap-1 flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                              profile.language === l.v
                                ? "bg-blue-700 text-white border-blue-700"
                                : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
                            }`}
                          >
                            <SelectedTick on={profile.language === l.v} />
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                      {isRTL ? "التشخيص (اختياري)" : "Diagnosis (optional)"}
                    </Label>
                    <div role="group" aria-label={isRTL ? "التشخيص" : "Diagnosis"} className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      {[
                        { v: "autism",         en: "Autism",         ar: "توحد"         },
                        { v: "cerebral-palsy", en: "Cerebral Palsy", ar: "شلل دماغي"    },
                        { v: "down-syndrome",  en: "Down Syndrome",  ar: "متلازمة داون" },
                        { v: "aphasia",        en: "Aphasia",        ar: "حبسة كلامية"  },
                        { v: "als",            en: "ALS",            ar: "التصلب الجانبي الضموري" },
                        { v: "other",          en: "Other",          ar: "أخرى"         },
                      ].map(c => (
                        <button
                          key={c.v}
                          aria-pressed={c.v === "other" ? isOtherCondition : profile.condition === c.v}
                          onClick={() => {
                            if (c.v === "other") {
                              setProfile(p => ({ ...p, condition: isOtherCondition ? "" : "other" }));
                            } else {
                              setProfile(p => ({ ...p, condition: p.condition === c.v ? "" : c.v }));
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                            (c.v === "other" ? isOtherCondition : profile.condition === c.v)
                              ? "bg-blue-700 text-white border-blue-700"
                              : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
                          }`}
                        >
                          <SelectedTick on={c.v === "other" ? isOtherCondition : profile.condition === c.v} />
                          {isRTL ? c.ar : c.en}
                        </button>
                      ))}
                    </div>
                    {isOtherCondition && (
                      <Input
                        autoFocus
                        dir={isRTL ? "rtl" : "ltr"}
                        value={profile.condition === "other" ? "" : profile.condition}
                        onChange={e => setProfile(p => ({ ...p, condition: e.target.value || "other" }))}
                        placeholder={isRTL ? "اكتب التشخيص هنا…" : "Type diagnosis here…"}
                        className="rounded-xl mt-1"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                      {isRTL
                        ? "صورة المستخدم — لتخصيص الصور المُولَّدة (اختياري)"
                        : "User photo — for personalizing generated images (optional)"}
                    </Label>

                    {profile.photoPreview ? (
                      <div className="space-y-2">
                        <img src={profile.photoPreview} className="w-24 h-24 rounded-2xl object-cover border" alt="user profile" />
                        {profilePhotoLoading && (
                          <p className="text-xs text-blue-700 flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            {isRTL ? "جارٍ تحليل الصورة…" : "Analyzing photo…"}
                          </p>
                        )}
                        {!profilePhotoLoading && profile.appearance && (
                          <p className="text-xs text-green-600 font-medium">
                            ✓ {isRTL ? "تم تحليل الصورة — ستُخصَّص الصور" : "Photo analyzed — images will be personalized"}
                          </p>
                        )}
                        {!profilePhotoLoading && profile.photoPreview && !profile.appearance && (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-red-500 font-medium">
                              ✗ {isRTL ? "فشل تحليل الصورة" : "Photo analysis failed"}
                            </p>
                            <button
                              onClick={() => analyzePhoto(profile.photoPreview, "profile")}
                              className="text-xs text-blue-600 underline"
                            >
                              {isRTL ? "إعادة المحاولة" : "Retry"}
                            </button>
                          </div>
                        )}
                        <Button
                          variant="outline" size="sm" className="rounded-xl text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => { setProfile(p => ({ ...p, photoPreview: "", appearance: "" })); if (profileFileRef.current) profileFileRef.current.value = ""; }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          {isRTL ? "إزالة الصورة" : "Remove photo"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!profileCameraOn ? (
                          <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-sm text-slate-600 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
                              📁 {isRTL ? "تحميل صورة" : "Upload photo"}
                              <input ref={profileFileRef} type="file" accept="image/*" className="hidden"
                                onChange={async e => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  const url = await toBase64(f);
                                  setProfile(p => ({ ...p, photoPreview: url, appearance: "" }));
                                  analyzePhoto(url, "profile");
                                }}
                              />
                            </label>
                            <Button variant="outline" className="rounded-2xl flex-1" onClick={() => startCamera("profile")}>
                              <Camera className="h-4 w-4 mr-1" />
                              {isRTL ? "كاميرا" : "Camera"}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="relative overflow-hidden rounded-2xl border bg-black">
                              <video ref={profileVideoRef} autoPlay playsInline muted style={{ transform: "scaleX(-1)" }} className="w-full" />
                              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-6">
                                <button onClick={stopProfileCamera} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white">
                                  <CameraOff className="h-5 w-5" />
                                </button>
                                <button onClick={() => captureFromCamera("profile")} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/30 backdrop-blur-sm">
                                  <div className="h-12 w-12 rounded-full bg-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        <canvas ref={profileCanvasRef} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Image generation preferences */}
                <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
                  <h2 className={`font-bold text-base text-slate-800 ${isRTL ? "text-right" : ""}`}>
                    {isRTL ? "تفضيلات توليد الصور" : "Image Generation Preferences"}
                  </h2>

                  <button
                    role="switch"
                    aria-checked={culturalGrounding}
                    onClick={() => setCulturalGrounding(v => !v)}
                    className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all text-left ${culturalGrounding ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200"}`}
                  >
                    <div className={isRTL ? "text-right" : ""}>
                      <p className="font-bold text-slate-800 text-sm">
                        {isRTL ? "صور ذات طابع ثقافي خليجي" : "Gulf / Regional Cultural Grounding"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isRTL
                          ? "أطعمة خليجية، ملابس تقليدية، بيئات مألوفة"
                          : "Gulf foods, traditional clothing, familiar regional settings"}
                      </p>
                    </div>
                    <div aria-hidden="true" className={`shrink-0 w-12 h-7 rounded-full flex items-center transition-all duration-200 ${culturalGrounding ? "bg-blue-600 justify-end" : "bg-slate-200 justify-start"}`}>
                      <div className="w-5 h-5 rounded-full bg-white shadow mx-1" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── People tab ── */}
            {parentTab === "people" && (
              <div role="tabpanel" id="parent-panel-people" aria-labelledby="parent-tab-people" className="space-y-4">
                {importantPeople.length > 0 && (
                  <div className="space-y-3">
                    {importantPeople.map(person => (
                      <div key={person.id} className={`bg-white rounded-3xl p-4 shadow-sm flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                        {person.photoPreview ? (
                          <img src={person.photoPreview} className="w-14 h-14 rounded-2xl object-cover border shrink-0" alt={person.name} />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl shrink-0">👤</div>
                        )}
                        <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                          <p className="font-bold text-slate-800">{person.name}</p>
                          {person.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{person.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removePerson(person.id)}
                          className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
                  <h2 className={`font-bold text-base text-slate-800 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <Plus className="h-4 w-4 text-blue-700" />
                    {isRTL ? "إضافة شخص مهم" : "Add an important person"}
                  </h2>

                  <div className="space-y-1">
                    <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                      {isRTL ? "الاسم *" : "Name *"}
                    </Label>
                    <Input
                      dir={isRTL ? "rtl" : undefined}
                      value={newPersonName}
                      onChange={e => setNewPersonName(e.target.value)}
                      placeholder={isRTL ? "مثال: أمي، الجدة سارة" : "e.g. Mom, Grandma Sara"}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                      {isRTL ? "الصورة (اختياري)" : "Photo (optional)"}
                    </Label>
                    {newPersonPhoto ? (
                      <div className="space-y-2">
                        <img src={newPersonPhoto} className="w-20 h-20 rounded-2xl object-cover border" alt="person" />
                        {newPersonPhotoLoading && (
                          <p className="text-xs text-blue-700 flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            {isRTL ? "جارٍ التحليل…" : "Analyzing…"}
                          </p>
                        )}
                        <Button
                          variant="outline" size="sm" className="rounded-xl text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => { setNewPersonPhoto(""); setNewPersonDesc(""); if (personFileRef.current) personFileRef.current.value = ""; }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          {isRTL ? "إزالة" : "Remove"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!personCameraOn ? (
                          <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-sm text-slate-600 cursor-pointer hover:bg-blue-50 transition-colors">
                              📁 {isRTL ? "تحميل" : "Upload"}
                              <input ref={personFileRef} type="file" accept="image/*" className="hidden"
                                onChange={async e => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  const url = await toBase64(f);
                                  setNewPersonPhoto(url);
                                  analyzePhoto(url, "person");
                                }}
                              />
                            </label>
                            <Button variant="outline" className="rounded-2xl flex-1" onClick={() => startCamera("person")}>
                              <Camera className="h-4 w-4 mr-1" />
                              {isRTL ? "كاميرا" : "Camera"}
                            </Button>
                          </div>
                        ) : (
                          <div className="relative overflow-hidden rounded-2xl border bg-black">
                            <video ref={personVideoRef} autoPlay playsInline muted style={{ transform: "scaleX(-1)" }} className="w-full" />
                            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-6">
                              <button onClick={stopPersonCamera} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white">
                                <CameraOff className="h-5 w-5" />
                              </button>
                              <button onClick={() => captureFromCamera("person")} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/30 backdrop-blur-sm">
                                <div className="h-12 w-12 rounded-full bg-white" />
                              </button>
                            </div>
                          </div>
                        )}
                        <canvas ref={personCanvasRef} className="hidden" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                      {isRTL ? "الوصف — المظهر والملابس إلخ (اختياري)" : "Appearance description (optional)"}
                    </Label>
                    <textarea
                      dir={isRTL ? "rtl" : undefined}
                      value={newPersonDesc}
                      onChange={e => setNewPersonDesc(e.target.value)}
                      placeholder={isRTL ? "مثال: سيدة تلبس حجاباً بنياً، بشرة فاتحة، تلبس نظارة" : "e.g. woman with brown hijab, light skin, wears glasses"}
                      rows={3}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {!newPersonPhotoLoading && newPersonPhoto && newPersonDesc && (
                      <p className="text-xs text-green-600">
                        ✓ {isRTL ? "تم تحليل الصورة تلقائياً" : "Auto-analyzed from photo"}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full rounded-full bg-blue-700 hover:bg-blue-600"
                    disabled={!newPersonName.trim()} onClick={addPerson}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isRTL ? "إضافة" : "Add Person"}
                  </Button>
                </div>

                {importantPeople.length === 0 && (
                  <p className={`text-sm text-slate-400 text-center py-2 ${isRTL ? "text-right" : ""}`}>
                    {isRTL
                      ? "لم تُضَف أشخاص بعد. أضف شخصاً لتخصيص الصور المُولَّدة."
                      : "No people added yet. Add someone to personalize generated images."}
                  </p>
                )}
              </div>
            )}

            {/* ── History tab ── */}
            {parentTab === "history" && (
              <div role="tabpanel" id="parent-panel-history" aria-labelledby="parent-tab-history" className="space-y-4">
                {recentGenerations.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">🖼️</div>
                    <p className="text-sm">{isRTL ? "لا توجد صور مُولَّدة بعد." : "No generated images yet."}</p>
                  </div>
                ) : (
                  recentGenerations.map(gen => (
                    <div key={gen.id} className="bg-white rounded-3xl p-4 shadow-sm space-y-3">
                      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className={`flex flex-wrap gap-1.5 flex-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                          {gen.tiles.map((t, i) => (
                            <span key={i} className="inline-flex flex-col items-center bg-blue-50 rounded-xl px-2 py-1">
                              <span className="text-lg leading-none">{t.emoji}</span>
                              <span className="text-xs text-slate-500 leading-tight">{t.en}</span>
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                          {new Date(gen.timestamp).toLocaleTimeString(isRTL ? "ar-SA" : "en-US", {
                            hour: "2-digit", minute: "2-digit", hour12: true,
                          })}
                        </span>
                      </div>
                      {gen.caption && (
                        <p className={`text-sm font-semibold text-slate-700 ${isRTL ? "text-right" : ""}`}>
                          {gen.caption}
                        </p>
                      )}
                      <div className="grid grid-cols-4 gap-2">
                        {gen.images.slice(0, 4).map((url, i) => (
                          <img key={i} src={url} alt="" className="rounded-2xl w-full aspect-square object-cover" />
                        ))}
                      </div>
                      <div className={`flex items-center justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <p className="text-xs text-slate-400 capitalize">
                          {isRTL
                            ? ({ symbolic: "رمزي", cartoon: "كرتوني", realistic: "واقعي" } as Record<string, string>)[gen.style] ?? gen.style
                            : gen.style}
                        </p>
                        <button
                          onClick={() => {
                            setEditingNoteId(gen.id);
                            setNoteInput(gen.note ?? "");
                          }}
                          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 shrink-0"
                        >
                          ✏️ {gen.note
                            ? (isRTL ? "تعديل الملاحظة" : "Edit note")
                            : (isRTL ? "إضافة ملاحظة" : "Add note")}
                        </button>
                      </div>

                      {editingNoteId === gen.id && (
                        <div className="space-y-2">
                          <textarea
                            autoFocus
                            dir={isRTL ? "rtl" : "ltr"}
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(gen.id); } }}
                            placeholder={isRTL ? "أضف ملاحظة لهذا التفاعل…" : "Add a note about this interaction…"}
                            rows={2}
                            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-blue-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveNote(gen.id)}
                              className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                            >
                              {isRTL ? "حفظ" : "Save"}
                            </button>
                            <button
                              onClick={() => { setEditingNoteId(null); setNoteInput(""); }}
                              className="flex-1 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
                            >
                              {isRTL ? "إلغاء" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      )}

                      {gen.note && editingNoteId !== gen.id && (
                        <div className={`bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 ${isRTL ? "text-right" : ""}`}>
                          <p className="text-xs text-amber-800 leading-relaxed">📝 {gen.note}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <Button
              className="w-full rounded-full py-5 text-base font-bold bg-blue-700 hover:bg-blue-600 text-white shadow-lg shadow-blue-200 transition-all"
              onClick={returnToChild}
            >
              {isRTL ? "← العودة إلى اللوحة" : "← Return to Board"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
