"use client";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Home,
  Lock,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AacTile {
  emoji: string;
  en: string;
  ar: string;
  imageUrl?: string; // custom photo or generated image
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
}

// ─── Tile data ────────────────────────────────────────────────────────────────

const TILES: Record<string, AacTile[]> = {
  core: [
    { emoji: "🙋", en: "I want",   ar: "أريد"   },
    { emoji: "🆘", en: "Help",     ar: "مساعدة" },
    { emoji: "❓", en: "Question", ar: "سؤال"   },
    { emoji: "➕", en: "More",     ar: "أكثر"   },
    { emoji: "🛑", en: "Stop",     ar: "توقف"   },
    { emoji: "👍", en: "Yes",      ar: "نعم"    },
    { emoji: "👎", en: "No",       ar: "لا"     },
    { emoji: "😊", en: "Happy",    ar: "سعيد"   },
    { emoji: "😢", en: "Sad",      ar: "حزين"   },
    { emoji: "🤒", en: "Sick",     ar: "مريض"   },
    { emoji: "🏠", en: "Home",     ar: "البيت"  },
    { emoji: "🚽", en: "Toilet",   ar: "الحمام" },
  ],
  food: [
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
  ],
  drink: [
    { emoji: "💧", en: "Water",      ar: "ماء"           },
    { emoji: "🥛", en: "Milk",       ar: "حليب"          },
    { emoji: "🧃", en: "Juice",      ar: "عصير"          },
    { emoji: "☕", en: "Coffee",     ar: "قهوة"          },
    { emoji: "🍵", en: "Tea",        ar: "شاي"           },
    { emoji: "🥤", en: "Soda",       ar: "مشروب غازي"    },
    { emoji: "🍶", en: "Warm drink", ar: "مشروب دافئ"    },
    { emoji: "🧊", en: "Ice",        ar: "ثلج"           },
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
  ],
  activities: [
    { emoji: "🎮", en: "Play",     ar: "العب"      },
    { emoji: "📖", en: "Read",     ar: "اقرأ"      },
    { emoji: "🏃", en: "Run",      ar: "اركض"      },
    { emoji: "🛁", en: "Bath",     ar: "حمام"      },
    { emoji: "😴", en: "Sleep",    ar: "نوم"       },
    { emoji: "🎨", en: "Draw",     ar: "ارسم"      },
    { emoji: "📺", en: "Watch TV", ar: "تلفزيون"   },
    { emoji: "🎵", en: "Music",    ar: "موسيقى"    },
    { emoji: "⚽", en: "Ball",     ar: "كرة"       },
    { emoji: "🚗", en: "Car",      ar: "سيارة"     },
    { emoji: "🌳", en: "Outside",  ar: "بالخارج"   },
    { emoji: "🛒", en: "Shopping", ar: "تسوق"      },
  ],
  people: [
    { emoji: "👨",   en: "Dad",     ar: "أبي"      },
    { emoji: "👩",   en: "Mom",     ar: "أمي"      },
    { emoji: "👦",   en: "Brother", ar: "أخي"      },
    { emoji: "👧",   en: "Sister",  ar: "أختي"     },
    { emoji: "👩‍🏫", en: "Teacher", ar: "المعلمة"  },
    { emoji: "👨‍⚕️", en: "Doctor",  ar: "الطبيب"   },
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
};

const CATEGORIES = [
  { id: "core",       enLabel: "Core",       arLabel: "أساسي"  },
  { id: "food",       enLabel: "Food",       arLabel: "طعام"   },
  { id: "drink",      enLabel: "Drink",      arLabel: "مشروب"  },
  { id: "feelings",   enLabel: "Feelings",   arLabel: "مشاعر"  },
  { id: "activities", enLabel: "Activities", arLabel: "أنشطة"  },
  { id: "people",     enLabel: "People",     arLabel: "أشخاص"  },
  { id: "questions",  enLabel: "Questions",  arLabel: "أسئلة"  },
];

const CATEGORY_COLORS: Record<string, string> = {
  core:       "bg-blue-50   hover:bg-blue-100   border-blue-200",
  food:       "bg-orange-50 hover:bg-orange-100 border-orange-200",
  drink:      "bg-cyan-50   hover:bg-cyan-100   border-cyan-200",
  feelings:   "bg-pink-50   hover:bg-pink-100   border-pink-200",
  activities: "bg-green-50  hover:bg-green-100  border-green-200",
  people:     "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
  questions:  "bg-purple-50 hover:bg-purple-100 border-purple-200",
};

const STYLE_OPTIONS: { id: "symbolic" | "cartoon" | "realistic"; en: string; ar: string }[] = [
  { id: "symbolic",  en: "Symbolic",  ar: "رمزي"   },
  { id: "cartoon",   en: "Cartoon",   ar: "كرتوني" },
  { id: "realistic", en: "Realistic", ar: "واقعي"  },
];

const CONNECTORS: { en: string; ar: string }[] = [
  { en: "I",      ar: "أنا"   },
  { en: "want",   ar: "أريد"  },
  { en: "the",    ar: "الـ"   },
  { en: "a",      ar: "يوجد"  },
  { en: "my",     ar: "لدي"   },
  { en: "and",    ar: "و"     },
  { en: "then",   ar: "ثم"    },
  { en: "with",   ar: "مع"    },
  { en: "more",   ar: "أكثر"  },
  { en: "not",    ar: "لا"    },
  { en: "to",     ar: "إلى"   },
  { en: "go",     ar: "أذهب"  },
  { en: "after",  ar: "بعد"   },
  { en: "before", ar: "قبل"   },
  { en: "in",     ar: "في"    },
  { en: "at",     ar: "عند"   },
];

const DEFAULT_PIN = "1234";

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

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
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
  const [isGenerating, setIsGenerating]       = useState(false);
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

  // ── Custom tiles
  const [customTiles, setCustomTiles] = useState<Record<string, AacTile[]>>({});

  // ── Customise Board modal
  const [showCustomiseModal, setShowCustomiseModal]   = useState(false);
  const [customCategory, setCustomCategory]           = useState(CATEGORIES[0].id);
  const [customIconType, setCustomIconType]           = useState<"emoji" | "photo" | "generated">("emoji");
  const [customEmoji, setCustomEmoji]                 = useState("");
  const [customImageUrl, setCustomImageUrl]           = useState("");
  const [customLabelEn, setCustomLabelEn]             = useState("");
  const [customLabelAr, setCustomLabelAr]             = useState("");
  const [customCameraOn, setCustomCameraOn]           = useState(false);
  const [customCameraStream, setCustomCameraStream]   = useState<MediaStream | null>(null);
  const customVideoRef  = useRef<HTMLVideoElement>(null);
  const customCanvasRef = useRef<HTMLCanvasElement>(null);
  const customFileRef   = useRef<HTMLInputElement>(null);

  // ── Parent tab
  const [parentTab, setParentTab] = useState<"profile" | "people" | "history">("profile");

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
    const base = cat !== "people"
      ? TILES[cat] ?? []
      : [...TILES.people, ...importantPeople.map(p => ({ emoji: "👤", en: p.name, ar: p.name }))];
    return [...base, ...(customTiles[cat] ?? [])];
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
    setSelectedTiles(prev => [...prev, tile]);
    setGeneratedImages([]);
    setCaption("");
  }

  function removeTileAt(index: number) {
    setSelectedTiles(prev => prev.filter((_, i) => i !== index));
    setGeneratedImages([]);
    setCaption("");
  }

  function clearAll() {
    setSelectedTiles([]);
    setGeneratedImages([]);
    setCaption("");
  }

  function speakSentence() {
    if (selectedTiles.length === 0 || typeof window === "undefined") return;
    const text = selectedTiles.map(t => isRTL ? t.ar : t.en).join(" ");
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isRTL ? "ar-SA" : "en-US";
      window.speechSynthesis.speak(utterance);
    } catch { /* silent */ }
  }

  const profileContext = {
    location:   locationLabel      || undefined,
    gender:     profile.gender     || undefined,
    condition:  profile.condition  || undefined,
    age:        profile.age        || undefined,
    appearance: profile.appearance || undefined,
  };

  async function handleGenerate() {
    if (selectedTiles.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setGeneratedImages([]);
    setCaption("");

    const words = selectedTiles.map(t => (isRTL ? t.ar : t.en)).join(" ");

    try {
      if (imageMode === "single") {
        const prompt = selectedTiles.map(t => t.en).join(" ");
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
        const cap: string = captionRes.caption ?? "";
        setGeneratedImages(urls.map(url => ({ url })));
        setStoryIndex(0);
        setCaption(cap);
        setRecentGenerations(prev => [{
          id: uid(), tiles: [...selectedTiles], images: urls,
          caption: cap, style: imageStyle, timestamp: new Date().toISOString(),
        }, ...prev].slice(0, 20));

      } else {
        const sentence = selectedTiles.map(t => t.en).join(" ");

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

        const cap: string = (captionRes as { caption?: string }).caption ?? "";
        setGeneratedImages(storyImages.filter(img => img.url));
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
      if (target === "profile") setProfile(p => ({ ...p, appearance: data.appearance ?? "" }));
      else setNewPersonDesc(data.appearance ?? "");
    } catch { /* silent */ } finally {
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
                <h2 className="font-bold text-lg text-slate-800">
                  {isRTL ? "تخصيص اللوحة" : "Customise Board"}
                </h2>
                <button onClick={() => { setShowCustomiseModal(false); stopCustomCamera(); }}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto" style={{ scrollbarWidth: "none" } as CSSProperties}>

                {/* 1. Category */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{isRTL ? "الفئة" : "Category"}</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => setCustomCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${CATEGORY_COLORS[cat.id] ?? ""} ${customCategory === cat.id ? "ring-2 ring-blue-500 ring-offset-1" : ""} text-slate-700`}>
                        {isRTL ? cat.arLabel : cat.enLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Icon type */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{isRTL ? "نوع الأيقونة" : "Icon type"}</p>
                  <div className="flex rounded-2xl overflow-hidden border border-slate-200">
                    {([
                      { id: "emoji",     en: "🔤 Emoji",     ar: "🔤 رمز"      },
                      { id: "photo",     en: "📷 Photo",     ar: "📷 صورة"     },
                      { id: "generated", en: "🖼️ Generated", ar: "🖼️ مُولَّد" },
                    ] as const).map(opt => (
                      <button key={opt.id} onClick={() => { setCustomIconType(opt.id); setCustomImageUrl(""); stopCustomCamera(); }}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors ${customIconType === opt.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
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
                      placeholder="e.g. 🌟"
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
                                setCustomImageUrl(c.toDataURL("image/jpeg", 0.85));
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
                              setCustomImageUrl(await toBase64(f));
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
                    <Input value={customLabelEn} onChange={e => setCustomLabelEn(e.target.value)}
                      placeholder="e.g. Star" className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "الاسم (AR)" : "Label (AR)"}</Label>
                    <Input dir="rtl" value={customLabelAr} onChange={e => setCustomLabelAr(e.target.value)}
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
                      <span className="text-[9px] font-semibold text-slate-700 text-center leading-tight mt-1 w-full truncate px-0.5">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ CHILD MODE ══════════════════ */}
      {mode === "child" && (
        <div className="flex flex-col h-screen overflow-hidden">

          {/* ── Top nav bar ── */}
          <header dir="ltr" className="shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
            {/* Lock — LEFT */}
            <button
              onClick={() => { setShowPinModal(true); setPinInput(""); setPinError(false); }}
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow-sm"
              aria-label={isRTL ? "وضع الوالدين" : "Parent mode"}
            >
              <Lock className="h-4 w-4" />
            </button>

            {/* Context — CENTER */}
            <div className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 min-w-0">
              {locationLabel && (
                <span className="flex items-center gap-1 truncate">
                  <span>📍</span>
                  <span className="truncate">{locationLabel}</span>
                </span>
              )}
              {locationLabel && timeLabel && <span className="text-slate-300 shrink-0">·</span>}
              {timeLabel && (
                <span className="flex items-center gap-1 shrink-0">
                  <span>🕐</span>
                  <span>{timeLabel}</span>
                </span>
              )}
              {!locationLabel && !timeLabel && (
                <span className="text-slate-400 text-xs">
                  {isRTL ? "مساعد التواصل" : "AAC Communication"}
                </span>
              )}
            </div>

            {/* Language — RIGHT */}
            <button
              onClick={() => setLanguage(isRTL ? "en" : "ar")}
              className="shrink-0 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold transition-colors shadow-sm"
            >
              {isRTL ? "EN" : "عربي"}
            </button>
          </header>

          {/* ── Sentence builder bar ── */}
          <div
            dir="ltr"
            className="shrink-0 bg-white border-b border-slate-100 px-3 py-2.5 flex items-stretch gap-2 shadow-sm"
          >
            {/* Word strip — tap to speak */}
            <button
              onClick={speakSentence}
              className="flex-1 min-h-[56px] bg-slate-50 hover:bg-blue-50 active:bg-blue-100 rounded-2xl border-2 border-slate-200 hover:border-blue-300 px-3 py-2 transition-all flex items-center gap-1.5 flex-wrap text-left overflow-hidden"
              aria-label={isRTL ? "اضغط للنطق" : "Tap to speak"}
            >
              {selectedTiles.length === 0 ? (
                <span className="text-sm text-slate-400 select-none">
                  {isRTL ? "اضغط على بطاقة لبناء رسالتك…" : "Tap a tile to build your message…"}
                </span>
              ) : (
                selectedTiles.map((tile, i) => (
                  <motion.span
                    key={`${tile.en}-${i}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="inline-flex flex-col items-center rounded-xl bg-white border border-blue-200 shadow-sm px-2 py-1 shrink-0"
                  >
                    {tile.imageUrl
                      ? <img src={tile.imageUrl} className="w-7 h-7 object-cover rounded-md" alt={tile.en} />
                      : tile.emoji && <span className="text-lg leading-none">{tile.emoji}</span>
                    }
                    <span className="text-[10px] text-slate-700 font-semibold leading-tight mt-0.5">
                      {isRTL ? tile.ar : tile.en}
                    </span>
                  </motion.span>
                ))
              )}
            </button>

            {/* Action buttons: delete last, clear, generate */}
            <div className="flex gap-1.5 items-center shrink-0">
              <button
                onClick={() => removeTileAt(selectedTiles.length - 1)}
                disabled={selectedTiles.length === 0}
                className="w-12 h-full min-h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors"
                aria-label={isRTL ? "حذف آخر كلمة" : "Delete last"}
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <button
                onClick={clearAll}
                disabled={selectedTiles.length === 0}
                className="w-12 h-full min-h-[56px] rounded-2xl bg-slate-100 hover:bg-red-100 active:bg-red-200 disabled:opacity-30 flex items-center justify-center transition-colors group"
                aria-label={isRTL ? "مسح الكل" : "Clear all"}
              >
                <X className="h-5 w-5 text-slate-600 group-hover:text-red-500 transition-colors" />
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedTiles.length === 0 || isGenerating}
                className="w-12 h-full min-h-[56px] rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-30 flex items-center justify-center transition-colors shadow-md shadow-blue-200"
                aria-label={isRTL ? "توليد صورة" : "Generate image"}
              >
                {isGenerating
                  ? <RefreshCw className="h-5 w-5 text-white animate-spin" />
                  : <span className="text-xl">✨</span>
                }
              </button>
            </div>
          </div>

          {/* ── Main 3-column area ── */}
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* Left: emoji board — ~70% of area */}
            <div className="flex flex-col overflow-hidden min-w-0" style={{ flex: 7 }}>

              {/* Category headers — always visible, one per column */}
              <div
                className={`shrink-0 flex gap-1.5 p-2 border-b border-slate-100 bg-white ${isRTL ? "flex-row-reverse" : ""}`}
              >
                {CATEGORIES.map(cat => {
                  const colors = CATEGORY_COLORS[cat.id] ?? "bg-slate-50 border-slate-200";
                  const isSelected = expandedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setExpandedCategory(isSelected ? null : cat.id)}
                      className={`flex-1 min-w-0 rounded-2xl py-2 px-1 text-[11px] font-bold text-center border-2 transition-all active:scale-95 text-slate-700 ${colors} ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                    >
                      {isRTL ? cat.arLabel : cat.enLabel}
                    </button>
                  );
                })}
              </div>

              {/* Emoji area — squares never resize */}
              <div
                className="flex-1 overflow-y-auto p-2"
                style={{ scrollbarWidth: "none" } as CSSProperties}
              >
                {expandedCategory === null ? (
                  /* Home: 7-column preview, 4 tiles per column going top-to-bottom */
                  <div className={`flex gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {CATEGORIES.map(cat => {
                      const colors = CATEGORY_COLORS[cat.id] ?? "bg-slate-50 hover:bg-slate-100 border-slate-200";
                      return (
                        <div key={cat.id} className="flex-1 min-w-0 flex flex-col gap-1.5">
                          {getTilesForCategory(cat.id).slice(0, 4).map((tile, i) => (
                            <button
                              key={i}
                              onClick={() => addTile(tile)}
                              className={`w-full aspect-square rounded-xl border-2 ${colors} flex flex-col items-center justify-center p-1 active:scale-90 transition-all shadow-sm overflow-hidden`}
                            >
                              {tile.imageUrl
                                ? <img src={tile.imageUrl} className="w-3/4 h-3/4 object-cover rounded-lg" alt={tile.en} />
                                : <span className="text-3xl leading-none">{tile.emoji}</span>
                              }
                              <span className="text-xs font-semibold text-slate-700 text-center leading-tight mt-1 w-full truncate px-0.5">
                                {isRTL ? tile.ar : tile.en}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Expanded: same 7-column grid, all tiles flow left-to-right */
                  <div
                    className="gap-1.5"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${CATEGORIES.length}, minmax(0, 1fr))`,
                      direction: isRTL ? "rtl" : "ltr",
                    }}
                  >
                    {getTilesForCategory(expandedCategory).map((tile, i) => {
                      const colors = CATEGORY_COLORS[expandedCategory] ?? "bg-slate-50 border-slate-200";
                      return (
                        <button
                          key={i}
                          onClick={() => addTile(tile)}
                          className={`w-full aspect-square rounded-2xl border-2 ${colors} flex flex-col items-center justify-center p-1 active:scale-90 transition-all shadow-sm overflow-hidden`}
                        >
                          {tile.imageUrl
                            ? <img src={tile.imageUrl} className="w-3/4 h-3/4 object-cover rounded-lg" alt={tile.en} />
                            : <span className="text-3xl leading-none">{tile.emoji}</span>
                          }
                          <span className="text-xs font-semibold text-slate-700 text-center leading-tight mt-1 w-full truncate px-0.5">
                            {isRTL ? tile.ar : tile.en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Middle: connector word sidebar */}
            <div
              className="shrink-0 w-14 border-x border-slate-100 bg-white overflow-y-auto flex flex-col gap-1.5 p-1.5"
              style={{ scrollbarWidth: "none" } as CSSProperties}
            >
              {CONNECTORS.map(word => (
                <button
                  key={word.en}
                  onClick={() => addTile({ emoji: "", en: word.en, ar: word.ar })}
                  className="w-full rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 active:scale-90 border border-slate-200 transition-all py-2 px-1 text-center"
                >
                  <span className="block text-[11px] font-bold text-slate-700 leading-tight">
                    {isRTL ? word.ar : word.en}
                  </span>
                </button>
              ))}
            </div>

            {/* Right: image panel — ~30% of area */}
            <div className="flex flex-col border-l border-slate-100 bg-slate-50 overflow-hidden" style={{ flex: 3 }}>
              {/* Mode + style selectors */}
              <div className="shrink-0 p-2 border-b border-slate-100 bg-white space-y-1.5">
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  {[
                    { id: "single", en: "Single", ar: "واحدة" },
                    { id: "story",  en: "Story",  ar: "قصة"   },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setImageMode(opt.id as "single" | "story")}
                      className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                        imageMode === opt.id
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {isRTL ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  {STYLE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setImageStyle(opt.id)}
                      className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${
                        imageStyle === opt.id
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {isRTL ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image display */}
              <div
                className="flex-1 overflow-y-auto p-2 space-y-2"
                style={{ scrollbarWidth: "none" } as CSSProperties}
              >
                {/* Empty state */}
                {!isGenerating && generatedImages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">
                      🖼️
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {isRTL
                        ? "اختر كلمات واضغط ✨ لتوليد صورة"
                        : "Select words and tap ✨ to generate"}
                    </p>
                  </div>
                )}

                {/* Loading */}
                {isGenerating && (
                  <div className="space-y-2">
                    {(imageMode === "story" ? [0, 1, 2] : [0]).map(i => (
                      <div
                        key={i}
                        className="rounded-2xl aspect-square flex flex-col items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)" }}
                      >
                        <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
                        <span className="text-[10px] text-blue-400 font-semibold">
                          {isRTL ? "جارٍ التوليد…" : "Generating…"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Caption */}
                {!isGenerating && caption && (
                  <p
                    className="text-[11px] font-semibold text-slate-700 text-center px-1 leading-snug"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {caption}
                  </p>
                )}

                {/* Images */}
                {!isGenerating && generatedImages.length > 0 && (
                  imageMode === "story" ? (
                    /* ── Story carousel ── */
                    <div className="space-y-2">
                      {/* Scene label */}
                      {generatedImages[storyIndex]?.label && (
                        <p className="text-[9px] text-slate-500 font-semibold text-center leading-tight px-1">
                          {generatedImages[storyIndex].label}
                        </p>
                      )}
                      {/* Image + arrows */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setStoryIndex(i => Math.max(0, i - 1))}
                          disabled={storyIndex === 0}
                          className="shrink-0 p-1 rounded-xl bg-white border border-slate-200 shadow-sm disabled:opacity-20 transition-opacity"
                        >
                          <ChevronLeft className="h-4 w-4 text-slate-600" />
                        </button>
                        <motion.div
                          key={storyIndex}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white"
                        >
                          <img
                            src={generatedImages[storyIndex].url}
                            alt={generatedImages[storyIndex].label ?? caption}
                            className="w-full aspect-square object-cover"
                          />
                        </motion.div>
                        <button
                          onClick={() => setStoryIndex(i => Math.min(generatedImages.length - 1, i + 1))}
                          disabled={storyIndex === generatedImages.length - 1}
                          className="shrink-0 p-1 rounded-xl bg-white border border-slate-200 shadow-sm disabled:opacity-20 transition-opacity"
                        >
                          <ChevronRight className="h-4 w-4 text-slate-600" />
                        </button>
                      </div>
                      {/* Dot indicators */}
                      <div className="flex items-center justify-center gap-1.5">
                        {generatedImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setStoryIndex(i)}
                            className={`rounded-full transition-all ${
                              i === storyIndex
                                ? "w-3 h-3 bg-blue-600"
                                : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* ── Single image ── */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white"
                    >
                      <img
                        src={generatedImages[0].url}
                        alt={caption}
                        className="w-full aspect-square object-cover"
                      />
                    </motion.div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div dir="ltr" className="shrink-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setExpandedCategory(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-semibold text-sm transition-colors border border-blue-200"
            >
              <Home className="h-4 w-4" />
              {isRTL ? "الرئيسية" : "Home"}
            </button>
            <button
              onClick={() => { setShowCustomiseModal(true); setCustomImageUrl(""); setCustomEmoji(""); setCustomLabelEn(""); setCustomLabelAr(""); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-semibold text-sm transition-colors border border-slate-200"
            >
              <Settings className="h-4 w-4" />
              {isRTL ? "تخصيص اللوحة" : "Customise Board"}
            </button>
          </div>
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
              {isRTL ? "⚙️ إعدادات الوالدين" : "⚙️ Parent Settings"}
            </h1>
            {/* Language — always RIGHT */}
            <button
              onClick={() => setLanguage(isRTL ? "en" : "ar")}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-bold"
            >
              {isRTL ? "EN" : "عربي"}
            </button>
          </header>

          <div className={`flex bg-white/90 backdrop-blur-sm border-b sticky top-[58px] z-10 ${isRTL ? "flex-row-reverse" : ""}`}>
            {(["profile", "people", "history"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setParentTab(tab)}
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
                  : (isRTL ? "🕐 السجل" : "🕐 History")}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4 pb-24">

            {/* ── Profile tab ── */}
            {parentTab === "profile" && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 shadow-sm space-y-5">
                  <h2 className={`font-bold text-lg text-slate-800 ${isRTL ? "text-right" : ""}`}>
                    {isRTL ? "الملف الشخصي للطفل" : "Child Profile"}
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
                      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        {[
                          { v: "male",   en: "Boy",  ar: "ذكر"  },
                          { v: "female", en: "Girl", ar: "أنثى" },
                        ].map(g => (
                          <button
                            key={g.v}
                            onClick={() => setProfile(p => ({ ...p, gender: g.v }))}
                            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                              profile.gender === g.v
                                ? "bg-blue-700 text-white border-blue-700"
                                : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
                            }`}
                          >
                            {isRTL ? g.ar : g.en}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                        {isRTL ? "اللغة المفضلة" : "Language"}
                      </Label>
                      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        {[
                          { v: "en", label: "English" },
                          { v: "ar", label: "عربي"    },
                        ].map(l => (
                          <button
                            key={l.v}
                            onClick={() => setProfile(p => ({ ...p, language: l.v as "en" | "ar" }))}
                            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                              profile.language === l.v
                                ? "bg-blue-700 text-white border-blue-700"
                                : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
                            }`}
                          >
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
                    <div className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
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
                          onClick={() => setProfile(p => ({ ...p, condition: p.condition === c.v ? "" : c.v }))}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                            profile.condition === c.v
                              ? "bg-blue-700 text-white border-blue-700"
                              : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
                          }`}
                        >
                          {isRTL ? c.ar : c.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className={`text-sm ${isRTL ? "block text-right" : ""}`}>
                      {isRTL
                        ? "صورة الطفل — لتخصيص الصور المُولَّدة (اختياري)"
                        : "Child photo — for personalizing generated images (optional)"}
                    </Label>

                    {profile.photoPreview ? (
                      <div className="space-y-2">
                        <img src={profile.photoPreview} className="w-24 h-24 rounded-2xl object-cover border" alt="child profile" />
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
              </div>
            )}

            {/* ── People tab ── */}
            {parentTab === "people" && (
              <div className="space-y-4">
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
              <div className="space-y-4">
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
                              <span className="text-[9px] text-slate-500 leading-tight">{t.en}</span>
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
                      <p className="text-xs text-slate-400 capitalize">
                        {isRTL
                          ? ({ symbolic: "رمزي", cartoon: "كرتوني", realistic: "واقعي" } as Record<string, string>)[gen.style] ?? gen.style
                          : gen.style}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            <Button
              className="w-full rounded-full py-5 text-base font-bold bg-blue-700 hover:bg-blue-600 text-white shadow-lg shadow-blue-200 transition-all"
              onClick={returnToChild}
            >
              {isRTL ? "← العودة لوضع الطفل" : "← Return to Child Mode"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
