"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Mic,
  Image as ImageIcon,
  Sparkles,
  Check,
  X,
  MapPin,
  Clock,
  Volume2,
  Square,
  Camera,
  CameraOff,
} from "lucide-react";

const likertLabels = {
  keywordIdentification: [
    "1 – Not at all well",
    "2 – Slightly well",
    "3 – Moderately well",
    "4 – Very well",
    "5 – Extremely well",
  ],
  keywordRelevance: [
    "1 – Not at all relevant",
    "2 – Slightly relevant",
    "3 – Moderately relevant",
    "4 – Very relevant",
    "5 – Extremely relevant",
  ],
  sentenceHelpfulness: [
    "1 – Not at all helpful",
    "2 – Slightly helpful",
    "3 – Moderately helpful",
    "4 – Very helpful",
    "5 – Extremely helpful",
  ],
  sentenceAppropriateness: [
    "1 – Not at all appropriate",
    "2 – Slightly appropriate",
    "3 – Moderately appropriate",
    "4 – Very appropriate",
    "5 – Extremely appropriate",
  ],
  ease: [
    "1 – Very difficult",
    "2 – Difficult",
    "3 – Neutral",
    "4 – Easy",
    "5 – Very easy",
  ],
  speed: [
    "1 – Very slow",
    "2 – Slow",
    "3 – Acceptable",
    "4 – Fast",
    "5 – Very fast",
  ],
  likelihood: [
    "1 – Very unlikely",
    "2 – Unlikely",
    "3 – Neutral",
    "4 – Likely",
    "5 – Very likely",
  ],
  imageAccuracy: [
    "1 – Not at all accurate",
    "2 – Slightly accurate",
    "3 – Moderately accurate",
    "4 – Very accurate",
    "5 – Extremely accurate",
  ],
  meaningClarity: [
    "1 – Not at all clear",
    "2 – Slightly clear",
    "3 – Moderately clear",
    "4 – Very clear",
    "5 – Extremely clear",
  ],
  helpfulness: [
    "1 – Not at all helpful",
    "2 – Slightly helpful",
    "3 – Moderately helpful",
    "4 – Very helpful",
    "5 – Extremely helpful",
  ],
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const api = {
  async generateImage({ prompt }: { prompt: string }) {
    // SWITCH MODELS HERE!!!
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate image");
    }

    return response.json();
  },

  async imageToKeywords({
    imageDataUrl,
    context,
    customKeywords,
    language,
  }: {
    imageDataUrl: string;
    context: {
      timeOfDay: string;
      location: string;
      partnerRole: string;
      goal: string;
      freeContext: string;
    };
    customKeywords: string[];
    language: string;
  }) {
    const response = await fetch("/api/image-to-keywords", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageDataUrl,
        context,
        customKeywords,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate keywords");
    }

    return response.json();
  },

  async keywordsToSentences({
    keywords,
    context,
    language,
    style,
    intention,
  }: {
    keywords: string[];
    context: {
      timeOfDay: string;
      location: string;
      partnerRole: string;
      goal: string;
      freeContext: string;
    };
    language: string;
    style: string;
    intention: string;
  }) {
    const response = await fetch("/api/keywords-to-sentences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keywords,
        context,
        language,
        style,
        intention,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate sentences");
    }

    return response.json();
  },
};

const goalsByLocation: Record<string, { value: string; label: string; arLabel: string }[]> = {
  pharmacy: [
    { value: "ask dose", label: "Ask dose", arLabel: "سؤال عن الجرعة" },
    { value: "refill", label: "Refill", arLabel: "إعادة الصرف" },
    { value: "request help", label: "Request help", arLabel: "طلب مساعدة" },
  ],
  cafe: [
    { value: "order food", label: "Order food", arLabel: "طلب طعام" },
    { value: "order drink", label: "Order drink", arLabel: "طلب مشروب" },
    { value: "request help", label: "Request help", arLabel: "طلب مساعدة" },
  ],
  majlis: [
    { value: "greet", label: "Greet", arLabel: "تحية" },
    { value: "share story", label: "Share story", arLabel: "مشاركة أخبار" },
    { value: "join conversation", label: "Join conversation", arLabel: "الانضمام للحديث" },
    { value: "express feeling", label: "Express feeling", arLabel: "التعبير عن مشاعر" },
  ],
};

const SAMPLE_IMAGES: Record<string, { src: string; label: string; arLabel: string }[]> = {
  pharmacy: [
    { src: "/samples/pharmacy/medicine.jpg", label: "Medicine box", arLabel: "علبة دواء" },
    { src: "/samples/pharmacy/pills.jpg",    label: "Pills",        arLabel: "حبوب" },
  ],
  cafe: [
    { src: "/samples/cafe/coffee.jpg",    label: "Coffee",   arLabel: "قهوة" },
    { src: "/samples/cafe/sandwich.jpg",  label: "Sandwich", arLabel: "ساندويش" },
  ],
  majlis: [
    { src: "/samples/gathering/coffee.jpg",        label: "Coffee gathering", arLabel: "قهوة في التجمع" },
    { src: "/samples/gathering/family_majlis.webp", label: "Family majlis",   arLabel: "مجلس عائلي" },
  ],
};

const PARTNER_ROLE_AR: Record<string, string> = {
  parent: "والد/ة",
  caregiver: "مقدم رعاية",
  teacher: "معلم",
  slt: "أخصائي نطق",
  stranger: "غريب / عام",
};

const DEMO_PROFILES = [
  {
    id: "sara",
    emoji: "👧",
    name: "Sara",
    tagline: "8 years old · Child with autism",
    arTagline: "8 سنوات · توحد",
    description: "Prefers very short AAC phrases. Her parent supports her in public settings like pharmacies and cafés.",
    arDescription: "تفضل عبارات AAC القصيرة جداً. أحد والديها يدعمها في الأماكن العامة كالصيدليات والمقاهي.",
    partnerRole: "parent",
    simpleStyle: true,
    phrases: ["Hi, I use AAC. Please give me a moment.", "Can you help me?", "I need this medicine."],
  },
  {
    id: "ahmad",
    emoji: "👦",
    name: "Ahmad",
    tagline: "14 years old · Cerebral palsy",
    arTagline: "14 سنة · شلل دماغي",
    description: "Uses moderate-length phrases and needs support at family gatherings and social settings.",
    arDescription: "يستخدم عبارات متوسطة الطول ويحتاج إلى دعم في التجمعات العائلية والمواقف الاجتماعية.",
    partnerRole: "caregiver",
    simpleStyle: false,
    phrases: ["Hi, I use AAC. Please give me a moment.", "I would like a coffee please.", "Can you help me?"],
  },
  {
    id: "layla",
    emoji: "👩",
    name: "Layla",
    tagline: "32 years old · ALS",
    arTagline: "32 سنة · التصلب الجانبي الضموري",
    description: "Adult who recently lost speech. Prefers full sentences and uses AAC in both professional and family contexts.",
    arDescription: "بالغة فقدت الكلام مؤخراً. تفضل الجمل الكاملة وتستخدم AAC في السياقات المهنية والعائلية.",
    partnerRole: "caregiver",
    simpleStyle: false,
    phrases: ["Hi, I use AAC. Please give me a moment.", "I would like to ask you something.", "Thank you for your patience."],
  },
  {
    id: "noor",
    emoji: "🧑",
    name: "Noor",
    tagline: "19 years old · Aphasia",
    arTagline: "19 سنة · حبسة كلامية",
    description: "Young adult recovering from stroke. Uses short sentence starters and is often in café or social settings.",
    arDescription: "شاب/ة يتعافى من السكتة الدماغية. يستخدم بوادئ الجمل القصيرة وغالباً في المقهى أو البيئات الاجتماعية.",
    partnerRole: "teacher",
    simpleStyle: true,
    phrases: ["Hi, I use AAC. Please give me a moment.", "I want...", "Can I have..."],
  },
];

const UI_LABELS = {
  en: {
    // Welcome
    welcome: "Welcome",
    welcomeDesc: "Please enter your participant ID to begin the session.",
    participantId: "Participant ID",
    participantPlaceholder: "e.g. P01",
    privacyNote: "No personal data is collected — this ID is used only to link your anonymous responses.",
    startSession: "Start Session →",
    // Header
    headerSubtitle: "Snap a photo · get words · speak — explore how AI can support an AAC user in everyday moments.",
    langToggle: "🌐 العربية",
    // Steps
    steps: ["👤 Profile", "🧠 Generate", "📋 Evaluate", "🔍 Verify", "📊 Evaluate"] as unknown as string[],
    // Scenario card
    scenarioTitle: "Today's scenario: Out in Doha",
    scenarioDesc: "An AAC user needs fast, low-effort support across three real settings.",
    pharmacyScenario: "Pharmacy counter",
    pharmacyScenarioDesc: "Point camera at medicine box → get a short sentence about dosage or a refill.",
    cafeScenario: "Café ordering",
    cafeScenarioDesc: "Point camera at the menu → order independently with AI-suggested words.",
    majlisScenario: "Family gathering / majlis",
    majlisScenarioDesc: "Prepare greetings and topics beforehand so the user can join conversations naturally.",
    // Profile picker
    selectProfile: "Select a demo profile",
    selectProfileDesc: "Choose the AAC user you will be simulating during this session.",
    selectedCheck: "✓ Selected",
    profileLoaded: "Profile loaded",
    partnerLabel: "Partner: ",
    simpleStyleLabel: "Simple style",
    standardStyleLabel: "Standard style",
    phrasesLoaded: " phrases loaded",
    // Buttons / nav
    generateKeywords: "Generate keywords",
    clear: "Clear",
    suggestedKeywords: "Suggested keywords",
    generateSentences: "Generate sentences",
    sentenceOptions: "Sentence options",
    quickNote: "Quick note (what the user is trying to say)",
    generateImage: "Generate verification image",
    clearImage: "Clear image",
    doesMatch: "Does this image match the intended meaning?",
    yes: "Yes",
    no: "No",
    nextGenerate: "Next: Generate →",
    nextEvaluate: "Next: Evaluate →",
    nextVerify: "Next: Verify →",
    nextRate: "Next: Evaluate →",
    back: "← Back",
    // Step 1 — left panel
    addPhotoTitle: "Add photo + context",
    addPhotoDesc: "Set the scene — where, when, and what you need.",
    uploadImage: "Upload image",
    startCamera: "Start camera",
    capturePhoto: "Capture photo",
    stopCamera: "Stop camera",
    removeImage: "Remove image",
    timeLabel: "Time",
    locationLabel: "Location",
    goalLabel: "Goal",
    intentionLabel: "Intention",
    preparedSuggestions: "Prepared suggestions for this location",
    extraContext: "Extra context (optional)",
    extraContextPlaceholder: "Example: asthma med, child is anxious, need a very short sentence",
    // Step 1 — time options
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    night: "Night",
    // Step 1 — location options
    locPharmacy: "Pharmacy",
    locCafe: "Café",
    locMajlis: "Family gathering / majlis",
    // Step 1 — intention options
    intentRequest: "Request",
    intentQuestion: "Question",
    intentConversation: "Conversation",
    // Step 1 — right panel
    keywordsTitle: "Keywords → sentences",
    keywordsDesc: "AI suggests words, then 3 sentence options to pick from.",
    voiceInput: "Voice input could be added here",
    noKeywords: "No keywords yet. Upload an image or capture one from the camera, then generate.",
    addExtraKeywords: "Add extra keywords for sentence generation",
    keywordsPlaceholder: "",
    generatingSentences: "Generating sentences…",
    generate3Sentences: "Generate 3 sentence options",
    sentenceSelected: "Selected",
    noSentences: "Generate sentences to see options.",
    readyToSpeak: "Ready to speak",
    selectSentenceHint: "Select a sentence above.",
    speak: "Speak",
    stop: "Stop",
    // Step 2 — verify
    verifyTitle: "Does the AI get it right?",
    verifyDesc: "Generate an image of what you meant — confirm or reject.",
    quickNotePlaceholder: "",
    pickClosest: "Pick the closest match:",
    noVerifyImage: "No verification image yet.",
    verificationImage: "Verification image",
    generateToPreview: "Generate an image to preview it here.",
    // Stage A — keyword + sentence evaluation (step 2)
    rateTitleA: "Rate the keywords & sentences",
    rateDescA: "How well did the AI support word and sentence generation?",
    qa1: "How relevant were the generated keywords to your communication goal?",
    qa2: "How useful were the sentence options for what you wanted to say?",
    qa3: "How easy was it to generate a sentence for this situation?",
    qa4: "How would you rate the speed of the AI output?",
    // Stage B — image evaluation (step 4)
    rateTitleB: "Rate the image verification",
    rateDescB: "How well did the AI image help confirm your intended meaning?",
    qb1: "How accurately did the image represent your intended meaning?",
    qb2: "How helpful was the image verification for confirming your intent?",
    qb3: "How likely are you to use this feature to convey your message?",
    additionalComments: "Additional comments",
    commentsPlaceholder: "Any other thoughts, reactions, or feedback...",
    saving: "Saving…",
    submit: "Submit",
    submitted: "Submitted!",
    // Footer
    footer: "Qatar AAC AI Design Probe · Workshop prototype",
  },
  ar: {
    // Welcome
    welcome: "أهلاً بك",
    welcomeDesc: "يرجى إدخال رقم المشارك للبدء.",
    participantId: "رقم المشارك",
    participantPlaceholder: "مثال: P01",
    privacyNote: "لا يتم جمع بيانات شخصية — يُستخدم هذا الرقم فقط لربط إجاباتك المجهولة.",
    startSession: "ابدأ الجلسة ←",
    // Header
    headerSubtitle: "التقط صورة · احصل على كلمات · تحدث — استكشف كيف يمكن للذكاء الاصطناعي دعم مستخدم AAC في لحظات يومية.",
    langToggle: "🌐 English",
    // Steps
    steps: ["👤 الملف", "🧠 توليد", "📋 تقييم", "🔍 تحقق", "📊 تقييم"] as unknown as string[],
    // Scenario card
    scenarioTitle: "سيناريو اليوم: خارج في الدوحة",
    scenarioDesc: "مستخدم AAC يحتاج إلى دعم سريع وسهل في ثلاثة أماكن حقيقية.",
    pharmacyScenario: "طاولة الصيدلية",
    pharmacyScenarioDesc: "وجّه الكاميرا نحو علبة الدواء ← احصل على جملة قصيرة عن الجرعة أو إعادة الصرف.",
    cafeScenario: "طلب في المقهى",
    cafeScenarioDesc: "وجّه الكاميرا نحو القائمة ← اطلب باستقلالية بكلمات مقترحة من الذكاء الاصطناعي.",
    majlisScenario: "تجمع عائلي / مجلس",
    majlisScenarioDesc: "جهّز التحيات والمواضيع مسبقاً ليتمكن المستخدم من المشاركة في المحادثات بشكل طبيعي.",
    // Profile picker
    selectProfile: "اختر ملفاً تجريبياً",
    selectProfileDesc: "اختر مستخدم AAC الذي ستمثله خلال هذه الجلسة.",
    selectedCheck: "✓ محدد",
    profileLoaded: "تم تحميل الملف",
    partnerLabel: "الشريك: ",
    simpleStyleLabel: "أسلوب بسيط",
    standardStyleLabel: "أسلوب معتاد",
    phrasesLoaded: " عبارة محملة",
    // Buttons / nav
    generateKeywords: "توليد الكلمات",
    clear: "مسح",
    suggestedKeywords: "الكلمات المقترحة",
    generateSentences: "توليد الجمل",
    sentenceOptions: "خيارات الجملة",
    quickNote: "ملاحظة سريعة (ماذا يريد المستخدم أن يقول)",
    generateImage: "توليد صورة للتحقق",
    clearImage: "مسح الصورة",
    doesMatch: "هل تطابق هذه الصورة المعنى المقصود؟",
    yes: "نعم",
    no: "لا",
    nextGenerate: "التالي: توليد ←",
    nextEvaluate: "التالي: تقييم ←",
    nextVerify: "التالي: تحقق ←",
    nextRate: "التالي: تقييم ←",
    back: "رجوع →",
    // Step 1 — left panel
    addPhotoTitle: "أضف صورة + سياق",
    addPhotoDesc: "حدد المشهد — أين، متى، وماذا تحتاج.",
    uploadImage: "رفع صورة",
    startCamera: "تشغيل الكاميرا",
    capturePhoto: "التقاط صورة",
    stopCamera: "إيقاف الكاميرا",
    removeImage: "إزالة الصورة",
    timeLabel: "الوقت",
    locationLabel: "الموقع",
    goalLabel: "الهدف",
    intentionLabel: "النية",
    preparedSuggestions: "اقتراحات جاهزة لهذا الموقع",
    extraContext: "سياق إضافي (اختياري)",
    extraContextPlaceholder: "مثال: دواء الربو، الطفل قلق، أحتاج جملة قصيرة جداً",
    // Step 1 — time options
    morning: "صباح",
    afternoon: "بعد الظهر",
    evening: "مساء",
    night: "ليل",
    // Step 1 — location options
    locPharmacy: "صيدلية",
    locCafe: "مقهى",
    locMajlis: "تجمع عائلي / مجلس",
    // Step 1 — intention options
    intentRequest: "طلب",
    intentQuestion: "سؤال",
    intentConversation: "محادثة",
    // Step 1 — right panel
    keywordsTitle: "الكلمات ← الجمل",
    keywordsDesc: "الذكاء الاصطناعي يقترح كلمات، ثم 3 خيارات جمل للاختيار.",
    voiceInput: "يمكن إضافة الإدخال الصوتي هنا",
    noKeywords: "لا توجد كلمات بعد. ارفع صورة أو التقط واحدة، ثم ولّد.",
    addExtraKeywords: "أضف كلمات إضافية لتوليد الجمل",
    keywordsPlaceholder: "",
    generatingSentences: "جارٍ توليد الجمل…",
    generate3Sentences: "توليد 3 خيارات جمل",
    sentenceSelected: "محددة",
    noSentences: "ولّد جملاً لرؤية الخيارات.",
    readyToSpeak: "جاهز للكلام",
    selectSentenceHint: "اختر جملة من الأعلى.",
    speak: "تحدث",
    stop: "إيقاف",
    // Step 2 — verify
    verifyTitle: "هل أصاب الذكاء الاصطناعي؟",
    verifyDesc: "ولّد صورة لما قصدته — أكّد أو ارفض.",
    quickNotePlaceholder: "",
    pickClosest: "اختر الأقرب:",
    noVerifyImage: "لا توجد صورة للتحقق بعد.",
    verificationImage: "صورة التحقق",
    generateToPreview: "ولّد صورة لمعاينتها هنا.",
    // Stage A — keyword + sentence evaluation (step 2)
    rateTitleA: "قيّم الكلمات والجمل",
    rateDescA: "كيف دعم الذكاء الاصطناعي توليد الكلمات والجمل؟",
    qa1: "ما مدى ملاءمة الكلمات المقترحة لهدف تواصلك؟",
    qa2: "ما مدى فائدة خيارات الجمل لما أردت قوله؟",
    qa3: "ما مدى سهولة توليد جملة في هذا الموقف؟",
    qa4: "كيف تقيّم سرعة مخرجات الذكاء الاصطناعي؟",
    // Stage B — image evaluation (step 4)
    rateTitleB: "قيّم التحقق بالصورة",
    rateDescB: "كيف ساعدت صورة الذكاء الاصطناعي في تأكيد معناك المقصود؟",
    qb1: "ما مدى دقة الصورة في تمثيل معناك المقصود؟",
    qb2: "ما مدى فائدة التحقق بالصورة في تأكيد قصدك؟",
    qb3: "ما مدى احتمال استخدامك لهذه الميزة لنقل رسالتك؟",
    additionalComments: "تعليقات إضافية",
    commentsPlaceholder: "أي أفكار أو ردود فعل أو ملاحظات أخرى...",
    saving: "جارٍ الحفظ…",
    submit: "إرسال",
    submitted: "تم الإرسال!",
    // Footer
    footer: "مسبار تصميم AAC بالذكاء الاصطناعي في قطر · نموذج أولي للورشة",
  },
} as const;

export default function QatarAACProbePrototype() {
  const [participantId, setParticipantId] = useState("");
  const [participantIdInput, setParticipantIdInput] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [partnerRole, setPartnerRole] = useState("parent");
  const [language, setLanguage] = useState("en");
  const [simpleStyle, setSimpleStyle] = useState(true);
  const [phraseBank, setPhraseBank] = useState([
    { id: "p1", text: "Hi, I use AAC. Please give me a moment." },
    { id: "p2", text: "Please speak slowly." },
    { id: "p3", text: "Can you repeat that, please?" },
  ]);

  const [topicPackLocation, setTopicPackLocation] = useState("majlis");
  const [topicPackInput, setTopicPackInput] = useState("");
  const [locationPhraseBank, setLocationPhraseBank] = useState<
    Record<string, { id: string; text: string; arText: string }[]>
  >({
    majlis: [
      { id: "m1", text: "Eid Mubarak", arText: "عيد مبارك" },
      { id: "m2", text: "How are you?", arText: "كيف حالك؟" },
      { id: "m3", text: "I want to talk about football.", arText: "أريد أن أتحدث عن كرة القدم." },
    ],
    school: [
      { id: "s1", text: "I forgot my book today.", arText: "نسيت كتابي اليوم." },
      { id: "s2", text: "Can you explain that again?", arText: "هل يمكنك شرح ذلك مرة أخرى؟" },
    ],
    pharmacy: [
      { id: "ph1", text: "I want to ask about the dose.", arText: "أريد السؤال عن الجرعة." },
      { id: "ph2", text: "I need a refill for this medicine.", arText: "أحتاج إلى إعادة تعبئة هذا الدواء." },
    ],
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "sample" | "camera">("upload");
  const [imagePreview, setImagePreview] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("afternoon");
  const [location, setLocation] = useState("pharmacy");
  const [goal, setGoal] = useState("ask dose");
  const [freeContext, setFreeContext] = useState("");
  const [intention, setIntention] = useState("request");

  const [notes, setNotes] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [likertASubmitted, setLikertASubmitted] = useState(false);
  const [likertBSubmitted, setLikertBSubmitted] = useState(false);
  const [likertBSaving, setLikertBSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [verifyImageUrl, setVerifyImageUrl] = useState("");

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyDecision, setVerifyDecision] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<{ text: string; imageUrl: string }[]>([]);
  const [altLoading, setAltLoading] = useState(false);

  const [kwLoading, setKwLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [customKw, setCustomKw] = useState("");

  const [sentLoading, setSentLoading] = useState(false);
  const [sentences, setSentences] = useState<string[]>([]);
  const [selectedSentence, setSelectedSentence] = useState("");

  const [likertA, setLikertA] = useState({ keywordRelevance: 1, sentenceUsefulness: 1, ease: 1, speed: 1 });
  const [likertB, setLikertB] = useState({ imageAccuracy: 1, helpfulness: 1, likelihood: 1 });

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const style = simpleStyle ? "simple" : "rich";
  const t = UI_LABELS[language as "en" | "ar"] ?? UI_LABELS.en;

  const availableGoals = useMemo(
    () => goalsByLocation[location] || goalsByLocation.pharmacy,
    [location],
  );

  const locationSpecificPhrases = useMemo(
    () => locationPhraseBank[location] || [],
    [locationPhraseBank, location],
  );

  const context = useMemo(
    () => ({
      timeOfDay,
      location,
      partnerRole,
      goal,
      freeContext,
    }),
    [timeOfDay, location, partnerRole, goal, freeContext],
  );

  useEffect(() => {
    const allowed = goalsByLocation[location] || goalsByLocation.pharmacy;
    if (!allowed.some((g) => g.value === goal)) {
      setGoal(allowed[0].value);
    }
  }, [location, goal]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, [cameraStream]);

  async function onSelectSample(src: string) {
    setKeywords([]);
    setSentences([]);
    setSelectedSentence("");
    const res = await fetch(src);
    const blob = await res.blob();
    const file = new File([blob], src.split("/").pop() || "sample", { type: blob.type });
    const dataUrl = await toBase64(file);
    setImageFile(file);
    setImagePreview(dataUrl);
  }

  async function onPickImage(file: File | null) {
    setImageFile(file);
    setKeywords([]);
    setSentences([]);
    setSelectedSentence("");
    if (!file) {
      setImagePreview("");
      return;
    }
    const dataUrl = await toBase64(file);
    setImagePreview(dataUrl);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setCameraStream(stream);
      setCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera access failed:", error);
      alert("Could not access the camera. Please allow camera permission.");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setCameraOn(false);
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    setImagePreview(dataUrl);
    setImageFile(null);
    setKeywords([]);
    setSentences([]);
    setSelectedSentence("");
  }

  async function runVerifyImage() {
    setVerifyLoading(true);
    setVerifyDecision(null);
    try {
      const prompt = notes || "User note";
      const out = await api.generateImage({ prompt });
      setVerifyImageUrl(out.url);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function runKeywords() {
    setKwLoading(true);
    try {
      const imageDataUrl = imagePreview || "";
      const typedKeywords = customKw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const out = await api.imageToKeywords({
        imageDataUrl,
        context,
        customKeywords: typedKeywords,
        language,
      });

      setKeywords(out.keywords || []);
    } catch (error) {
      console.error(error);
      alert("Keyword generation failed.");
    } finally {
      setKwLoading(false);
    }
  }

  async function runSentences() {
    setSentLoading(true);
    try {
      const mergedKeywords = [
        ...keywords,
        ...customKw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ];

      const uniqueKeywords = Array.from(new Set(mergedKeywords)).slice(0, 8);

      const out = await api.keywordsToSentences({
        keywords: uniqueKeywords,
        context,
        language,
        style,
        intention,
      });

      setSentences(out.sentences || []);
      setSelectedSentence(out.sentences?.[0] || "");
    } catch (error) {
      console.error(error);
      alert("Sentence generation failed.");
    } finally {
      setSentLoading(false);
    }
  }

  function addPhrase(text: string) {
    const t = text?.trim();
    if (!t) return;
    setPhraseBank((p) => [{ id: `p_${Date.now()}`, text: t }, ...p]);
  }

  function addLocationPhrase(text: string, targetLocation: string) {
    const t = text?.trim();
    if (!t) return;
    setLocationPhraseBank((prev) => ({
      ...prev,
      [targetLocation]: [
        { id: `${targetLocation}_${Date.now()}`, text: t, arText: t },
        ...(prev[targetLocation] || []),
      ],
    }));
  }

  function removeLocationPhrase(targetLocation: string, id: string) {
    setLocationPhraseBank((prev) => ({
      ...prev,
      [targetLocation]: (prev[targetLocation] || []).filter(
        (item) => item.id !== id,
      ),
    }));
  }

  function speakSelectedSentence() {
    if (!selectedSentence || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selectedSentence);
    utterance.lang = language === "ar" ? "ar-SA" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }

  async function fetchAlternatives() {
    setAltLoading(true);
    setAlternatives([]);
    try {
      const res = await fetch("/api/suggest-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: notes, language }),
      });
      const { alternatives: texts } = await res.json();

      const images = await Promise.all(
        (texts as string[]).map(async (text: string) => {
          const r = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text }),
          });
          const { url } = await r.json();
          return { text, imageUrl: url as string };
        }),
      );
      setAlternatives(images);
    } catch (err) {
      console.error("fetchAlternatives error:", err);
    } finally {
      setAltLoading(false);
    }
  }

  function submitLikertA() {
    // Just mark stage A as done — data is held in state until the final save
    setLikertASubmitted(true);
  }

  async function submitLikertB() {
    setLikertBSaving(true);
    try {
      await fetch("/api/save-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          profile: { name: profileName, partnerRole, language, style },
          scenario: { location, goal: context.goal, intention, timeOfDay: context.timeOfDay },
          keywords,
          selectedSentence,
          verifyDecision,
          evaluationA: likertA,
          evaluationB: likertB,
          additionalComments,
          submittedAt: new Date().toISOString(),
        }),
      });
      setLikertBSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Could not save — check the server is running.");
    } finally {
      setLikertBSaving(false);
    }
  }

  if (!participantId) {
    return (
      <div className="min-h-screen w-full bg-sky-50 flex items-center justify-center p-6" dir={language === "ar" ? "rtl" : "ltr"}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl shadow-lg border-0">
            <CardHeader className="rounded-t-3xl bg-gradient-to-r from-blue-800 to-blue-600 p-8 text-white">
              <CardTitle className="text-2xl font-bold">{t.welcome}</CardTitle>
              <CardDescription className="text-blue-200 text-base mt-1">
                {t.welcomeDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pid" className="text-sm font-medium text-slate-700">
                  {t.participantId}
                </Label>
                <Input
                  id="pid"
                  placeholder={t.participantPlaceholder}
                  value={participantIdInput}
                  onChange={(e) => setParticipantIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && participantIdInput.trim()) {
                      setParticipantId(participantIdInput.trim());
                    }
                  }}
                  className="rounded-xl text-base h-12"
                />
                <p className="text-xs text-muted-foreground">
                  {t.privacyNote}
                </p>
              </div>
              <Button
                className="w-full rounded-2xl bg-blue-700 hover:bg-blue-600 py-6 text-base font-semibold"
                disabled={!participantIdInput.trim()}
                onClick={() => setParticipantId(participantIdInput.trim())}
              >
                {t.startSession}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-sky-50 p-4 md:p-8" dir={language === "ar" ? "rtl" : "ltr"}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl space-y-6"
      >
        <header className="flex flex-col gap-3 rounded-3xl bg-gradient-to-r from-blue-800 to-blue-600 p-8 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💬</span>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                AAC AI Workshop
              </h1>
            </div>
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              {t.langToggle}
            </button>
          </div>
          <p className="max-w-xl text-blue-200 text-base">
            {t.headerSubtitle}
          </p>
        </header>

        {/* Step navigator */}
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="flex items-center">
            {t.steps.map((label, i) => (
              <React.Fragment key={i}>
                <button onClick={() => setStep(i)} className="flex flex-col items-center gap-1.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-colors ${step === i ? "bg-blue-700 text-white" : step > i ? "bg-blue-200 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                    {step > i ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${step === i ? "text-blue-700" : "text-muted-foreground"}`}>{label}</span>
                </button>
                {i < 4 && <div className={`h-0.5 flex-1 mx-3 mb-5 transition-colors ${step > i ? "bg-blue-300" : "bg-slate-200"}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 0: Profile + Location */}
        {step === 0 && (
        <>
          {/* 1 — Profile picker */}
          <Card className="rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-sm">1</div>
              <div>
                <CardTitle className="text-lg">{t.selectProfile}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{t.selectProfileDesc}</p>
              </div>
            </div>
            <CardContent className="pt-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {DEMO_PROFILES.map((profile) => {
                  const isSelected = selectedProfileId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfileId(profile.id);
                        setProfileName(profile.name);
                        setPartnerRole(profile.partnerRole);
                        setSimpleStyle(profile.simpleStyle);
                        setPhraseBank(profile.phrases.map((text) => ({ id: crypto.randomUUID(), text })));
                      }}
                      className={`rounded-2xl border-2 p-5 text-left transition-all space-y-2 ${
                        isSelected
                          ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700/20"
                          : "border-transparent bg-slate-50 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      <div className="text-4xl">{profile.emoji}</div>
                      <div>
                        <div className="font-semibold text-base">{profile.name}</div>
                        <div className="text-xs text-blue-700 font-medium mt-0.5">{language === "ar" ? profile.arTagline : profile.tagline}</div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{language === "ar" ? profile.arDescription : profile.description}</p>
                      {isSelected && <div className="text-xs font-semibold text-blue-700 pt-1">{t.selectedCheck}</div>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 2 — Location / scenario picker */}
          <Card className="rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-sm">2</div>
              <div>
                <CardTitle className="text-lg">{language === "ar" ? "اختر السيناريو" : "Select a scenario"}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{language === "ar" ? "أين سيكون التفاعل؟" : "Where will the interaction take place?"}</p>
              </div>
            </div>
            <CardContent className="grid gap-4 md:grid-cols-3 pt-5">
              {[
                { value: "pharmacy", emoji: "💊", label: t.pharmacyScenario, desc: t.pharmacyScenarioDesc, bg: "bg-blue-50 border-blue-100", sel: "border-blue-700 bg-blue-50 ring-2 ring-blue-700/20" },
                { value: "cafe",     emoji: "☕", label: t.cafeScenario,     desc: t.cafeScenarioDesc,     bg: "bg-sky-50 border-sky-100",   sel: "border-blue-700 bg-sky-50 ring-2 ring-blue-700/20" },
                { value: "majlis",   emoji: "🏡", label: t.majlisScenario,   desc: t.majlisScenarioDesc,   bg: "bg-slate-100 border-slate-200", sel: "border-blue-700 bg-slate-100 ring-2 ring-blue-700/20" },
              ].map((loc) => {
                const isSelected = selectedLocationId === loc.value;
                return (
                  <button
                    key={loc.value}
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(loc.value);
                      setLocation(loc.value);
                    }}
                    className={`rounded-xl border-2 p-5 text-left transition-all space-y-2 ${
                      isSelected ? loc.sel : `border-transparent ${loc.bg} hover:border-blue-300`
                    }`}
                  >
                    <div className="text-3xl">{loc.emoji}</div>
                    <div className="font-semibold text-sm">{loc.label}</div>
                    <p className="text-xs text-muted-foreground">{loc.desc}</p>
                    {isSelected && <div className="text-xs font-semibold text-blue-700 pt-1">{t.selectedCheck}</div>}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Summary + next */}
          {selectedProfileId && selectedLocationId && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-wrap gap-3 items-center text-xs text-blue-700">
              <span className="font-medium text-blue-800">{t.profileLoaded}:</span>
              <span className="rounded-full bg-blue-100 px-3 py-1">{profileName}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1">{t.partnerLabel}{language === "ar" ? (PARTNER_ROLE_AR[partnerRole] ?? partnerRole) : partnerRole}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1">{simpleStyle ? t.simpleStyleLabel : t.standardStyleLabel}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1">📍 {SAMPLE_IMAGES[selectedLocationId] ? (language === "ar" ? { pharmacy: "صيدلية", cafe: "مقهى", majlis: "مجلس" }[selectedLocationId] : { pharmacy: "Pharmacy", cafe: "Café", majlis: "Majlis" }[selectedLocationId]) : selectedLocationId}</span>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-2">
            <Button
              onClick={() => setStep(1)}
              disabled={!selectedProfileId || !selectedLocationId}
              className="rounded-2xl bg-blue-700 hover:bg-blue-600 px-10 py-6 text-base font-semibold disabled:opacity-40"
            >
              {t.nextGenerate}
            </Button>
          </div>
        </>
        )}

        {step === 1 && (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-lg">
                    1
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> {t.addPhotoTitle}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.addPhotoDesc}
                    </p>
                  </div>
                </div>
                <CardContent className="space-y-4">
                  {/* Input mode tabs */}
                  <div className="flex rounded-xl border overflow-hidden text-sm font-medium">
                    {(["upload", "sample", "camera"] as const).map((mode) => {
                      const labels = {
                        upload:  language === "ar" ? "رفع صورة" : "Upload",
                        sample:  language === "ar" ? "أمثلة" : "Samples",
                        camera:  language === "ar" ? "كاميرا" : "Camera",
                      };
                      const icons = { upload: "📁", sample: "🖼️", camera: "📷" };
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setInputMode(mode)}
                          className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                            inputMode === mode
                              ? "bg-blue-700 text-white"
                              : "bg-white text-slate-600 hover:bg-blue-50"
                          }`}
                        >
                          <span>{icons[mode]}</span>
                          {labels[mode]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Upload */}
                  {inputMode === "upload" && (
                    <div className="grid gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onPickImage(e.target.files?.[0] || null)}
                      />
                    </div>
                  )}

                  {/* Sample gallery */}
                  {inputMode === "sample" && (
                    <div className="grid grid-cols-2 gap-3">
                      {(SAMPLE_IMAGES[location] ?? []).length === 0 ? (
                        <p className="col-span-2 text-sm text-muted-foreground">
                          {language === "ar" ? "لا توجد أمثلة لهذا الموقع." : "No samples for this location."}
                        </p>
                      ) : (
                        (SAMPLE_IMAGES[location] ?? []).map((s) => (
                          <button
                            key={s.src}
                            type="button"
                            onClick={() => onSelectSample(s.src)}
                            className={`rounded-xl border-2 overflow-hidden text-left transition-all ${
                              imagePreview && imagePreview.length > 100 && imageFile?.name === s.src.split("/").pop()
                                ? "border-blue-700 ring-2 ring-blue-700/20"
                                : "border-transparent hover:border-blue-300"
                            }`}
                          >
                            <img src={s.src} alt={s.label} className="w-full aspect-square object-cover" />
                            <div className="px-2 py-1 text-xs font-medium text-slate-600">
                              {language === "ar" ? s.arLabel : s.label}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Camera */}
                  {inputMode === "camera" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={startCamera} className="rounded-xl">
                          <Camera className="mr-2 h-4 w-4" />{t.startCamera}
                        </Button>
                        <Button type="button" variant="secondary" onClick={capturePhoto} className="rounded-xl">
                          <ImageIcon className="mr-2 h-4 w-4" />{t.capturePhoto}
                        </Button>
                        <Button type="button" variant="outline" onClick={stopCamera} className="rounded-xl">
                          <CameraOff className="mr-2 h-4 w-4" />{t.stopCamera}
                        </Button>
                      </div>
                      {cameraOn && (
                        <div className="overflow-hidden rounded-2xl border">
                          <video ref={videoRef} autoPlay playsInline muted className="h-auto w-full" />
                        </div>
                      )}
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />

                  {imagePreview && inputMode !== "sample" && (
                    <div className="mt-4 flex flex-col gap-2">
                      <img
                        src={imagePreview}
                        className="rounded-xl w-full max-w-md"
                      />

                      <Button
                        variant="destructive"
                        onClick={() => {
                          setImagePreview("");
                          setKeywords([]);
                          setSentences([]);
                          setSelectedSentence("");
                        }}
                        className="w-fit rounded-xl"
                      >
                        {t.removeImage}
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {t.timeLabel}
                      </Label>
                      <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">{t.morning}</SelectItem>
                          <SelectItem value="afternoon">{t.afternoon}</SelectItem>
                          <SelectItem value="evening">{t.evening}</SelectItem>
                          <SelectItem value="night">{t.night}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {t.locationLabel}
                      </Label>
                      <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {{ pharmacy: "💊", cafe: "☕", majlis: "🏡" }[location] ?? "📍"}
                        <span>{{ pharmacy: t.locPharmacy, cafe: t.locCafe, majlis: t.locMajlis }[location] ?? location}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>{t.intentionLabel}</Label>
                      <Select value={intention} onValueChange={setIntention}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="request">{t.intentRequest}</SelectItem>
                          <SelectItem value="question">{t.intentQuestion}</SelectItem>
                          <SelectItem value="conversation">{t.intentConversation}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {locationSpecificPhrases.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t.preparedSuggestions}</Label>
                      <div className="flex flex-wrap gap-2">
                        {locationSpecificPhrases.map((item) => (
                          <Button
                            key={item.id}
                            type="button"
                            variant="secondary"
                            className="rounded-xl"
                            onClick={() => {
                              const display = language === "ar" ? item.arText : item.text;
                              setFreeContext((prev) =>
                                prev.trim()
                                  ? `${prev}${prev.trim().endsWith(".") ? " " : "; "}${display}`
                                  : display,
                              );
                            }}
                          >
                            {language === "ar" ? item.arText : item.text}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              <Card className="rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-b px-6 py-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-800 text-white font-bold text-lg">
                    2
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> {t.keywordsTitle}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.keywordsDesc}
                    </p>
                  </div>
                </div>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={runKeywords}
                      disabled={!imagePreview || kwLoading}
                      className="rounded-xl"
                    >
                      {kwLoading ? "…" : t.generateKeywords}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setKeywords([])}
                      className="rounded-xl"
                    >
                      {t.clear}
                    </Button>
                    <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <Mic className="h-4 w-4" /> {t.voiceInput}
                    </div>
                  </div>

                  <div className="rounded-2xl border p-3">
                    <div className="mb-2 text-sm font-medium">
                      {t.suggestedKeywords}
                    </div>
                    {keywords.length ? (
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((k) => (
                          <Badge
                            key={k}
                            variant="secondary"
                            className="flex items-center gap-1 rounded-xl pr-1"
                          >
                            <span>{k}</span>
                            <button
                              type="button"
                              className="ml-1 rounded-full p-0.5 hover:bg-background"
                              onClick={() =>
                                setKeywords((prev) =>
                                  prev.filter((item) => item !== k),
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {t.noKeywords}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label>{t.addExtraKeywords}</Label>
                    <Input
                      value={customKw}
                      onChange={(e) => setCustomKw(e.target.value)}
                      placeholder={t.keywordsPlaceholder}
                    />
                  </div>

                  <Button
                    onClick={runSentences}
                    disabled={
                      (!keywords.length && !customKw.trim()) || sentLoading
                    }
                    className="w-full rounded-xl"
                  >
                    {sentLoading
                      ? t.generatingSentences
                      : t.generate3Sentences}
                  </Button>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t.sentenceOptions}</div>
                    {sentences.length ? (
                      <div className="space-y-2">
                        {sentences.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedSentence(s)}
                            className={`w-full rounded-2xl border p-3 text-left transition ${
                              selectedSentence === s
                                ? "border-blue-700 ring-2 ring-blue-700/20"
                                : "hover:bg-muted"
                            }`}
                          >
                            <div className="text-sm leading-relaxed">{s}</div>
                            {selectedSentence === s && (
                              <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                                <Check className="h-3 w-3" /> {t.sentenceSelected}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {t.noSentences}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-semibold flex items-center gap-1">
                      🔊 {t.readyToSpeak}
                    </div>
                    <div
                      className={`rounded-2xl border-2 p-4 text-base font-medium leading-relaxed transition-colors ${selectedSentence ? "border-blue-300 bg-blue-50 text-blue-800" : "border-dashed"}`}
                    >
                      {selectedSentence || (
                        <span className="text-muted-foreground text-sm font-normal">
                          {t.selectSentenceHint}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="rounded-xl"
                        disabled={!selectedSentence}
                        onClick={speakSelectedSentence}
                      >
                        <Volume2 className="mr-2 h-4 w-4" /> {t.speak}
                      </Button>
                      <Button
                        variant="secondary"
                        className="rounded-xl"
                        onClick={stopSpeaking}
                      >
                        <Square className="mr-2 h-4 w-4" /> {t.stop}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          <div className="flex justify-center gap-4 pt-2">
            <Button onClick={() => setStep(0)} variant="outline" className="rounded-2xl px-10 py-6 text-base font-semibold">{t.back}</Button>
            <Button onClick={() => setStep(2)} className="rounded-2xl bg-blue-700 hover:bg-blue-600 px-10 py-6 text-base font-semibold">{t.nextEvaluate}</Button>
          </div>
        </div>
        )}

        {step === 3 && (
        <div className="space-y-6">
            <Card className="rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-100 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <CardTitle className="text-lg">
                    {t.verifyTitle}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t.verifyDesc}
                  </p>
                </div>
              </div>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t.quickNote}</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.quickNotePlaceholder}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="rounded-xl bg-blue-700 hover:bg-blue-600"
                      onClick={runVerifyImage}
                      disabled={!notes.trim() || verifyLoading}
                    >
                      {verifyLoading ? "…" : t.generateImage}
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        setVerifyImageUrl("");
                        setVerifyDecision(null);
                      }}
                      disabled={!verifyImageUrl}
                    >
                      {t.clearImage}
                    </Button>
                  </div>

                  {verifyImageUrl ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {t.doesMatch}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className={`rounded-xl ${verifyDecision === "yes" ? "bg-blue-700 hover:bg-blue-600 text-white" : "border border-blue-200 text-blue-700 hover:bg-blue-50 bg-white"}`}
                          onClick={() => setVerifyDecision("yes")}
                        >
                          <Check className="mr-2 h-4 w-4" /> {t.yes}
                        </Button>
                        <Button
                          className={`rounded-xl ${verifyDecision === "no" ? "bg-blue-800 hover:bg-blue-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"}`}
                          onClick={() => { setVerifyDecision("no"); fetchAlternatives(); }}
                        >
                          <X className="mr-2 h-4 w-4" /> {t.no}
                        </Button>
                      </div>

                      {verifyDecision === "no" && (
                        <div className="space-y-3 pt-1">
                          <div className="text-sm font-medium">{t.pickClosest}</div>
                          {altLoading ? (
                            <div className="grid grid-cols-3 gap-3">
                              {[0, 1, 2].map((i) => (
                                <div key={i} className="rounded-2xl border bg-slate-50 animate-pulse aspect-square" />
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              {alternatives.map((alt) => (
                                <button
                                  key={alt.text}
                                  onClick={() => {
                                    setVerifyImageUrl(alt.imageUrl);
                                    setVerifyDecision("yes");
                                    setAlternatives([]);
                                  }}
                                  className="flex flex-col items-center gap-2 rounded-2xl border p-2 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                >
                                  <img src={alt.imageUrl} alt={alt.text} className="w-full rounded-xl object-cover aspect-square" />
                                  <span className="text-xs text-muted-foreground leading-tight">{alt.text}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      {t.noVerifyImage}
                    </div>
                  )}
                </div>

                {verifyImageUrl && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">{t.verificationImage}</div>
                    <div className="overflow-hidden rounded-2xl border">
                      <img
                        src={verifyImageUrl}
                        alt="verification"
                        className="h-auto w-full"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          <div className="flex justify-center gap-4 pt-2">
            <Button onClick={() => setStep(2)} variant="outline" className="rounded-2xl px-10 py-6 text-base font-semibold">{t.back}</Button>
            <Button onClick={() => setStep(4)} className="rounded-2xl bg-blue-700 hover:bg-blue-600 px-10 py-6 text-base font-semibold">{t.nextRate}</Button>
          </div>
        </div>
        )}

        {/* Step 2 — Evaluate A: keywords + sentences */}
        {step === 2 && (
        <div className="space-y-6">
          <Card className="rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <CardTitle className="text-lg">{t.rateTitleA}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{t.rateDescA}</p>
              </div>
            </div>
            <CardContent className="space-y-5 pt-5">
              <LikertItem
                title={t.qa1}
                value={likertA.keywordRelevance}
                labels={likertLabels.keywordRelevance}
                onChange={(v) => setLikertA((x) => ({ ...x, keywordRelevance: v }))}
              />
              <LikertItem
                title={t.qa2}
                value={likertA.sentenceUsefulness}
                labels={likertLabels.sentenceHelpfulness}
                onChange={(v) => setLikertA((x) => ({ ...x, sentenceUsefulness: v }))}
              />
              <LikertItem
                title={t.qa3}
                value={likertA.ease}
                labels={likertLabels.ease}
                onChange={(v) => setLikertA((x) => ({ ...x, ease: v }))}
              />
              <LikertItem
                title={t.qa4}
                value={likertA.speed}
                labels={likertLabels.speed}
                onChange={(v) => setLikertA((x) => ({ ...x, speed: v }))}
              />

              {!likertASubmitted ? (
                <Button className="w-full rounded-xl bg-blue-700 hover:bg-blue-600" onClick={submitLikertA}>
                  {t.submit}
                </Button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
                  <Check className="h-4 w-4 shrink-0" /> {t.submitted}
                </motion.div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-center gap-4 pt-2">
            <Button onClick={() => setStep(1)} variant="outline" className="rounded-2xl px-10 py-6 text-base font-semibold">{t.back}</Button>
            <Button onClick={() => setStep(3)} className="rounded-2xl bg-blue-700 hover:bg-blue-600 px-10 py-6 text-base font-semibold">{t.nextVerify}</Button>
          </div>
        </div>
        )}

        {/* Step 4 — Evaluate B: image verification */}
        {step === 4 && (
        <div className="space-y-6">
          <Card className="rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <CardTitle className="text-lg">{t.rateTitleB}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{t.rateDescB}</p>
              </div>
            </div>
            <CardContent className="space-y-5 pt-5">
              <LikertItem
                title={t.qb1}
                value={likertB.imageAccuracy}
                labels={likertLabels.imageAccuracy}
                onChange={(v) => setLikertB((x) => ({ ...x, imageAccuracy: v }))}
              />
              <LikertItem
                title={t.qb2}
                value={likertB.helpfulness}
                labels={likertLabels.helpfulness}
                onChange={(v) => setLikertB((x) => ({ ...x, helpfulness: v }))}
              />
              <LikertItem
                title={t.qb3}
                value={likertB.likelihood}
                labels={likertLabels.likelihood}
                onChange={(v) => setLikertB((x) => ({ ...x, likelihood: v }))}
              />

              <div className="space-y-1">
                <Label className="text-sm font-medium">{t.additionalComments}</Label>
                <Textarea
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder={t.commentsPlaceholder}
                  className="rounded-2xl min-h-[100px]"
                />
              </div>

              {!likertBSubmitted ? (
                <Button className="w-full rounded-xl bg-blue-700 hover:bg-blue-600" onClick={submitLikertB} disabled={likertBSaving}>
                  {likertBSaving ? t.saving : t.submit}
                </Button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
                  <Check className="h-4 w-4 shrink-0" /> {t.submitted}
                </motion.div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-center pt-2">
            <Button onClick={() => setStep(3)} variant="outline" className="rounded-2xl px-10 py-6 text-base font-semibold">{t.back}</Button>
          </div>
        </div>
        )}

        <footer className="text-center text-xs text-muted-foreground py-2">
          {t.footer}
        </footer>
      </motion.div>
    </div>
  );
}

function LikertItem({
  title,
  value,
  labels,
  onChange,
  min = 1,
  max = 5,
}: {
  title: string;
  value: number;
  labels: string[];
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-2 rounded-2xl border p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1">
          <Slider
            value={[value]}
            min={min}
            max={max}
            step={1}
            onValueChange={(v) => onChange(v?.[0] ?? min)}
            className="w-full"
          />
          <div className="flex justify-between px-2.5 text-xs text-muted-foreground">
            {ticks.map((n) => (
              <span key={n} className={n === value ? "font-semibold text-blue-700" : ""}>
                {n}
              </span>
            ))}
          </div>
        </div>
        <Badge className="rounded-xl" variant="secondary">
          {value}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">{labels[value - 1]}</div>
    </div>
  );
}
