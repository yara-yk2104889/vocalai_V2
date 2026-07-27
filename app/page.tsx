"use client";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
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
  Volume2,
  X,
} from "lucide-react";
import Cropper from "react-easy-crop";
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
  note?: string;
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
    { emoji: "👍", en: "Yes",      ar: "نعم"    },
    { emoji: "👎", en: "No",       ar: "لا"     },
    { emoji: "😊", en: "Happy",    ar: "سعيد"   },
    { emoji: "😢", en: "Sad",      ar: "حزين"   },
    { emoji: "🤒", en: "Sick",     ar: "مريض"   },
    { emoji: "🏠", en: "Home",     ar: "البيت"  },
    { emoji: "🚽", en: "Toilet",   ar: "الحمام" },
    { emoji: "👋", en: "Bye",      ar: "وداعاً" },
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
  phrases: [
    { emoji: "🪪", en: "__my_name__",          ar: "__my_name__"             },
    { emoji: "🤝", en: "Nice to meet you",     ar: "سعيد بلقائك"            },
    { emoji: "🙂", en: "How are you?",         ar: "كيف حالك؟"              },
    { emoji: "🙏", en: "Thank you",            ar: "شكراً"                  },
    { emoji: "😊", en: "You're welcome",       ar: "عفواً"                  },
    { emoji: "🆘", en: "I need help please",   ar: "أحتاج مساعدة من فضلك"  },
    { emoji: "🔁", en: "Can you repeat that?", ar: "هل يمكنك إعادة ذلك؟"   },
  ],
  sensory: [
    { emoji: "🛑", en: "I need a break",       ar: "أحتاج استراحة"          },
    { emoji: "🔇", en: "Too loud",             ar: "صوت عالٍ جداً"          },
    { emoji: "🤲", en: "Need space",           ar: "أحتاج مساحة"            },
    { emoji: "😤", en: "Feeling overwhelmed",  ar: "أشعر بضغط"             },
    { emoji: "🙉", en: "Ears hurt",            ar: "أذناي تؤلمانني"        },
    { emoji: "💡", en: "Too bright",           ar: "الإضاءة قوية جداً"      },
    { emoji: "🤢", en: "Feel sick",            ar: "أشعر بغثيان"           },
    { emoji: "🤗", en: "Need a hug",           ar: "أريد عناقاً"           },
    { emoji: "😴", en: "I am tired",           ar: "أنا متعب"              },
    { emoji: "😰", en: "I feel anxious",       ar: "أشعر بقلق"            },
    { emoji: "🧘", en: "Calm down please",     ar: "هدّئوني من فضلكم"      },
    { emoji: "🚪", en: "I want to leave",      ar: "أريد المغادرة"         },
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
  { id: "phrases",    enLabel: "Phrases",    arLabel: "جمل"    },
  { id: "sensory",    enLabel: "Sensory",    arLabel: "حسي"    },
];

const CATEGORY_COLORS: Record<string, string> = {
  core:       "bg-blue-50   hover:bg-blue-100   border-blue-200",
  food:       "bg-orange-50 hover:bg-orange-100 border-orange-200",
  drink:      "bg-cyan-50   hover:bg-cyan-100   border-cyan-200",
  feelings:   "bg-pink-50   hover:bg-pink-100   border-pink-200",
  activities: "bg-green-50  hover:bg-green-100  border-green-200",
  people:     "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
  questions:  "bg-purple-50 hover:bg-purple-100 border-purple-200",
  phrases:    "bg-rose-50   hover:bg-rose-100   border-rose-200",
  sensory:    "bg-teal-50   hover:bg-teal-100   border-teal-200",
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

// ─── In-app keyboard layouts ───────────────────────────────────────────────────
const KBD_EN = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['SHIFT','z','x','c','v','b','n','m','⌫'],
  ['123',' '],
];
const KBD_AR = [
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح'],
  ['ش','س','ي','ب','ل','ا','ت','ن','م','ك'],
  ['ئ','ء','ؤ','ر','لا','ى','ة','و','ز','ظ'],
  ['⌫',' '],
];
const KBD_NUM = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['-','/','.',',','?','!','@','#','%','*'],
  ["'",'(',')','+','=',';',':','~','_','⌫'],
  ['ABC',' '],
];
const KBD_FLEX: Record<string, number> = {
  SHIFT: 1.5, '⌫': 1.5, '123': 1.5, ABC: 1.5, ' ': 5,
};

type ComboPhrase = { en: (t: string) => string; ar: (t: string) => string };
const COMBO_PHRASES_BY_CAT: Record<string, ComboPhrase[]> = {
  food: [
    { en: t => `I want ${t}`,       ar: t => `أريد ${t}`      },
    { en: t => `I like ${t}`,       ar: t => `أحب ${t}`       },
    { en: t => `I don't want ${t}`, ar: t => `لا أريد ${t}`   },
    { en: t => `More ${t}`,         ar: t => `المزيد من ${t}` },
    { en: t => `No more ${t}`,      ar: t => `لا مزيد من ${t}` },
  ],
  drink: [
    { en: t => `I want ${t}`,       ar: t => `أريد ${t}`      },
    { en: t => `I like ${t}`,       ar: t => `أحب ${t}`       },
    { en: t => `I don't want ${t}`, ar: t => `لا أريد ${t}`   },
    { en: t => `More ${t}`,         ar: t => `المزيد من ${t}` },
  ],
  feelings: [
    { en: t => `I feel ${t}`,       ar: t => `أشعر بـ${t}`    },
    { en: t => `I am ${t}`,         ar: t => `أنا ${t}`        },
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
  sensory: [
    { en: t => `I need ${t}`,    ar: t => `أحتاج ${t}`     },
    { en: t => `I feel ${t}`,    ar: t => `أشعر بـ${t}`    },
  ],
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
  const [customiseView, setCustomiseView]             = useState<"menu" | "arrange" | "add">("menu");

  // ── Image generation preferences
  const [culturalGrounding, setCulturalGrounding] = useState(true);

  // ── Board layout settings
  const [categoryOrder, setCategoryOrder]       = useState<string[]>(CATEGORIES.map(c => c.id));
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [tilesPerColumn, setTilesPerColumn]     = useState(4);

  // ── Board arrange mode
  const [isArrangingCategories, setIsArrangingCategories] = useState(false);
  const [draggedCatId, setDraggedCatId]   = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [textMode, setTextMode]   = useState(false);
  const [freeText, setFreeText]   = useState("");
  const [kbdShift, setKbdShift]   = useState(false);
  const [kbdNumMode, setKbdNumMode] = useState(false);
  const freeTextRef = useRef<HTMLTextAreaElement>(null);
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

  // ── Add to board modal
  const [showAddToBoard, setShowAddToBoard]         = useState(false);
  const [addToBoardUrl, setAddToBoardUrl]           = useState("");
  const [addToBoardLabelEn, setAddToBoardLabelEn]   = useState("");
  const [addToBoardLabelAr, setAddToBoardLabelAr]   = useState("");
  const [addToBoardCategory, setAddToBoardCategory] = useState(CATEGORIES[0].id);

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
    try {
      const savedProfile  = localStorage.getItem("vocalai_profile");
      const savedPeople   = localStorage.getItem("vocalai_people");
      const savedTiles    = localStorage.getItem("vocalai_custom_tiles");
      const savedLanguage = localStorage.getItem("vocalai_language");
      const savedStyle      = localStorage.getItem("vocalai_image_style");
      const savedHistory    = localStorage.getItem("vocalai_history");
      const savedCultural   = localStorage.getItem("vocalai_cultural_grounding");
      const savedCatOrder   = localStorage.getItem("vocalai_category_order");
      const savedHidden     = localStorage.getItem("vocalai_hidden_categories");
      const savedTilesPerCol = localStorage.getItem("vocalai_tiles_per_column");
      if (savedProfile)    setProfile(JSON.parse(savedProfile));
      if (savedPeople)     setImportantPeople(JSON.parse(savedPeople));
      if (savedTiles)      setCustomTiles(JSON.parse(savedTiles));
      if (savedLanguage)   setLanguage(savedLanguage as "en" | "ar");
      if (savedStyle)      setImageStyle(savedStyle as "symbolic" | "cartoon" | "realistic");
      if (savedHistory)    setRecentGenerations(JSON.parse(savedHistory));
      if (savedCultural !== null) setCulturalGrounding(savedCultural === "true");
      if (savedCatOrder)   setCategoryOrder(JSON.parse(savedCatOrder));
      if (savedHidden)     setHiddenCategories(JSON.parse(savedHidden));
      if (savedTilesPerCol) setTilesPerColumn(Number(savedTilesPerCol));
    } catch { /* corrupted data — start fresh */ }
  }, []);

  // ── localStorage: save on change ─────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("vocalai_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("vocalai_people", JSON.stringify(importantPeople));
  }, [importantPeople]);

  useEffect(() => {
    localStorage.setItem("vocalai_custom_tiles", JSON.stringify(customTiles));
  }, [customTiles]);

  useEffect(() => {
    localStorage.setItem("vocalai_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("vocalai_image_style", imageStyle);
  }, [imageStyle]);

  useEffect(() => {
    localStorage.setItem("vocalai_cultural_grounding", String(culturalGrounding));
  }, [culturalGrounding]);

  useEffect(() => {
    // Strip base64 data: URLs before persisting — they're ~1-3 MB each and blow the 5 MB quota.
    // In-memory state keeps them for the current session; history cards just won't show images after reload.
    const stripped = recentGenerations.map(g => ({
      ...g,
      images: g.images.filter(url => !url.startsWith("data:")),
    }));
    try {
      localStorage.setItem("vocalai_history", JSON.stringify(stripped));
    } catch {
      // Still too large (e.g. many remote URLs) — save metadata only
      try {
        localStorage.setItem(
          "vocalai_history",
          JSON.stringify(stripped.map(g => ({ ...g, images: [] }))),
        );
      } catch { /* give up gracefully */ }
    }
  }, [recentGenerations]);

  useEffect(() => {
    localStorage.setItem("vocalai_category_order", JSON.stringify(categoryOrder));
  }, [categoryOrder]);

  useEffect(() => {
    localStorage.setItem("vocalai_hidden_categories", JSON.stringify(hiddenCategories));
  }, [hiddenCategories]);

  useEffect(() => {
    localStorage.setItem("vocalai_tiles_per_column", String(tilesPerColumn));
  }, [tilesPerColumn]);

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
    let base: AacTile[];
    if (cat === "people") {
      base = [...TILES.people, ...importantPeople.map(p => ({ emoji: "👤", en: p.name, ar: p.name }))];
    } else if (cat === "phrases") {
      const name = profile.name.trim();
      base = (TILES.phrases ?? []).map(t =>
        t.en === "__my_name__"
          ? { emoji: t.emoji, en: name ? `My name is ${name}` : "My name is…", ar: name ? `اسمي ${name}` : "اسمي…" }
          : t
      );
    } else {
      base = TILES[cat] ?? [];
    }
    return [...base, ...(customTiles[cat] ?? [])];
  }

  // ── Board layout helpers ───────────────────────────────────────────────────
  const visibleCategories = categoryOrder
    .map(id => CATEGORIES.find(c => c.id === id))
    .filter((c): c is typeof CATEGORIES[0] => !!c && !hiddenCategories.includes(c.id));

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
  }

  function clearAll() {
    setSelectedTiles([]);
    setGeneratedImages([]);
    setCaption("");
  }

  function handleKbdKey(key: string) {
    if (key === '⌫')   { setFreeText(p => p.slice(0, -1)); return; }
    if (key === ' ')   { setFreeText(p => p + ' '); return; }
    if (key === 'SHIFT') { setKbdShift(v => !v); return; }
    if (key === '123') { setKbdNumMode(true); return; }
    if (key === 'ABC') { setKbdNumMode(false); return; }
    const ch = kbdShift && key.length === 1 ? key.toUpperCase() : key;
    setFreeText(p => p + ch);
    if (kbdShift && key.length === 1) setKbdShift(false);
  }

  async function speakSentence() {
    const text = textMode ? freeText.trim() : selectedTiles.map(t => isRTL ? t.ar : t.en).join(" ");
    if (!text || typeof window === "undefined") return;
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, gender: profile.gender, language }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      console.error("[Gemini TTS] failed, falling back to Web Speech:", e);
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
  };

  async function handleGenerate() {
    const hasInput = textMode ? !!freeText.trim() : selectedTiles.length > 0;
    if (!hasInput || isGenerating) return;
    setIsGenerating(true);
    setGeneratedImages([]);
    setCaption("");

    const words = textMode ? freeText.trim() : selectedTiles.map(t => (isRTL ? t.ar : t.en)).join(" ");

    try {
      if (imageMode === "single") {
        const prompt = textMode ? freeText.trim() : selectedTiles.map(t => t.en).join(" ");
        const matchingPeople = textMode ? [] : importantPeople.filter(p =>
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
        const sentence = textMode ? freeText.trim() : selectedTiles.map(t => t.en).join(" ");

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
                  {isRTL ? "إضافة إلى اللوحة" : "Add to Board"}
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

                {/* Category picker */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">
                    {isRTL ? "الفئة" : "Category"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setAddToBoardCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${CATEGORY_COLORS[cat.id] ?? ""} ${addToBoardCategory === cat.id ? "ring-2 ring-blue-500 ring-offset-1" : ""} text-slate-700`}
                      >
                        {isRTL ? cat.arLabel : cat.enLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Labels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {isRTL ? "الاسم (EN) *" : "Label (EN) *"}
                    </label>
                    <input
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
                  onClick={saveToBoard}
                  disabled={!addToBoardLabelEn.trim()}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm transition-colors"
                >
                  {isRTL ? "حفظ في اللوحة" : "Save to Board"}
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
                          }}
                          className="flex flex-col items-center gap-1 group"
                        >
                          <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-blue-400 group-active:border-blue-600 transition-all shadow-sm">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[9px] text-slate-400 leading-tight text-center line-clamp-1 w-full px-0.5">
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
                      <p className="text-xs text-slate-500 mt-0.5">{isRTL ? "اسحب الفئات وأخفِ أو أظهر" : "Drag to reorder · tap 👁 to show/hide"}</p>
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
                    <div className="flex gap-2">
                      {[3, 4, 5, 6, 8].map(n => (
                        <button key={n} onClick={() => setTilesPerColumn(n)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${tilesPerColumn === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
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
                    <div className="flex gap-2">
                      {[3, 4, 5, 6, 8].map(n => (
                        <button key={n} onClick={() => setTilesPerColumn(n)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${tilesPerColumn === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
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
                    <Input value={customLabelEn} onChange={e => setCustomLabelEn(e.target.value)}
                      placeholder={isRTL ? "مثال: نجمة" : "e.g. Star"} className="rounded-xl" />
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
              )}

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

            {/* Language + History — RIGHT (or Done button in arrange mode) */}
            {isArrangingCategories ? (
              <button
                onClick={() => { setDraggedCatId(null); setDragOverCatId(null); setIsArrangingCategories(false); }}
                className="px-5 py-2 rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-bold transition-colors shadow-sm shrink-0"
              >
                {isRTL ? "✓ تم" : "✓ Done"}
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowHistoryGallery(true)}
                  className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center text-lg transition-colors shadow-sm"
                  aria-label="Generation history"
                >
                  🕐
                </button>
                <button
                  onClick={() => setLanguage(isRTL ? "en" : "ar")}
                  className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold transition-colors shadow-sm"
                >
                  {isRTL ? "EN" : "عربي"}
                </button>
              </div>
            )}
          </header>

          {/* ── Sentence builder bar ── */}
          <div
            className={`shrink-0 bg-white border-b border-slate-100 px-3 py-2.5 flex items-stretch gap-2 shadow-sm transition-opacity ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}
          >
            {/* Text mode toggle button */}
            <button
              onClick={() => {
                const next = !textMode;
                setTextMode(next);
                if (next) setTimeout(() => freeTextRef.current?.focus(), 50);
              }}
              className={`shrink-0 w-12 min-h-[56px] rounded-2xl border-2 flex items-center justify-center transition-all text-xl ${textMode ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-200 hover:bg-orange-50 hover:border-orange-200"}`}
              aria-label={textMode ? (isRTL ? "وضع البطاقات" : "Switch to tiles") : (isRTL ? "وضع الكتابة" : "Switch to keyboard")}
            >
              {textMode ? "😊" : "⌨️"}
            </button>

            {/* Word strip — tiles in tile mode, textarea in text mode */}
            {textMode ? (
              <textarea
                ref={freeTextRef}
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); speakSentence(); } }}
                placeholder={isRTL ? "اكتب رسالتك هنا…" : "Type your message here…"}
                rows={2}
                className="flex-1 min-h-[56px] resize-none bg-orange-50 border-2 border-orange-200 focus:border-orange-400 rounded-2xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none leading-snug"
                dir={isRTL ? "rtl" : "ltr"}
              />
            ) : (
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
                      onClick={e => { e.stopPropagation(); removeTileAt(i); }}
                      className="inline-flex flex-col items-center rounded-xl bg-white border border-blue-200 shadow-sm px-2 py-1 shrink-0 cursor-pointer hover:bg-red-50 hover:border-red-300 active:scale-90 transition-all"
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
            )}

            {/* Action buttons: speak, delete last / clear text, clear, generate */}
            <div className="flex gap-1.5 items-center shrink-0">
              <button
                onClick={speakSentence}
                disabled={textMode ? !freeText.trim() : selectedTiles.length === 0}
                className="w-12 h-full min-h-[56px] rounded-2xl bg-slate-100 hover:bg-blue-100 active:bg-blue-200 disabled:opacity-30 flex items-center justify-center transition-colors group"
                aria-label={isRTL ? "نطق الرسالة" : "Speak message"}
              >
                <Volume2 className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              </button>
              {textMode ? (
                <button
                  onClick={() => setFreeText("")}
                  disabled={!freeText.trim()}
                  className="w-12 h-full min-h-[56px] rounded-2xl bg-slate-100 hover:bg-red-100 active:bg-red-200 disabled:opacity-30 flex items-center justify-center transition-colors group"
                  aria-label={isRTL ? "مسح النص" : "Clear text"}
                >
                  <X className="h-5 w-5 text-slate-600 group-hover:text-red-500 transition-colors" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => removeTileAt(selectedTiles.length - 1)}
                    disabled={selectedTiles.length === 0}
                    className="w-12 h-full min-h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 flex items-center justify-center transition-colors"
                    aria-label={isRTL ? "حذف آخر كلمة" : "Delete last"}
                  >
                    {isRTL
                      ? <ArrowRight className="h-5 w-5 text-slate-600" />
                      : <ArrowLeft className="h-5 w-5 text-slate-600" />
                    }
                  </button>
                  <button
                    onClick={clearAll}
                    disabled={selectedTiles.length === 0}
                    className="w-12 h-full min-h-[56px] rounded-2xl bg-slate-100 hover:bg-red-100 active:bg-red-200 disabled:opacity-30 flex items-center justify-center transition-colors group"
                    aria-label={isRTL ? "مسح الكل" : "Clear all"}
                  >
                    <X className="h-5 w-5 text-slate-600 group-hover:text-red-500 transition-colors" />
                  </button>
                </>
              )}
              <button
                onClick={handleGenerate}
                disabled={(textMode ? !freeText.trim() : selectedTiles.length === 0) || isGenerating}
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

            {/* Left: emoji board or text-mode placeholder — ~70% of area */}
            <div className="flex flex-col overflow-hidden min-w-0" style={{ flex: 7 }}>
              {textMode && (
                <div className="flex-1 min-h-0 bg-slate-300 p-1.5 flex flex-col gap-1 select-none">
                  {(kbdNumMode ? KBD_NUM : isRTL ? KBD_AR : KBD_EN).map((row, ri) => (
                    <div key={ri} className="flex gap-1 flex-1 min-h-0">
                      {row.map(key => {
                        const flex = KBD_FLEX[key] ?? 1;
                        const isAction = key in KBD_FLEX;
                        const isShiftOn = key === 'SHIFT' && kbdShift;
                        const label =
                          key === 'SHIFT' ? (kbdShift ? '⬆' : '⇧') :
                          key === ' '     ? (isRTL ? 'مسافة' : 'space') :
                          (kbdShift && key.length === 1) ? key.toUpperCase() :
                          key;
                        return (
                          <button
                            key={key}
                            onPointerDown={e => { e.preventDefault(); handleKbdKey(key); }}
                            style={{ flex }}
                            className={`rounded-xl flex items-center justify-center font-semibold text-sm shadow-sm border transition-all active:scale-95 active:brightness-90 min-h-0
                              ${isShiftOn ? 'bg-blue-100 border-blue-300 text-blue-700' :
                                isAction  ? 'bg-slate-400 border-slate-500 text-slate-800' :
                                            'bg-white border-slate-300 text-slate-900'}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {!textMode && <> {/* Category headers */}
              <div className={`shrink-0 border-b border-slate-100 bg-white ${isArrangingCategories ? "p-2 space-y-2" : ""}`}>
                {/* Arrange mode instruction strip */}
                {isArrangingCategories && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] text-slate-500 font-medium">
                      {isRTL ? "اسحب للترتيب · اضغط 👁 للإخفاء" : "Drag to reorder · tap 👁 to show/hide"}
                    </p>
                    {/* Grid size inline picker */}
                    <div className="flex gap-1 items-center">
                      <span className="text-[9px] text-slate-400 font-medium">{isRTL ? "صفوف:" : "Rows:"}</span>
                      {[3, 4, 5, 6, 8].map(n => (
                        <button key={n} onClick={() => setTilesPerColumn(n)}
                          className={`w-6 h-6 rounded-lg text-[9px] font-bold border transition-all ${tilesPerColumn === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chips row */}
                <div className="flex gap-1.5 p-2 pt-0">
                  {(isArrangingCategories ? categoryOrder : visibleCategories.map(c => c.id)).map(id => {
                    const cat = CATEGORIES.find(c => c.id === id);
                    if (!cat) return null;
                    const colors = CATEGORY_COLORS[cat.id] ?? "bg-slate-50 border-slate-200";
                    const isHidden = hiddenCategories.includes(id);
                    const isSelected = expandedCategory === cat.id;
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
                          className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-2xl py-1.5 px-1 border-2 cursor-grab active:cursor-grabbing transition-all select-none
                            ${isHidden ? "opacity-40" : ""}
                            ${isDragOver ? "ring-2 ring-blue-500 scale-105" : ""}
                            ${draggedCatId === id ? "opacity-50 scale-95" : ""}
                            ${colors}`}
                        >
                          <button
                            onClick={e => { e.stopPropagation(); toggleHideCategory(id); }}
                            className="text-[10px] leading-none"
                            onMouseDown={e => e.stopPropagation()}
                          >
                            {isHidden ? "🙈" : "👁️"}
                          </button>
                          <span className="text-[9px] font-bold text-slate-700 text-center leading-tight truncate w-full text-center">
                            {isRTL ? cat.arLabel : cat.enLabel}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={id}
                        onClick={() => setExpandedCategory(isSelected ? null : cat.id)}
                        className={`flex-1 min-w-0 rounded-2xl py-2 px-1 text-[11px] font-bold text-center border-2 transition-all active:scale-95 text-slate-700 ${colors} ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                      >
                        {isRTL ? cat.arLabel : cat.enLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emoji area */}
              <div className={`flex-1 min-h-0 overflow-hidden p-2 transition-opacity ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}>
                {expandedCategory === null ? (
                  /* Home: tiles-per-column rows, one column per visible category */
                  <div
                    className="h-full"
                    style={{
                      display: "grid",
                      gridTemplateRows: `repeat(${tilesPerColumn}, minmax(0, 1fr))`,
                      gridAutoColumns: "minmax(0, 1fr)",
                      gridAutoFlow: "column",
                      gap: "6px",
                    }}
                  >
                    {visibleCategories.flatMap(cat => {
                      const colors = CATEGORY_COLORS[cat.id] ?? "bg-slate-50 hover:bg-slate-100 border-slate-200";
                      return getTilesForCategory(cat.id).slice(0, tilesPerColumn).map((tile, i) => (
                        <button
                          key={`${cat.id}-${i}`}
                          onClick={() => { if (!longPressActiveRef.current) addTile(tile); }}
                          {...tilePointerProps(tile, cat.id)}
                          className={`rounded-xl border-2 ${colors} flex flex-col items-center justify-between p-1 active:scale-90 transition-all shadow-sm overflow-hidden`}
                        >
                          <div className="flex-1 flex items-center justify-center min-h-0">
                            {tile.imageUrl
                              ? <img src={tile.imageUrl} className="w-full h-full object-cover rounded-lg" alt={tile.en} />
                              : <span className={`leading-none ${tilesPerColumn <= 4 ? "text-3xl" : tilesPerColumn <= 6 ? "text-2xl" : "text-lg"}`}>{tile.emoji}</span>
                            }
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-700 text-center leading-tight w-full truncate px-0.5">
                            {isRTL ? tile.ar : tile.en}
                          </span>
                        </button>
                      ));
                    })}
                  </div>
                ) : (
                  /* Expanded: all tiles in a scrollable grid */
                  <div
                    className="h-full overflow-y-auto"
                    style={{ scrollbarWidth: "none" } as CSSProperties}
                  >
                  <div
                    className="gap-1.5"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${visibleCategories.length}, minmax(0, 1fr))`,
                      direction: isRTL ? "rtl" : "ltr",
                    }}
                  >
                    {getTilesForCategory(expandedCategory).map((tile, i) => {
                      const colors = CATEGORY_COLORS[expandedCategory] ?? "bg-slate-50 border-slate-200";
                      return (
                        <button
                          key={i}
                          onClick={() => { if (!longPressActiveRef.current) addTile(tile); }}
                          {...tilePointerProps(tile, expandedCategory)}
                          className={`w-full aspect-square rounded-2xl border-2 ${colors} flex flex-col items-center justify-between p-1 active:scale-90 transition-all shadow-sm overflow-hidden`}
                        >
                          <div className="flex-1 flex items-center justify-center min-h-0">
                            {tile.imageUrl
                              ? <img src={tile.imageUrl} className="w-full h-full object-cover rounded-lg" alt={tile.en} />
                              : <span className="text-3xl leading-none">{tile.emoji}</span>
                            }
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-700 text-center leading-tight w-full truncate px-0.5">
                            {isRTL ? tile.ar : tile.en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  </div>
                )}
              </div>
            </>}
            </div>

            {/* Middle: connector word sidebar */}
            <div
              className={`shrink-0 w-14 border-x border-slate-100 bg-white overflow-y-auto flex flex-col gap-1.5 p-1.5 transition-opacity ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}
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
            <div className={`flex flex-col border-x border-slate-100 bg-slate-50 overflow-hidden transition-opacity ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`} style={{ flex: 3 }}>
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
              <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: "none" } as CSSProperties}>
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
                  imageMode === "story" ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="rounded-2xl aspect-square flex flex-col items-center justify-center gap-1.5"
                          style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)" }}
                        >
                          <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
                          <span className="text-[9px] text-blue-400 font-semibold">
                            {isRTL ? "جارٍ التوليد…" : "Generating…"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="rounded-2xl aspect-square flex flex-col items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)" }}
                    >
                      <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
                      <span className="text-[10px] text-blue-400 font-semibold">
                        {isRTL ? "جارٍ التوليد…" : "Generating…"}
                      </span>
                    </div>
                  )
                )}

                {/* Caption */}
                {!isGenerating && caption && (
                  <p
                    className="shrink-0 text-[11px] font-semibold text-slate-700 text-center px-1 leading-snug"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {caption}
                  </p>
                )}

                {/* Images */}
                {!isGenerating && generatedImages.length > 0 && (
                  imageMode === "story" ? (
                    /* ── Story 2×2 grid ── */
                    <div className="grid grid-cols-2 gap-1.5">
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
                            <p className="absolute bottom-0 inset-x-0 text-[8px] font-semibold text-white bg-black/30 text-center px-1 py-0.5 leading-tight truncate">
                              {img.label}
                            </p>
                          )}
                          <button
                            onClick={() => openAddToBoard(img.url, img.label ?? selectedTiles.map(t => isRTL ? t.ar : t.en).join(" "))}
                            className="absolute bottom-1 right-1 bg-white/90 hover:bg-white active:bg-blue-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-[8px] font-bold text-blue-600 shadow-sm transition-all"
                          >
                            + {isRTL ? "لوحة" : "Board"}
                          </button>
                        </motion.div>
                      ))}
                    </div>
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
                          className="w-full h-auto block"
                        />
                      </motion.div>
                      <button
                        onClick={() => openAddToBoard(generatedImages[0].url, selectedTiles.map(t => isRTL ? t.ar : t.en).join(" "))}
                        className="shrink-0 w-full py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        ➕ {isRTL ? "إضافة إلى اللوحة" : "Add to board"}
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div className={`shrink-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2 transition-opacity ${isArrangingCategories ? "opacity-20 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center gap-2" style={isRTL ? { marginRight: "auto" } : { marginLeft: "auto" }}>
              <button
                onClick={() => setExpandedCategory(null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-semibold text-sm transition-colors border border-blue-200"
              >
                <Home className="h-4 w-4" />
                {isRTL ? "الرئيسية" : "Home"}
              </button>
              <button
                onClick={() => { setShowCustomiseModal(true); setCustomiseView("menu"); setCustomImageUrl(""); setCustomEmoji(""); setCustomLabelEn(""); setCustomLabelAr(""); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-semibold text-sm transition-colors border border-slate-200"
              >
                <Settings className="h-4 w-4" />
                {isRTL ? "تخصيص اللوحة" : "Customise Board"}
              </button>
            </div>
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
                <span className="text-sm font-bold text-slate-700 truncate">
                  {isRTL ? longPressMenu.tile.ar : longPressMenu.tile.en}
                </span>
              </div>

              {/* Phrase options */}
              <div className="pb-2">
                {longPressMenu.phrases.map((phrase, i) => (
                  <div
                    key={i}
                    className={`mx-2 mt-1 flex items-center px-3 rounded-2xl text-sm font-semibold transition-colors
                      ${longPressMenu.hoveredIdx === i
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-700'}`}
                    style={{ height: COMBO_ITEM_H - 6 }}
                  >
                    {isRTL ? phrase.ar(longPressMenu.tile.ar) : phrase.en(longPressMenu.tile.en)}
                  </div>
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
                          onClick={() => {
                            if (c.v === "other") {
                              setProfile(p => ({ ...p, condition: isOtherCondition ? "" : "other" }));
                            } else {
                              setProfile(p => ({ ...p, condition: p.condition === c.v ? "" : c.v }));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                            (c.v === "other" ? isOtherCondition : profile.condition === c.v)
                              ? "bg-blue-700 text-white border-blue-700"
                              : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
                          }`}
                        >
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
                    <div className={`shrink-0 w-12 h-7 rounded-full flex items-center transition-all duration-200 ${culturalGrounding ? "bg-blue-600 justify-end" : "bg-slate-200 justify-start"}`}>
                      <div className="w-5 h-5 rounded-full bg-white shadow mx-1" />
                    </div>
                  </button>
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
              {isRTL ? "← العودة لوضع الطفل" : "← Return to Child Mode"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
