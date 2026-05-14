"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Image as ImageIcon,
  Sparkles,
  Check,
  X,
  MapPin,
  Volume2,
  Square,
  Camera,
  CameraOff,
  RefreshCw,
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
  agree: [
    "1 – Strongly disagree",
    "2 – Disagree",
    "3 – Neutral",
    "4 – Agree",
    "5 – Strongly agree",
  ],
};

const likertLabelsAr = {
  keywordRelevance: [
    "١ – غير ملائمة إطلاقاً",
    "٢ – ملائمة قليلاً",
    "٣ – ملائمة بشكل متوسط",
    "٤ – ملائمة جداً",
    "٥ – ملائمة تماماً",
  ],
  sentenceHelpfulness: [
    "١ – غير مفيدة إطلاقاً",
    "٢ – مفيدة قليلاً",
    "٣ – مفيدة بشكل متوسط",
    "٤ – مفيدة جداً",
    "٥ – مفيدة تماماً",
  ],
  ease: ["١ – صعب جداً", "٢ – صعب", "٣ – محايد", "٤ – سهل", "٥ – سهل جداً"],
  speed: [
    "١ – بطيء جداً",
    "٢ – بطيء",
    "٣ – مقبول",
    "٤ – سريع",
    "٥ – سريع جداً",
  ],
  imageAccuracy: [
    "١ – غير دقيقة إطلاقاً",
    "٢ – دقيقة قليلاً",
    "٣ – دقيقة بشكل متوسط",
    "٤ – دقيقة جداً",
    "٥ – دقيقة تماماً",
  ],
  helpfulness: [
    "١ – غير مفيد إطلاقاً",
    "٢ – مفيد قليلاً",
    "٣ – مفيد بشكل متوسط",
    "٤ – مفيد جداً",
    "٥ – مفيد تماماً",
  ],
  likelihood: [
    "١ – غير محتمل إطلاقاً",
    "٢ – غير محتمل",
    "٣ – محايد",
    "٤ – محتمل",
    "٥ – محتمل جداً",
  ],
  agree: [
    "١ – لا أوافق بشدة",
    "٢ – لا أوافق",
    "٣ – محايد",
    "٤ – أوافق",
    "٥ – أوافق بشدة",
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
  async generateImage({ prompt, style, location, gender, condition, age, language, appearance }: { prompt: string; style: "realistic" | "cartoon" | "symbolic"; location?: string; gender?: string; condition?: string; age?: string; language?: string; appearance?: string }) {
    // SWITCH MODELS HERE!!!
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, style, location, gender, condition, age, language, appearance }),
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
    refinementKeywords,
    context,
    language,
    style,
    intention,
  }: {
    keywords: string[];
    refinementKeywords?: string[];
    context: {
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
        refinementKeywords,
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

const goalsByLocation: Record<
  string,
  { value: string; label: string; arLabel: string }[]
> = {
  cafe: [
    { value: "order food", label: "Order food", arLabel: "طلب طعام" },
    { value: "order drink", label: "Order drink", arLabel: "طلب مشروب" },
    { value: "request help", label: "Request help", arLabel: "طلب مساعدة" },
  ],
  playground: [
    { value: "join game", label: "Join game", arLabel: "الانضمام للعبة" },
    { value: "ask to play", label: "Ask to play", arLabel: "طلب اللعب" },
    { value: "express feeling", label: "Express feeling", arLabel: "التعبير عن مشاعر" },
  ],
  classroom: [
    { value: "ask for help", label: "Ask for help", arLabel: "طلب المساعدة" },
    { value: "ask to repeat", label: "Ask to repeat", arLabel: "طلب الإعادة" },
    { value: "say I don't understand", label: "Say I don't understand", arLabel: "قول لا أفهم" },
  ],
  majlis: [
    { value: "greet", label: "Greet", arLabel: "تحية" },
    { value: "share story", label: "Share story", arLabel: "مشاركة أخبار" },
    {
      value: "join conversation",
      label: "Join conversation",
      arLabel: "الانضمام للحديث",
    },
    {
      value: "express feeling",
      label: "Express feeling",
      arLabel: "التعبير عن مشاعر",
    },
  ],
  home: [
    { value: "request help", label: "Request help", arLabel: "طلب مساعدة" },
    { value: "express feeling", label: "Express feeling", arLabel: "التعبير عن مشاعر" },
    { value: "ask for something", label: "Ask for something", arLabel: "طلب شيء" },
    { value: "say I'm hungry", label: "Say I'm hungry", arLabel: "قول أنا جائع" },
  ],
};

const SAMPLE_IMAGES: Record<
  string,
  { src: string; label: string; arLabel: string }[]
> = {
  cafe: [
    { src: "/samples/cafe/coffee.jpg", label: "Coffee", arLabel: "قهوة" },
    { src: "/samples/cafe/sandwich.jpg", label: "Sandwich", arLabel: "ساندويش" },
  ],
  playground: [
    { src: "/samples/playground/football.png", label: "Football", arLabel: "كرة قدم" },
    { src: "/samples/playground/swing.jpg", label: "Swing", arLabel: "أرجوحة" },
  ],
  classroom: [
    { src: "/samples/classroom/whiteboard.webp", label: "Whiteboard", arLabel: "لوح أبيض" },
    { src: "/samples/classroom/worksheet.webp", label: "Worksheet", arLabel: "ورقة عمل" },
  ],
  majlis: [
    {
      src: "/samples/gathering/coffee.jpg",
      label: "Coffee gathering",
      arLabel: "قهوة في التجمع",
    },
    {
      src: "/samples/gathering/family_majlis.webp",
      label: "Family majlis",
      arLabel: "مجلس عائلي",
    },
  ],
  home: [
    { src: "/samples/home/bed.jpg", label: "Bed", arLabel: "سرير" },
    { src: "/samples/home/sink.avif", label: "Sink", arLabel: "مغسلة" },
  ],
};



const UI_LABELS = {
  en: {
    // Welcome
    welcome: "Welcome",
    welcomeDesc: "Please enter your participant ID to begin the session.",
    participantId: "Participant ID",
    participantPlaceholder: "e.g. P01",
    privacyNote:
      "No personal data is collected — this ID is used only to link your anonymous responses.",
    startSession: "Start Session →",
    // Header
    headerSubtitle:
      "Snap a photo · get words · speak — explore how AI can support an AAC user in everyday moments.",
    langToggle: "🌐 العربية",
    // Steps
    steps: [
      "👤 Profile",
      "🧠 Generate",
      "📋 Evaluate",
      "🔍 Verify",
      "📊 Evaluate",
    ] as unknown as string[],
    // Scenario card
    scenarioTitle: "Today's scenario: Out in Doha",
    scenarioDesc:
      "An AAC user needs fast, low-effort support across three real settings.",
    cafeScenario: "Café ordering",
    cafeScenarioDesc:
      "Point camera at the menu → order independently with AI-suggested words.",
    playgroundScenario: "Playground",
    playgroundScenarioDesc:
      "Join other children playing a game and ask to take part.",
    classroomScenario: "Classroom",
    classroomScenarioDesc:
      "Ask the teacher for help when you don't understand something.",
    majlisScenario: "Family gathering / majlis",
    majlisScenarioDesc:
      "Prepare greetings and topics beforehand so the user can join conversations naturally.",
    // Profile picker
    selectProfile: "Select a demo profile",
    selectProfileDesc:
      "Choose the AAC user you will be simulating during this session.",
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
    quickNote: "Describe your image",
    generateImage: "Generate image",
    clearImage: "Clear image",
    imageStyle: "Image style",
    imageStyleRealistic: "Realistic",
    imageStyleCartoon: "Cartoon",
    imageStyleSymbolic: "AAC-style",
    includeConditionLabel: "Include user profile in image generation?",
    doesMatch: "Does this image match the intended meaning?",
    yes: "Yes",
    no: "No",
    nextGenerate: "Next: Generate",
    nextEvaluate: "Next: Evaluate",
    nextVerify: "Next: Verify",
    nextRate: "Next: Evaluate",
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
    extraContextPlaceholder:
      "Example: asthma med, child is anxious, need a very short sentence",
    // Step 1 — time options
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    night: "Night",
    // Step 1 — location options
    locCafe: "Café",
    locPlayground: "Playground",
    locClassroom: "Classroom",
    locMajlis: "Family gathering / majlis",
    locHome: "Home",
    // Step 1 — intention options
    intentQuestion: "Question / Request",
    intentConversation: "Conversation",
    // Step 1 — right panel
    keywordsTitle: "Keywords → sentences",
    keywordsDesc: "AI suggests words, then 3 sentence options to pick from.",
    noKeywords:
      "No keywords yet. Upload an image or capture one from the camera, then generate.",
    addExtraKeywords: "Add extra keywords for sentence generation",
    keywordsPlaceholder: "",
    generatingSentences: "Generating sentences…",
    generate3Sentences: "Generate 3 sentence options",
    sentenceSelected: "Selected",
    noSentences: "Generate sentences to see options.",
    matchQuestion: "Does this match your intended meaning?",
    refineLabel: "If the text did not match, add keywords to improve suggestions:",
    regenerate: "Regenerate",
    profileNameLabel: "Name",
    profileAgeLabel: "Age",
    profileGenderLabel: "Gender",
    profileConditionLabel: "Primary Diagnosis",
    profilePhotoToggle: "Personalize AAC images using my photo",
    profilePhotoDesc: "Optional: take or upload a photo so generated images visually resemble the user.",
    profilePhotoAnalyzing: "Analyzing photo…",
    profilePhotoReady: "Photo analyzed ✓ — images will be personalized",
    profilePhotoFailed: "Analysis failed — will use profile info instead",
    partnerRoleLabel: "Communication partner",
    sentenceStyleLabel: "Sentence style",
    chooseLocation: "Choose a location",
    namePlaceholder: "e.g. Sara",
    agePlaceholder: "e.g. 12",
    selectPlaceholder: "Select…",
    genderMale: "Male",
    genderFemale: "Female",
    conditionAutism: "Autism",
    conditionALS: "ALS",
    conditionCerebralPalsy: "Cerebral Palsy",
    conditionDownSyndrome: "Down Syndrome",
    conditionAphasia: "Aphasia",
    conditionOther: "Other",
    partnerParent: "Parent",
    partnerCaregiver: "Caregiver",
    partnerTeacher: "Teacher",
    partnerSLT: "Speech-language therapist",
    partnerStranger: "Stranger / General public",
    styleSimple: "Simple (short, 4–6 words)",
    styleStandard: "Standard (natural length)",
    cafeDesc: "Order food or drinks independently",
    playgroundDesc: "Join other children in a game",
    classroomDesc: "Ask the teacher when you don't understand",
    majlisDesc: "Join a family gathering or conversation",
    homeDesc: "Communicate needs and feelings at home",
    sliderHint: "Move the slider to rate",
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
    rateTitleA: "Rate the AI suggestions",
    rateDescA: "Think about the AAC users you support",
    qa1: "The generated sentences accurately matched what the AAC user wanted to say.",
    qa2: "The generated sentences made it easy to find the right thing to say.",
    qa3: "The generated sentences were relevant to the AAC user's profile.",
    qa4: "The generated sentences fit the location context (Majlis, Classroom, Playground, Café).",
    qa5: "I could imagine this tool being useful for an AAC user I know.",
    // Stage B — image evaluation (step 4)
    rateTitleB: "Rate the AI image suggestions",
    rateDescB: "Think about the AAC users you support",
    qb1: "The image suggestions accurately represented what the AAC user wanted to express.",
    qb2: "The image suggestions made it easy to find the right picture.",
    qb3: "The image suggestions reflected the AAC user's profile and appearance.",
    qb4: "The image suggestions fit the location context (Majlis, Classroom, Playground, Café).",
    qb5: "I could imagine using AI image suggestions to support an AAC user I know.",
    additionalComments: "Additional comments",
    commentsPlaceholder: "Any other thoughts, reactions, or feedback...",
    saving: "Saving…",
    submit: "Submit",
    submitted: "Submitted!",
    thankYou: "Thank you for your participation!",
    thankYouDesc: "Your responses have been saved. You can start a new submission below.",
    doAnother: "Start another submission",
    confirmProfile: "Confirm Profile →",
    profileConfirmed: "Profile confirmed",
    // Footer
    footer: "VocalAI Workshop · Hamad Bin Khalifa University · 2026",
  },
  ar: {
    // Welcome
    welcome: "أهلاً بك",
    welcomeDesc: "يرجى إدخال رقم المشارك للبدء.",
    participantId: "رقم المشارك",
    participantPlaceholder: "مثال: P01",
    privacyNote:
      "لا يتم جمع بيانات شخصية — يُستخدم هذا الرقم فقط لربط إجاباتك المجهولة.",
    startSession: "ابدأ الجلسة ←",
    // Header
    headerSubtitle:
      "التقط صورة · احصل على كلمات · تحدث — استكشف كيف يمكن للذكاء الاصطناعي دعم مستخدم AAC في لحظات يومية.",
    langToggle: "🌐 English",
    // Steps
    steps: [
      "👤 الملف",
      "🧠 توليد",
      "📋 تقييم",
      "🔍 تحقق",
      "📊 تقييم",
    ] as unknown as string[],
    // Scenario card
    scenarioTitle: "سيناريو اليوم: خارج في الدوحة",
    scenarioDesc: "مستخدم AAC يحتاج إلى دعم سريع وسهل في ثلاثة أماكن حقيقية.",
    cafeScenario: "طلب في المقهى",
    cafeScenarioDesc:
      "وجّه الكاميرا نحو القائمة ← اطلب باستقلالية بكلمات مقترحة من الذكاء الاصطناعي.",
    playgroundScenario: "الملعب",
    playgroundScenarioDesc:
      "انضم إلى الأطفال الآخرين في لعبة واطلب المشاركة.",
    classroomScenario: "الفصل الدراسي",
    classroomScenarioDesc:
      "اطلب المساعدة من المعلم عندما لا تفهم شيئاً.",
    majlisScenario: "تجمع عائلي / مجلس",
    majlisScenarioDesc:
      "جهّز التحيات والمواضيع مسبقاً ليتمكن المستخدم من المشاركة في المحادثات بشكل طبيعي.",
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
    quickNote: "صف صورتك",
    generateImage: "توليد صورة",
    clearImage: "مسح الصورة",
    imageStyle: "نمط الصورة",
    imageStyleRealistic: "واقعي",
    imageStyleCartoon: "كرتوني",
    imageStyleSymbolic: "نمط AAC",
    includeConditionLabel: "تضمين ملف المستخدم في توليد الصورة؟",
    doesMatch: "هل تطابق هذه الصورة المعنى المقصود؟",
    yes: "نعم",
    no: "لا",
    nextGenerate: "التالي: توليد",
    nextEvaluate: "التالي: تقييم",
    nextVerify: "التالي: تحقق",
    nextRate: "التالي: تقييم",
    back: "رجوع →",
    // Step 1 — left panel
    addPhotoTitle: "أضف صورة + سياق",
    addPhotoDesc: "حدد المشهد — أين، متى، وماذا تحتاج.",
    uploadImage: "تحميل صورة",
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
    extraContextPlaceholder:
      "مثال: دواء الربو، الطفل قلق، أحتاج جملة قصيرة جداً",
    // Step 1 — time options
    morning: "صباح",
    afternoon: "بعد الظهر",
    evening: "مساء",
    night: "ليل",
    // Step 1 — location options
    locCafe: "مقهى",
    locPlayground: "ملعب",
    locClassroom: "فصل دراسي",
    locMajlis: "تجمع عائلي / مجلس",
    locHome: "المنزل",
    // Step 1 — intention options
    intentQuestion: "سؤال / طلب",
    intentConversation: "محادثة",
    // Step 1 — right panel
    keywordsTitle: "الكلمات ← الجمل",
    keywordsDesc: "الذكاء الاصطناعي يقترح كلمات، ثم 3 خيارات جمل للاختيار.",
    noKeywords: "لا توجد كلمات بعد. حمّل صورة أو التقط واحدة، ثم ولّد.",
    addExtraKeywords: "أضف كلمات إضافية لتوليد الجمل",
    keywordsPlaceholder: "",
    generatingSentences: "جارٍ توليد الجمل…",
    generate3Sentences: "توليد 3 خيارات جمل",
    sentenceSelected: "محددة",
    noSentences: "ولّد جملاً لرؤية الخيارات.",
    matchQuestion: "هل هذا يعكس المعنى المقصود؟",
    refineLabel: "إن لم يتطابق النص، أضف كلمات لتحسين الاقتراحات:",
    regenerate: "إعادة التوليد",
    profileNameLabel: "الاسم",
    profileAgeLabel: "العمر",
    profileGenderLabel: "الجنس",
    profileConditionLabel: "التشخيص الأساسي",
    profilePhotoToggle: "تخصيص صور AAC باستخدام صورتي",
    profilePhotoDesc: "اختياري: التقط صورة أو حمّلها لتخصيص الصور المولّدة.",
    profilePhotoAnalyzing: "جارٍ تحليل الصورة…",
    profilePhotoReady: "تم تحليل الصورة ✓ — سيتم تخصيص الصور",
    profilePhotoFailed: "فشل التحليل — سيتم استخدام بيانات الملف الشخصي",
    partnerRoleLabel: "شريك التواصل",
    sentenceStyleLabel: "أسلوب الجملة",
    chooseLocation: "اختر موقعاً",
    namePlaceholder: "مثال: سارة",
    agePlaceholder: "مثال: ١٢",
    selectPlaceholder: "اختر...",
    genderMale: "ذكر",
    genderFemale: "أنثى",
    conditionAutism: "توحد",
    conditionALS: "التصلب الجانبي الضموري",
    conditionCerebralPalsy: "شلل دماغي",
    conditionDownSyndrome: "متلازمة داون",
    conditionAphasia: "حبسة كلامية",
    conditionOther: "أخرى",
    partnerParent: "والد/ة",
    partnerCaregiver: "مقدم رعاية",
    partnerTeacher: "معلم",
    partnerSLT: "أخصائي نطق ولغة",
    partnerStranger: "غريب / عام",
    styleSimple: "بسيط (قصير، ٤–٦ كلمات)",
    styleStandard: "معتدل (طول طبيعي)",
    cafeDesc: "طلب طعام أو مشروبات باستقلالية",
    playgroundDesc: "الانضمام إلى الأطفال في لعبة",
    classroomDesc: "سؤال المعلم عند عدم الفهم",
    majlisDesc: "الانضمام إلى تجمع عائلي أو حوار",
    homeDesc: "التعبير عن الاحتياجات والمشاعر في المنزل",
    sliderHint: "حرك المتزلق للتقييم",
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
    rateTitleA: "قيّم اقتراحات الذكاء الاصطناعي",
    rateDescA: "فكّر في مستخدمي AAC الذين تدعمهم",
    qa1: "الجمل المقترحة تطابقت بدقة مع ما أراد مستخدم AAC قوله.",
    qa2: "الجمل المقترحة سهّلت إيجاد الشيء المناسب لقوله.",
    qa3: "الجمل المقترحة كانت ملائمة لمستخدم AAC.",
    qa4: "الجمل المقترحة ناسبت سياق المكان (مجلس، فصل، ملعب، مقهى).",
    qa5: "أستطيع تخيّل أن هذه الأداة ستكون مفيدة لمستخدم AAC أعرفه.",
    // Stage B — image evaluation (step 4)
    rateTitleB: "قيّم اقتراحات صور الذكاء الاصطناعي",
    rateDescB: "فكّر في مستخدمي AAC الذين تدعمهم",
    qb1: "اقتراحات الصور مثّلت بدقة ما أراد مستخدم AAC التعبير عنه.",
    qb2: "اقتراحات الصور سهّلت إيجاد الصورة المناسبة.",
    qb3: "اقتراحات الصور عكست ملف مستخدم AAC ومظهره.",
    qb4: "اقتراحات الصور ناسبت سياق المكان (مجلس، فصل، ملعب، مقهى).",
    qb5: "أستطيع تخيّل استخدام اقتراحات صور الذكاء الاصطناعي لدعم مستخدم AAC أعرفه.",
    additionalComments: "تعليقات إضافية",
    commentsPlaceholder: "أي أفكار أو ردود فعل أو ملاحظات أخرى...",
    saving: "جارٍ الحفظ…",
    submit: "إرسال",
    submitted: "تم الإرسال!",
    thankYou: "شكراً على مشاركتك!",
    thankYouDesc: "تم حفظ إجاباتك. يمكنك بدء تقديم جديد أدناه.",
    doAnother: "بدء تقديم آخر",
    confirmProfile: "تأكيد الملف الشخصي ←",
    profileConfirmed: "تم تأكيد الملف الشخصي",
    // Footer
    footer: "ورشة VocalAI · جامعة حمد بن خليفة · 2026",
  },
} as const;

interface AacTile { emoji: string; en: string; ar: string }

const AAC_BOARD: Record<string, AacTile[]> = {
  core: [
    { emoji: "🙋", en: "I want", ar: "أريد" },
    { emoji: "🆘", en: "Help", ar: "مساعدة" },
    { emoji: "❓", en: "Question", ar: "سؤال" },
    { emoji: "➕", en: "More", ar: "أكثر" },
    { emoji: "🛑", en: "Stop", ar: "توقف" },
    { emoji: "👍", en: "Yes", ar: "نعم" },
    { emoji: "👎", en: "No", ar: "لا" },
    { emoji: "😊", en: "Happy", ar: "سعيد" },
    { emoji: "😢", en: "Sad", ar: "حزين" },
    { emoji: "🤒", en: "Sick", ar: "مريض" },
    { emoji: "🏠", en: "Home", ar: "البيت" },
    { emoji: "🚽", en: "Toilet", ar: "حمام" },
  ],
  cafe: [
    { emoji: "☕", en: "Coffee", ar: "قهوة" },
    { emoji: "💧", en: "Water", ar: "ماء" },
    { emoji: "🧃", en: "Juice", ar: "عصير" },
    { emoji: "🥪", en: "Sandwich", ar: "ساندويش" },
    { emoji: "🍰", en: "Cake", ar: "كعكة" },
    { emoji: "📋", en: "Menu", ar: "قائمة" },
    { emoji: "💰", en: "Pay", ar: "دفع" },
    { emoji: "🪑", en: "Sit", ar: "اجلس" },
  ],
  playground: [
    { emoji: "⚽", en: "Ball", ar: "كرة" },
    { emoji: "🛝", en: "Slide", ar: "زحليقة" },
    { emoji: "🎮", en: "Play", ar: "العب" },
    { emoji: "🏃", en: "Run", ar: "اركض" },
    { emoji: "👫", en: "Friends", ar: "أصدقاء" },
    { emoji: "🎯", en: "Join", ar: "انضم" },
    { emoji: "🏆", en: "Win", ar: "فوز" },
    { emoji: "🤝", en: "My turn", ar: "دوري" },
  ],
  classroom: [
    { emoji: "📖", en: "Read", ar: "اقرأ" },
    { emoji: "✏️", en: "Write", ar: "اكتب" },
    { emoji: "🤔", en: "Don't understand", ar: "لا أفهم" },
    { emoji: "🖐️", en: "Ask", ar: "اسأل" },
    { emoji: "📝", en: "Homework", ar: "واجب" },
    { emoji: "🔁", en: "Repeat", ar: "أعد" },
    { emoji: "📚", en: "Book", ar: "كتاب" },
    { emoji: "🎓", en: "Learn", ar: "تعلّم" },
  ],
  majlis: [
    { emoji: "🍵", en: "Tea", ar: "شاي" },
    { emoji: "☕", en: "Coffee", ar: "قهوة" },
    { emoji: "🍬", en: "Sweets", ar: "حلويات" },
    { emoji: "🗣️", en: "Talk", ar: "تحدث" },
    { emoji: "👋", en: "Hello", ar: "مرحباً" },
    { emoji: "🤝", en: "Welcome", ar: "أهلاً" },
    { emoji: "👨‍👩‍👧", en: "Family", ar: "عائلة" },
    { emoji: "🎉", en: "Celebrate", ar: "احتفل" },
  ],
  home: [
    { emoji: "🛋️", en: "Relax", ar: "استرح" },
    { emoji: "😴", en: "Sleep", ar: "نوم" },
    { emoji: "🚽", en: "Toilet", ar: "حمام" },
    { emoji: "🤕", en: "Hurt", ar: "ألم" },
    { emoji: "🎮", en: "Game", ar: "لعبة" },
    { emoji: "📖", en: "Book", ar: "كتاب" },
    { emoji: "🥪", en: "Sandwich", ar: "ساندويش" },
    { emoji: "🧃", en: "Juice", ar: "عصير" },
  ],
};


export default function QatarAACProbePrototype() {
  const [participantId, setParticipantId] = useState("");
  const [participantIdInput, setParticipantIdInput] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [profileName, setProfileName] = useState("");
  const [profileAge, setProfileAge] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profileCondition, setProfileCondition] = useState("");
  const [profileConditionOther, setProfileConditionOther] = useState("");
  const partnerRole = "parent";
  const [language, setLanguage] = useState("en");
  const simpleStyle = true;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "sample" | "camera">(
    "upload",
  );
  const [speakLoading, setSpeakLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [location, setLocation] = useState("playground");
  const [goal, setGoal] = useState("ask dose");
  const [freeContext, setFreeContext] = useState("");
  const [intention, setIntention] = useState("question");

  const [notes, setNotes] = useState("");
  const [aacSelection, setAacSelection] = useState<AacTile[]>([]);
  const [commentsA, setCommentsA] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [likertASubmitted, setLikertASubmitted] = useState(false);
  const [likertBSubmitted, setLikertBSubmitted] = useState(false);
  const [likertBSaving, setLikertBSaving] = useState(false);
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [showEvalA, setShowEvalA] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [showEvalB, setShowEvalB] = useState(false);
  const [verifyImageUrl, setVerifyImageUrl] = useState("");
  const [imageStyleMode, setImageStyleMode] = useState<"realistic" | "cartoon" | "symbolic">("symbolic");
  const [includeCondition, setIncludeCondition] = useState(false);

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyDecision, setVerifyDecision] = useState<string | null>(null);
  const [verifyNoSelected, setVerifyNoSelected] = useState(false);
  const [alternatives, setAlternatives] = useState<
    { text: string; imageUrl: string }[]
  >([]);
  const [altLoading, setAltLoading] = useState(false);
  const [imageRefinementKw, setImageRefinementKw] = useState("");

  const [kwLoading, setKwLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [customKw, setCustomKw] = useState("");

  const [sentLoading, setSentLoading] = useState(false);
  const [sentences, setSentences] = useState<string[]>([]);
  const [selectedSentence, setSelectedSentence] = useState("");
  const [sentenceMatch, setSentenceMatch] = useState<"yes" | "no" | null>(null);
  const [refinementKw, setRefinementKw] = useState("");
  const [sentenceMatchHistory, setSentenceMatchHistory] = useState<{match: string; refinementKeywords?: string}[]>([]);

  const [likertA, setLikertA] = useState<Record<string, number | null>>({
    sentenceAccuracy: null,
    sentenceEase: null,
    profileRelevance: null,
    locationFit: null,
    usefulnessPotential: null,
  });
  const [likertB, setLikertB] = useState<Record<string, number | null>>({
    imageAccuracy: null,
    imageEase: null,
    profileReflection: null,
    locationFit: null,
    usefulnessPotential: null,
  });

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile photo personalization
  const [profilePhotoEnabled, setProfilePhotoEnabled] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profileAppearance, setProfileAppearance] = useState("");
  const [profileAppearanceLoading, setProfileAppearanceLoading] = useState(false);
  const [profilePhotoInputMode, setProfilePhotoInputMode] = useState<"upload" | "camera">("upload");
  const [profilePhotoCameraOn, setProfilePhotoCameraOn] = useState(false);
  const [profilePhotoCameraStream, setProfilePhotoCameraStream] = useState<MediaStream | null>(null);
  const [profilePhotoFacingMode, setProfilePhotoFacingMode] = useState<"user" | "environment">("user");
  const profileVideoRef = useRef<HTMLVideoElement | null>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);

  const style = simpleStyle ? "simple" : "rich";
  const t = UI_LABELS[language as "en" | "ar"] ?? UI_LABELS.en;

const context = useMemo(
    () => ({
      location,
      partnerRole,
      goal,
      freeContext,
    }),
    [location, partnerRole, goal, freeContext],
  );

  useEffect(() => {
    const allowed = goalsByLocation[location] || goalsByLocation.playground;
    if (!allowed.some((g) => g.value === goal)) {
      setGoal(allowed[0].value);
    }
  }, [location, goal]);

  // Attach stream to video element after it renders
  useEffect(() => {
    if (cameraOn && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn, cameraStream]);

  useEffect(() => {
    if (profilePhotoCameraOn && profilePhotoCameraStream && profileVideoRef.current) {
      profileVideoRef.current.srcObject = profilePhotoCameraStream;
      profileVideoRef.current.play().catch(() => {});
    }
  }, [profilePhotoCameraOn, profilePhotoCameraStream]);

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
    const file = new File([blob], src.split("/").pop() || "sample", {
      type: blob.type,
    });
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

  async function startCamera(facing: "user" | "environment" = facingMode) {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      setFacingMode(facing);
      setCameraStream(stream);
      setCameraOn(true);
      // stream is attached to videoRef via useEffect after render
    } catch (error) {
      console.error("Camera access failed:", error);
      alert("Could not access the camera. Please allow camera permission.");
    }
  }

  function switchCamera() {
    startCamera(facingMode === "environment" ? "user" : "environment");
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
    // Front camera preview is mirrored for UX — flip canvas back so captured image is correct
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    setImagePreview(dataUrl);
    setImageFile(null);
    setKeywords([]);
    setSentences([]);
    setSelectedSentence("");
    // Stop camera so only the captured photo is shown
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setCameraOn(false);
  }

  async function startProfileCamera(facing: "user" | "environment" = profilePhotoFacingMode) {
    if (profilePhotoCameraStream) {
      profilePhotoCameraStream.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      setProfilePhotoFacingMode(facing);
      setProfilePhotoCameraStream(stream);
      setProfilePhotoCameraOn(true);
    } catch {
      alert(language === "ar" ? "لم نتمكن من الوصول إلى الكاميرا." : "Could not access the camera.");
    }
  }

  function stopProfileCamera() {
    if (profilePhotoCameraStream) {
      profilePhotoCameraStream.getTracks().forEach((t) => t.stop());
    }
    setProfilePhotoCameraStream(null);
    setProfilePhotoCameraOn(false);
  }

  function captureProfilePhoto() {
    if (!profileVideoRef.current || !profileCanvasRef.current) return;
    const video = profileVideoRef.current;
    const canvas = profileCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (profilePhotoFacingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    stopProfileCamera();
    setProfilePhotoPreview(dataUrl);
    analyzeProfilePhoto(dataUrl);
  }

  async function analyzeProfilePhoto(dataUrl: string) {
    setProfileAppearanceLoading(true);
    setProfileAppearance("");
    try {
      const res = await fetch("/api/analyze-appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (data.appearance) setProfileAppearance(data.appearance);
    } catch {
      // Silently fall back to profile-based generation
    } finally {
      setProfileAppearanceLoading(false);
    }
  }

  async function runVerifyImage() {
    setVerifyLoading(true);
    setVerifyDecision(null);
    try {
      const prompt = aacSelection.map(t => t.en).join(" ") || notes || "User note";
      const out = await api.generateImage({
        prompt,
        style: imageStyleMode,
        location,
        gender: profileGender,
        condition: includeCondition ? (profileCondition === "other" && profileConditionOther.trim() ? profileConditionOther.trim() : profileCondition) : undefined,
        age: profileAge,
        language,
        appearance: profilePhotoEnabled && profileAppearance ? profileAppearance : undefined,
      });
      setVerifyImageUrl(out.url);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function runKeywords() {
    setKwLoading(true);
    setSentLoading(true);
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

      const generatedKeywords = out.keywords || [];
      setKeywords(generatedKeywords);

      // Auto-generate sentences without showing keywords to the user
      const mergedKeywords = [
        ...generatedKeywords,
        ...typedKeywords,
      ];
      const uniqueKeywords = Array.from(new Set(mergedKeywords)).slice(0, 8);

      const sentOut = await api.keywordsToSentences({
        keywords: uniqueKeywords,
        context,
        language,
        style,
        intention,
      });

      setSentences(sentOut.sentences || []);
      setSelectedSentence(sentOut.sentences?.[0] || "");
    } catch (error) {
      console.error(error);
      alert("Generation failed.");
    } finally {
      setKwLoading(false);
      setSentLoading(false);
    }
  }

  async function runSentences() {
    setSentLoading(true);
    setSentences([]);
    setSelectedSentence("");
    if (refinementKw.trim()) {
      setSentenceMatchHistory((prev) => [...prev, { match: "no", refinementKeywords: refinementKw.trim() }]);
    }
    setSentenceMatch(null);
    try {
      const refinementList = refinementKw.split(",").map((s) => s.trim()).filter(Boolean);
      const baseKeywords = [
        ...keywords,
        ...customKw.split(",").map((s) => s.trim()).filter(Boolean),
      ];
      const uniqueBase = Array.from(new Set(baseKeywords)).slice(0, 5);

      const out = await api.keywordsToSentences({
        keywords: uniqueBase,
        refinementKeywords: refinementList,
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

  async function speakSelectedSentence() {
    if (!selectedSentence || speakLoading) return;
    stopSpeaking();
    setSpeakLoading(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedSentence, gender: profileGender, age: profileAge, language }),
      });
      if (!res.ok) throw new Error("Speech generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل توليد الصوت." : "Speech generation failed.");
    } finally {
      setSpeakLoading(false);
    }
  }

  function stopSpeaking() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  async function fetchAlternatives(refinementKw?: string) {
    setAltLoading(true);
    setAlternatives([]);
    try {
      const res = await fetch("/api/suggest-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: aacSelection.map(t => t.en).join(" ") || notes, language, refinementKeywords: refinementKw?.trim() || undefined }),
      });
      const { alternatives: texts } = await res.json();

      const images = await Promise.all(
        (texts as string[]).map(async (text: string, i: number) => {
          // First alternative includes profile context; the other two are generic
          const contextPayload = i === 0
            ? { prompt: text, style: imageStyleMode, location, gender: profileGender, condition: includeCondition ? (profileCondition === "other" && profileConditionOther.trim() ? profileConditionOther.trim() : profileCondition) : undefined, age: profileAge, language, appearance: profilePhotoEnabled && profileAppearance ? profileAppearance : undefined }
            : { prompt: text, style: imageStyleMode, language };
          const r = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contextPayload),
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
      // Upload image to Supabase Storage if one exists
      let savedImageUrl = verifyImageUrl;
      if (verifyImageUrl) {
        try {
          const uploadRes = await fetch("/api/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: verifyImageUrl }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) savedImageUrl = uploadData.url;
        } catch {
          // Non-fatal — fall back to original URL
        }
      }

      const saveRes = await fetch("/api/save-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          profile: { name: profileName, age: profileAge, gender: profileGender, condition: profileCondition, language },
          location,
          scenario: { intention },
          keywords,
          selectedSentence,
          sentenceMatch: sentenceMatchHistory.length > 0
            ? sentenceMatchHistory
            : [{ match: refinementKw.trim() ? "no" : "yes" }],
          evaluationA: likertA,
          commentsA,
          verifyDecision: {
            decision: verifyDecision,
            ...(imageRefinementKw.trim() ? { refinementKeywords: imageRefinementKw.trim() } : {}),
          },
          verifyImageUrl: savedImageUrl,
          imageStyle: imageStyleMode,
          aacSelection: aacSelection.map(t => ({ en: t.en, ar: t.ar })),
          evaluationB: likertB,
          additionalComments,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData?.error || `Server error ${saveRes.status}`);
      }
      setLikertBSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(`Could not save response: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLikertBSaving(false);
    }
  }

  function resetForNewSubmission() {
    if (cameraOn) stopCamera();
    setSessionKey((k) => k + 1);
    setParticipantId("");
    setParticipantIdInput("");
    setProfileSubmitted(false);
    setSelectedLocationId(null);
    setProfileName("");
    setProfileAge("");
    setProfileGender("");
    setProfileCondition("");
    setProfileConditionOther("");
    setProfilePhotoEnabled(false);
    setProfilePhotoPreview("");
    setProfileAppearance("");
    setProfilePhotoInputMode("upload");
    setLocation("playground");
    setIntention("question");
    setGoal("ask dose");
    setInputMode("upload");
    setImagePreview("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setKeywords([]);
    setSentences([]);
    setSelectedSentence("");
    setVerifyImageUrl("");
    setVerifyDecision(null);
    setVerifyNoSelected(false);
    setAlternatives([]);
    setImageRefinementKw("");
    setImageStyleMode("symbolic");
    setLikertA({ sentenceAccuracy: null, sentenceEase: null, profileRelevance: null, locationFit: null, usefulnessPotential: null });
    setLikertB({ imageAccuracy: null, imageEase: null, profileReflection: null, locationFit: null, usefulnessPotential: null });
    setLikertASubmitted(false);
    setLikertBSubmitted(false);
    setShowEvalA(false);
    setShowEvalB(false);
    setCommentsA("");
    setAdditionalComments("");
    setSentenceMatch(null);
    setSentenceMatchHistory([]);
    setRefinementKw("");
    setFreeContext("");
    setCustomKw("");
    setNotes("");
    setAacSelection([]);
  }

  if (!participantId) {
    return (
      <div
        className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center p-6"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl shadow-xl border-0">
            <CardHeader className="rounded-t-3xl bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400 p-8 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-bold">{t.welcome}</CardTitle>
                  <CardDescription className="text-blue-200 text-base mt-1">
                    {t.welcomeDesc}
                  </CardDescription>
                </div>
                <button
                  onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  {language === "en" ? "عربي" : "English"}
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="pid"
                  className="text-sm font-medium text-slate-700"
                >
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
                <p className="text-xs text-muted-foreground">{t.privacyNote}</p>
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
    <div
      className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-4 md:p-5"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-[1350px] space-y-6"
      >
        <header className="flex flex-col gap-3 rounded-3xl bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400 p-8 text-white shadow-xl">
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
          <p className="max-w-xl text-blue-200 text-base">{t.headerSubtitle}</p>
        </header>

        {/* ── 3-column layout ── */}
        <div key={sessionKey} className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">

          {/* Column 1: Profile + Location */}
          <div className="space-y-6">
            <div className="rounded-3xl overflow-hidden shadow-sm border">
            <Card className="rounded-none shadow-none border-0 border-b">
              <div dir={language === "ar" ? "ltr" : undefined} className={`bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-sm">1</div>
                <div dir={language === "ar" ? "rtl" : undefined}>
                  <CardTitle className="text-lg">{t.selectProfile}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.selectProfileDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-5 pt-5">
                <div dir={language === "ar" ? "ltr" : undefined} className={`flex flex-wrap gap-4 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                  <div className="space-y-1 flex-1 min-w-36">
                    <Label className={language === "ar" ? "block text-right" : ""}>{t.profileNameLabel} <span className="text-red-500">*</span></Label>
                    <Input dir={language === "ar" ? "rtl" : undefined} value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder={t.namePlaceholder} disabled={profileSubmitted} />
                  </div>
                  <div className="space-y-1 flex-1 min-w-36">
                    <Label className={language === "ar" ? "block text-right" : ""}>{t.profileAgeLabel}</Label>
                    <Input dir={language === "ar" ? "rtl" : undefined} type="text" inputMode="numeric" value={profileAge} onChange={(e) => setProfileAge(e.target.value)} placeholder={t.agePlaceholder} disabled={profileSubmitted} />
                  </div>
                  <div className="space-y-1 flex-1 min-w-36">
                    <Label className={language === "ar" ? "block text-right" : ""}>{t.profileGenderLabel}</Label>
                    <Select value={profileGender} onValueChange={setProfileGender} disabled={profileSubmitted}>
                      <SelectTrigger dir={language === "ar" ? "rtl" : "ltr"} ><SelectValue placeholder={t.selectPlaceholder} /></SelectTrigger>
                      <SelectContent dir={language === "ar" ? "rtl" : "ltr"}>
                        <SelectItem value="male">{t.genderMale}</SelectItem>
                        <SelectItem value="female">{t.genderFemale}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1 min-w-36">
                    <Label className={language === "ar" ? "block text-right" : ""}>{t.profileConditionLabel}</Label>
                    <Select value={profileCondition} onValueChange={(v) => { setProfileCondition(v); setProfileConditionOther(""); }} disabled={profileSubmitted}>
                      <SelectTrigger dir={language === "ar" ? "rtl" : "ltr"} ><SelectValue placeholder={t.selectPlaceholder} /></SelectTrigger>
                      <SelectContent dir={language === "ar" ? "rtl" : "ltr"}>
                        <SelectItem value="autism">{t.conditionAutism}</SelectItem>
                        <SelectItem value="als">{t.conditionALS}</SelectItem>
                        <SelectItem value="cerebral-palsy">{t.conditionCerebralPalsy}</SelectItem>
                        <SelectItem value="down-syndrome">{t.conditionDownSyndrome}</SelectItem>
                        <SelectItem value="aphasia">{t.conditionAphasia}</SelectItem>
                        <SelectItem value="other">{t.conditionOther}</SelectItem>
                      </SelectContent>
                    </Select>
                    {profileCondition === "other" && (
                      <Input
                        dir={language === "ar" ? "rtl" : undefined}
                        value={profileConditionOther}
                        onChange={(e) => setProfileConditionOther(e.target.value)}
                        placeholder={language === "ar" ? "يرجى التحديد..." : "Please specify..."}
                        className="rounded-xl mt-1"
                        disabled={profileSubmitted}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile photo personalization toggle */}
            {!profileSubmitted && (
              <div className="rounded-2xl border bg-slate-50 p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => { setProfilePhotoEnabled((v) => !v); if (profilePhotoEnabled) { stopProfileCamera(); setProfilePhotoPreview(""); setProfileAppearance(""); } }}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${profilePhotoEnabled ? "bg-blue-700 text-white" : "bg-white border text-slate-700 hover:bg-blue-50"}`}
                >
                  <span className="text-base">📸</span>
                  <span className={language === "ar" ? "flex-1 text-right" : "flex-1 text-left"}>{t.profilePhotoToggle}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${profilePhotoEnabled ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{profilePhotoEnabled ? t.yes : t.no}</span>
                </button>

                {profilePhotoEnabled && (
                  <div className="space-y-3">
                    <p className={`text-xs text-muted-foreground ${language === "ar" ? "text-right" : ""}`}>{t.profilePhotoDesc}</p>

                    {/* Input mode tabs */}
                    <div dir={language === "ar" ? "ltr" : undefined} className={`flex rounded-xl border overflow-hidden text-sm font-medium ${language === "ar" ? "flex-row-reverse" : ""}`}>
                      {(["upload", "camera"] as const).map((mode) => {
                        const labels = { upload: language === "ar" ? "تحميل" : "Upload", camera: language === "ar" ? "كاميرا" : "Camera" };
                        const icons = { upload: "📁", camera: "📷" };
                        return (
                          <button key={mode} type="button"
                            onClick={() => { if (mode !== profilePhotoInputMode) { if (profilePhotoInputMode === "camera") stopProfileCamera(); setProfilePhotoInputMode(mode); } }}
                            className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${profilePhotoInputMode === mode ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-blue-50"}`}
                          >{icons[mode]} {labels[mode]}</button>
                        );
                      })}
                    </div>

                    {/* Upload mode */}
                    {profilePhotoInputMode === "upload" && !profilePhotoPreview && (
                      <label className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-blue-200 bg-white px-4 py-6 text-sm text-slate-600 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors">
                        <span>📁</span>
                        <span>{language === "ar" ? "اختر صورة من جهازك" : "Choose a photo from your device"}</span>
                        <input ref={profileFileInputRef} type="file" accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setProfilePhotoPreview(dataUrl);
                              analyzeProfilePhoto(dataUrl);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}

                    {/* Camera mode */}
                    {profilePhotoInputMode === "camera" && !profilePhotoPreview && (
                      <div className="space-y-2">
                        {!profilePhotoCameraOn ? (
                          <Button type="button" onClick={() => startProfileCamera()} className="rounded-full w-full">
                            <Camera className="mr-2 h-4 w-4" />{language === "ar" ? "تشغيل الكاميرا" : "Start camera"}
                          </Button>
                        ) : (
                          <div className="relative overflow-hidden rounded-2xl border bg-black">
                            <video ref={profileVideoRef} autoPlay playsInline muted style={profilePhotoFacingMode === "user" ? { transform: "scaleX(-1)" } : undefined} className="h-auto w-full" />
                            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-8">
                              <button type="button" onClick={stopProfileCamera} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white"><CameraOff className="h-5 w-5" /></button>
                              <button type="button" onClick={captureProfilePhoto} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/30 backdrop-blur-sm"><div className="h-12 w-12 rounded-full bg-white" /></button>
                              <button type="button" onClick={() => startProfileCamera(profilePhotoFacingMode === "user" ? "environment" : "user")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white"><RefreshCw className="h-5 w-5" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <canvas ref={profileCanvasRef} className="hidden" />

                    {/* Preview + status */}
                    {profilePhotoPreview && (
                      <div className="space-y-2">
                        <img src={profilePhotoPreview} className="rounded-xl w-full max-w-[200px] mx-auto block" alt="profile" />
                        {profileAppearanceLoading && (
                          <div className={`flex items-center gap-2 text-xs text-blue-700 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                            <RefreshCw className="h-3 w-3 animate-spin" />{t.profilePhotoAnalyzing}
                          </div>
                        )}
                        {!profileAppearanceLoading && profileAppearance && (
                          <p className={`text-xs text-green-700 font-medium ${language === "ar" ? "text-right" : ""}`}>{t.profilePhotoReady}</p>
                        )}
                        {!profileAppearanceLoading && profilePhotoPreview && !profileAppearance && (
                          <p className={`text-xs text-amber-600 ${language === "ar" ? "text-right" : ""}`}>{t.profilePhotoFailed}</p>
                        )}
                        <Button variant="destructive" className="rounded-full text-xs h-8"
                          onClick={() => { setProfilePhotoPreview(""); setProfileAppearance(""); if (profileFileInputRef.current) profileFileInputRef.current.value = ""; }}>
                          {language === "ar" ? "إزالة الصورة" : "Remove photo"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Card className="rounded-none shadow-none border-0">
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-3 flex items-center gap-3">
                <CardTitle className="text-base">{t.chooseLocation} <span className="text-red-500">*</span></CardTitle>
              </div>
              <CardContent className="pt-3 pb-3">
                <div className="grid gap-2">
                  {[
                    { id: "cafe", emoji: "☕", label: "Café", arLabel: "مقهى", desc: t.cafeDesc },
                    { id: "playground", emoji: "🛝", label: "Playground", arLabel: "ملعب", desc: t.playgroundDesc },
                    { id: "classroom", emoji: "🏫", label: "Classroom", arLabel: "فصل دراسي", desc: t.classroomDesc },
                    { id: "majlis", emoji: "🏡", label: "Majlis", arLabel: "مجلس", desc: t.majlisDesc },
                    { id: "home", emoji: "🏠", label: "Home", arLabel: "المنزل", desc: t.homeDesc },
                  ].map((loc) => {
                    const isSelected = selectedLocationId === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => { if (!profileSubmitted) { setSelectedLocationId(loc.id); setLocation(loc.id); } }}
                        disabled={profileSubmitted}
                        dir="ltr"
                        className={`rounded-2xl border-2 px-3 py-2.5 transition-all flex items-center gap-3 ${isSelected ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700/20" : "border-transparent bg-slate-50 hover:border-blue-200 hover:bg-blue-50"} ${profileSubmitted ? "cursor-default" : ""}`}
                      >
                        {language === "ar" ? (
                          <>
                            <div className="flex-1 text-right">
                              <div className="font-semibold text-sm">{loc.arLabel}</div>
                              <p className="text-xs text-muted-foreground leading-tight">{loc.desc}</p>
                            </div>
                            <span className="text-2xl shrink-0">{loc.emoji}</span>
                            {isSelected && <Check className="ml-auto h-4 w-4 text-blue-700 shrink-0" />}
                          </>
                        ) : (
                          <>
                            <span className="text-2xl shrink-0">{loc.emoji}</span>
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{loc.label}</div>
                              <p className="text-xs text-muted-foreground leading-tight">{loc.desc}</p>
                            </div>
                            {isSelected && <Check className="ml-auto h-4 w-4 text-blue-700 shrink-0" />}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            </div>

            {!profileSubmitted ? (
              <Button
                onClick={() => setProfileSubmitted(true)}
                disabled={!profileName.trim() || !selectedLocationId || !profileCondition}
                className="w-full rounded-full bg-blue-600 hover:bg-blue-500 py-6 text-base font-semibold shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.confirmProfile}
              </Button>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" /> {t.profileConfirmed}
                </div>
                <button
                  type="button"
                  onClick={() => setProfileSubmitted(false)}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  {language === "ar" ? "تعديل" : "Edit"}
                </button>
              </div>
            )}
          </div>

          {/* Columns 2+3: Tabbed panel */}
          <div className={`transition-opacity duration-300 ${!profileSubmitted ? "opacity-40 pointer-events-none select-none" : ""}`}>
          <Tabs defaultValue="text" className="w-full space-y-4">
            <TabsList dir={language === "ar" ? "ltr" : undefined} className={`w-full rounded-2xl ${language === "ar" ? "flex-row-reverse" : ""}`}>
              <TabsTrigger value="text" className="flex-1 rounded-xl">{language === "ar" ? "توليد النص" : "Text generation"}</TabsTrigger>
              <TabsTrigger value="image" className="flex-1 rounded-xl">{language === "ar" ? "توليد الصورة" : "Image generation"}</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-6 mt-0">
            <div className="rounded-3xl overflow-hidden shadow-sm border">
            {!showEvalA ? (<>
            <Card className="rounded-none shadow-none border-0 border-b">
              <div dir={language === "ar" ? "ltr" : undefined} className={`bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-lg">1</div>
                <div dir={language === "ar" ? "rtl" : undefined}>
                  <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {t.addPhotoTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.addPhotoDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-4 px-3">
                <div dir={language === "ar" ? "ltr" : undefined} className={`flex rounded-xl border overflow-hidden text-sm font-medium ${language === "ar" ? "flex-row-reverse" : ""}`}>
                  {(["upload", "sample", "camera"] as const).map((mode) => {
                    const labels = { upload: language === "ar" ? "تحميل صورة" : "Upload", sample: language === "ar" ? "أمثلة" : "Samples", camera: language === "ar" ? "كاميرا" : "Camera" };
                    const icons = { upload: "📁", sample: "🖼️", camera: "📷" };
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          if (mode !== inputMode) {
                            setImagePreview(""); setKeywords([]); setSentences([]); setSelectedSentence("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                            if (inputMode === "camera") stopCamera();
                          }
                          setInputMode(mode);
                        }}
                        className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${inputMode === mode ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-blue-50"}`}
                      >
                        <span>{icons[mode]}</span>{labels[mode]}
                      </button>
                    );
                  })}
                </div>

                {inputMode === "upload" && (
                  <Input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
                )}

                {inputMode === "sample" && (
                  <div className="grid grid-cols-2 gap-3">
                    {(SAMPLE_IMAGES[location] ?? []).length === 0 ? (
                      <p className="col-span-2 text-sm text-muted-foreground">{language === "ar" ? "لا توجد أمثلة لهذا الموقع." : "No samples for this location."}</p>
                    ) : (
                      (SAMPLE_IMAGES[location] ?? []).map((s) => (
                        <button
                          key={s.src}
                          type="button"
                          onClick={() => onSelectSample(s.src)}
                          className={`rounded-xl border-2 overflow-hidden ${language === "ar" ? "text-right" : "text-left"} transition-all ${imagePreview && imagePreview.length > 100 && imageFile?.name === s.src.split("/").pop() ? "border-blue-700 ring-2 ring-blue-700/20" : "border-transparent hover:border-blue-300"}`}
                        >
                          <img src={s.src} alt={s.label} className="w-full aspect-square object-cover" />
                          <div className="px-2 py-1 text-xs font-medium text-slate-600">{language === "ar" ? s.arLabel : s.label}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {inputMode === "camera" && (
                  <div className="space-y-3">
                    {!cameraOn && (
                      <Button type="button" onClick={() => startCamera()} className="rounded-full">
                        <Camera className="mr-2 h-4 w-4" />{t.startCamera}
                      </Button>
                    )}
                    {cameraOn && (
                      <div className="relative overflow-hidden rounded-2xl border bg-black">
                        <video ref={videoRef} autoPlay playsInline muted style={facingMode === "user" ? { transform: "scaleX(-1)" } : undefined} className="h-auto w-full" />
                        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-8">
                          <button type="button" onClick={stopCamera} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white"><CameraOff className="h-5 w-5" /></button>
                          <button type="button" onClick={capturePhoto} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/30 backdrop-blur-sm"><div className="h-12 w-12 rounded-full bg-white" /></button>
                          <button type="button" onClick={switchCamera} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white"><RefreshCw className="h-5 w-5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />

                {imagePreview && inputMode !== "sample" && (
                  <div className="flex flex-col gap-2">
                    <img src={imagePreview} className="rounded-xl w-full" />
                    <div className="flex gap-2 flex-wrap">
                      {inputMode === "camera" && (
                        <Button variant="secondary" onClick={() => { setImagePreview(""); setKeywords([]); setSentences([]); setSelectedSentence(""); startCamera(); }} className="w-fit rounded-xl">
                          <Camera className="mr-2 h-4 w-4" />{language === "ar" ? "إعادة التصوير" : "Retake"}
                        </Button>
                      )}
                      <Button variant="destructive" onClick={() => { setImagePreview(""); setKeywords([]); setSentences([]); setSelectedSentence(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="w-fit rounded-xl">
                        {t.removeImage}
                      </Button>
                    </div>
                  </div>
                )}

                <div dir={language === "ar" ? "ltr" : undefined} className={`flex gap-3 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                  <div className="space-y-1 flex-1">
                    <Label dir={language === "ar" ? "ltr" : undefined} className={`flex items-center gap-1 ${language === "ar" ? "flex-row-reverse justify-end" : ""}`}><MapPin className="h-4 w-4" /> {t.locationLabel}</Label>
                    <div dir={language === "ar" ? "ltr" : undefined} className={`flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                      {{ cafe: "☕", playground: "🛝", classroom: "🏫", majlis: "🏡", home: "🏠" }[location] ?? "📍"}
                      <span>{{ cafe: t.locCafe, playground: t.locPlayground, classroom: t.locClassroom, majlis: t.locMajlis, home: t.locHome }[location] ?? location}</span>
                    </div>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className={language === "ar" ? "block text-right" : ""}>{t.intentionLabel}</Label>
                    <Select value={intention} onValueChange={setIntention}>
                      <SelectTrigger dir={language === "ar" ? "rtl" : "ltr"} ><SelectValue /></SelectTrigger>
                      <SelectContent dir={language === "ar" ? "rtl" : "ltr"}>
                        <SelectItem value="question">{t.intentQuestion}</SelectItem>
                        <SelectItem value="conversation">{t.intentConversation}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card className="rounded-none shadow-none border-0">
              <div dir={language === "ar" ? "ltr" : undefined} className={`bg-gradient-to-r from-sky-50 to-blue-50 border-b px-6 py-4 flex items-center gap-3 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-800 text-white font-bold text-lg">2</div>
                <div dir={language === "ar" ? "rtl" : undefined}>
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> {t.keywordsTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.keywordsDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-4">
                <div dir={language === "ar" ? "ltr" : undefined} className={`flex flex-wrap items-center gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                  <Button onClick={runKeywords} disabled={!imagePreview || kwLoading || sentLoading} className="rounded-full">
                    {kwLoading || sentLoading ? t.generatingSentences : t.generate3Sentences}
                  </Button>
                  <Button variant="secondary" onClick={() => { setKeywords([]); setSentences([]); setSelectedSentence(""); setSentenceMatch(null); setRefinementKw(""); setSentenceMatchHistory([]); }} className="rounded-full">
                    {t.clear}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className={`text-sm font-medium ${language === "ar" ? "text-right" : ""}`}>{t.sentenceOptions}</div>
                  {sentences.length ? (
                    <div className="space-y-2">
                      {sentences.map((s, i) => (
                        <button key={i} onClick={() => setSelectedSentence(s)} className={`w-full rounded-2xl border p-3 ${language === "ar" ? "text-right" : "text-left"} transition ${selectedSentence === s ? "border-blue-700 ring-2 ring-blue-700/20" : "hover:bg-muted"}`}>
                          <div className="text-sm leading-relaxed">{s}</div>
                          {selectedSentence === s && <div className={`mt-2 flex items-center gap-1 text-xs text-primary ${language === "ar" ? "justify-end" : "justify-start"}`}><Check className="h-3 w-3" /> {t.sentenceSelected}</div>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-sm text-muted-foreground ${language === "ar" ? "text-right" : ""}`}>{t.noSentences}</div>
                  )}
                </div>

                {sentences.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className={`text-sm font-medium ${language === "ar" ? "block text-right" : ""}`}>{t.refineLabel}</Label>
                      <div dir={language === "ar" ? "ltr" : undefined} className={`flex gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                        <Input dir={language === "ar" ? "rtl" : undefined} value={refinementKw} onChange={(e) => setRefinementKw(e.target.value)} placeholder={language === "ar" ? "مثال: عاجل، مساعدة، سعر" : "e.g. urgent, help, price"} className="rounded-xl flex-1" onKeyDown={(e) => { if (e.key === "Enter" && refinementKw.trim()) runSentences(); }} />
                        <Button onClick={runSentences} disabled={!refinementKw.trim() || sentLoading} className="rounded-xl bg-blue-600 hover:bg-blue-500 shrink-0">
                          {sentLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : t.regenerate}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <div dir={language === "ar" ? "ltr" : undefined} className={`text-sm font-semibold flex items-center gap-1 ${language === "ar" ? "flex-row-reverse" : ""}`}><span>🔊</span><span dir={language === "ar" ? "rtl" : undefined}>{t.readyToSpeak}</span></div>
                  <div className={`rounded-2xl border-2 p-4 text-base font-medium leading-relaxed transition-colors ${selectedSentence ? "border-blue-300 bg-blue-50 text-blue-800" : "border-dashed"} ${language === "ar" ? "text-right" : ""}`}>
                    {selectedSentence || <span className="text-muted-foreground text-sm font-normal">{t.selectSentenceHint}</span>}
                  </div>
                  <div dir={language === "ar" ? "ltr" : undefined} className={`flex gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                    <Button className="rounded-full" disabled={!selectedSentence || speakLoading} onClick={speakSelectedSentence}>{speakLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}{speakLoading ? (language === "ar" ? "جارٍ التوليد…" : "Generating…") : t.speak}</Button>
                    <Button variant="secondary" className="rounded-full" onClick={stopSpeaking} disabled={speakLoading}><Square className="mr-2 h-4 w-4" /> {t.stop}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {sentences.length > 0 && (
              <div className="px-6 pb-5 pt-2">
                <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-500" onClick={() => setShowEvalA(true)}>
                  {t.nextEvaluate}
                </Button>
              </div>
            )}
            </>) : (
            <Card className="rounded-none shadow-none border-0">
              <div dir={language === "ar" ? "ltr" : undefined} className={`bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                <span className="text-2xl">📋</span>
                <div dir={language === "ar" ? "rtl" : undefined}>
                  <CardTitle className="text-lg">{t.rateTitleA}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.rateDescA}</p>
                </div>
              </div>
              <CardContent className="space-y-5 pt-5">
                <LikertItem title={t.qa1} value={likertA.sentenceAccuracy} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertA((x) => ({ ...x, sentenceAccuracy: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qa2} value={likertA.sentenceEase} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertA((x) => ({ ...x, sentenceEase: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qa3} value={likertA.profileRelevance} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertA((x) => ({ ...x, profileRelevance: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qa4} value={likertA.locationFit} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertA((x) => ({ ...x, locationFit: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qa5} value={likertA.usefulnessPotential} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertA((x) => ({ ...x, usefulnessPotential: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <div className="space-y-1">
                  <Label className={`text-sm font-medium ${language === "ar" ? "block text-right" : ""}`}>{t.additionalComments}</Label>
                  <Textarea dir={language === "ar" ? "rtl" : undefined} value={commentsA} onChange={(e) => setCommentsA(e.target.value)} placeholder={t.commentsPlaceholder} className="rounded-2xl min-h-[100px]" />
                </div>
                {!likertASubmitted ? (
                  <div dir={language === "ar" ? "ltr" : undefined} className={`flex gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                    <Button variant="outline" className="rounded-full border-slate-200 text-slate-600" onClick={() => setShowEvalA(false)}>
                      {t.back}
                    </Button>
                    <Button className="flex-1 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed" onClick={submitLikertA} disabled={Object.values(likertA).some((v) => v === null)}>
                      {t.submit}
                    </Button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
                    <Check className="h-4 w-4 shrink-0" /> {t.submitted}
                  </motion.div>
                )}
              </CardContent>
            </Card>
            )}
            </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-6 mt-0">
            <div className="rounded-3xl overflow-hidden shadow-sm border">
            {!showEvalB ? (<>
            <Card className="rounded-none shadow-none border-0 border-b">
              <div dir={language === "ar" ? "ltr" : undefined} className={`bg-gradient-to-r from-slate-100 to-sky-50 border-b px-6 py-4 flex items-center gap-3 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                <span className="text-2xl">🔍</span>
                <div dir={language === "ar" ? "rtl" : undefined}>
                  <CardTitle className="text-lg">{t.verifyTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.verifyDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-4">
                {/* Sentence strip */}
                <div className="space-y-1">
                  <Label className={`text-xs font-medium text-muted-foreground ${language === "ar" ? "block text-right" : ""}`}>{language === "ar" ? "رسالتك" : "Your message"}</Label>
                  <div className="min-h-[52px] flex flex-wrap gap-1.5 rounded-2xl border-2 border-blue-200 bg-blue-50 p-2">
                    {aacSelection.length === 0 ? (
                      <span className="text-xs text-muted-foreground self-center px-1">{language === "ar" ? "اضغط على البطاقات لبناء رسالتك…" : "Tap tiles below to build your message…"}</span>
                    ) : (
                      aacSelection.map((tile, i) => (
                        <button key={i} type="button" onClick={() => setAacSelection(prev => prev.filter((_, idx) => idx !== i))}
                          className="flex flex-col items-center rounded-xl bg-white border border-blue-300 px-2 py-1 hover:bg-red-50 hover:border-red-300 transition-colors">
                          <span className="text-lg leading-none">{tile.emoji}</span>
                          <span className="text-[10px] leading-none mt-0.5 text-slate-600">{language === "ar" ? tile.ar : tile.en}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {aacSelection.length > 0 && (
                    <button type="button" onClick={() => setAacSelection([])} className={`text-xs text-red-500 hover:text-red-700 ${language === "ar" ? "block w-full text-right" : ""}`}>{t.clear}</button>
                  )}
                </div>

                {/* AAC Board */}
                <div className="space-y-3">
                  <div>
                    <Label className={`text-xs font-medium text-muted-foreground uppercase tracking-wide ${language === "ar" ? "block text-right" : ""}`}>{language === "ar" ? "أساسية" : "Core"}</Label>
                    <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                      {AAC_BOARD.core.map((tile) => (
                        <button key={tile.en} type="button" onClick={() => setAacSelection(prev => [...prev, tile])}
                          className="flex flex-col items-center rounded-xl border bg-white px-1 py-2 hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all">
                          <span className="text-2xl leading-none">{tile.emoji}</span>
                          <span className="text-[10px] mt-1 text-slate-600 text-center leading-tight">{language === "ar" ? tile.ar : tile.en}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {location && AAC_BOARD[location] && (
                    <div>
                      <Label className={`text-xs font-medium text-muted-foreground uppercase tracking-wide ${language === "ar" ? "block text-right" : ""}`}>{{ cafe: language === "ar" ? "مقهى" : "Café", playground: language === "ar" ? "ملعب" : "Playground", classroom: language === "ar" ? "فصل" : "Classroom", majlis: language === "ar" ? "مجلس" : "Majlis", home: language === "ar" ? "المنزل" : "Home" }[location]}</Label>
                      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                        {AAC_BOARD[location].map((tile) => (
                          <button key={tile.en} type="button" onClick={() => setAacSelection(prev => [...prev, tile])}
                            className="flex flex-col items-center rounded-xl border bg-slate-50 px-1 py-2 hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all">
                            <span className="text-2xl leading-none">{tile.emoji}</span>
                            <span className="text-[10px] mt-1 text-slate-600 text-center leading-tight">{language === "ar" ? tile.ar : tile.en}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className={`space-y-1 ${language === "ar" ? "flex flex-col items-end" : ""}`}>
                  <Label className={`text-xs text-muted-foreground ${language === "ar" ? "block text-right" : ""}`}>{t.imageStyle}</Label>
                  <div dir={language === "ar" ? "ltr" : undefined} className={`flex rounded-xl border overflow-hidden w-fit ${language === "ar" ? "flex-row-reverse" : ""}`}>
                    <button type="button" onClick={() => setImageStyleMode("symbolic")} className={`px-4 py-2 text-sm font-medium transition-colors ${imageStyleMode === "symbolic" ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>🔣 {t.imageStyleSymbolic}</button>
                    <button type="button" onClick={() => setImageStyleMode("cartoon")} className={`px-4 py-2 text-sm font-medium transition-colors ${imageStyleMode === "cartoon" ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>🎨 {t.imageStyleCartoon}</button>
                    <button type="button" onClick={() => setImageStyleMode("realistic")} className={`px-4 py-2 text-sm font-medium transition-colors ${imageStyleMode === "realistic" ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>📷 {t.imageStyleRealistic}</button>
                  </div>
                </div>
                {profileCondition && (
                  <div className={`space-y-1 ${language === "ar" ? "flex flex-col items-end" : ""}`}>
                    <Label className={`text-xs text-muted-foreground ${language === "ar" ? "block text-right" : ""}`}>{t.includeConditionLabel}</Label>
                    <div dir={language === "ar" ? "ltr" : undefined} className={`flex rounded-xl border overflow-hidden w-fit ${language === "ar" ? "flex-row-reverse" : ""}`}>
                      <button type="button" onClick={() => setIncludeCondition(true)} className={`px-4 py-2 text-sm font-medium transition-colors ${includeCondition ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{t.yes}</button>
                      <button type="button" onClick={() => setIncludeCondition(false)} className={`px-4 py-2 text-sm font-medium transition-colors ${!includeCondition ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{t.no}</button>
                    </div>
                  </div>
                )}
                <div dir={language === "ar" ? "ltr" : undefined} className={`flex gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                  <Button className="rounded-full bg-blue-600 hover:bg-blue-500" onClick={runVerifyImage} disabled={aacSelection.length === 0 || verifyLoading}>
                    {verifyLoading ? "…" : t.generateImage}
                  </Button>
                  <Button variant="outline" className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => { setVerifyImageUrl(""); setVerifyDecision(null); setVerifyNoSelected(false); }} disabled={!verifyImageUrl}>
                    {t.clearImage}
                  </Button>
                </div>

                {verifyLoading ? (
                  <div className="rounded-2xl border border-dashed p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <RefreshCw className="h-10 w-10 animate-spin text-blue-500" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : verifyImageUrl ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-2xl border">
                      <img src={verifyImageUrl} alt="verification" className="h-auto w-full max-w-xs mx-auto block" />
                    </div>
                    <div className="text-sm font-medium">{t.doesMatch}</div>
                    <div className="flex gap-2">
                      <Button className={`rounded-xl ${verifyDecision === "yes" ? "bg-blue-700 hover:bg-blue-600 text-white" : "border border-blue-200 text-blue-700 hover:bg-blue-50 bg-white"}`} onClick={() => setVerifyDecision("yes")}>
                        <Check className="mr-2 h-4 w-4" /> {t.yes}
                      </Button>
                      <Button className={`rounded-xl ${verifyDecision === "no" ? "bg-blue-800 hover:bg-blue-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"}`} onClick={() => { setVerifyDecision("no"); setVerifyNoSelected(true); setAlternatives([]); }}>
                        <X className="mr-2 h-4 w-4" /> {t.no}
                      </Button>
                    </div>
                    {verifyDecision === "no" && (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-2">
                          <Label className={`text-sm font-medium ${language === "ar" ? "block text-right" : ""}`}>
                            {language === "ar" ? "أضف كلمات لتحسين الصورة (اختياري)" : "Add keywords to refine the image (optional)"}
                          </Label>
                          <div dir={language === "ar" ? "ltr" : undefined} className={`flex gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                            <Input
                              dir={language === "ar" ? "rtl" : undefined}
                              value={imageRefinementKw}
                              onChange={(e) => setImageRefinementKw(e.target.value)}
                              placeholder={language === "ar" ? "مثال: ماء، كوب، شراب" : "e.g. water, glass, drink"}
                              className="rounded-xl flex-1"
                              onKeyDown={(e) => { if (e.key === "Enter") fetchAlternatives(imageRefinementKw); }}
                            />
                            <Button
                              onClick={() => fetchAlternatives(imageRefinementKw)}
                              disabled={altLoading}
                              className="rounded-xl bg-blue-600 hover:bg-blue-500"
                            >
                              {altLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : (language === "ar" ? "توليد" : "Generate")}
                            </Button>
                          </div>
                        </div>
                        {(altLoading || alternatives.length > 0) && (
                          <>
                            <div className="text-sm font-medium">{t.pickClosest}</div>
                            {altLoading ? (
                              <div className="grid grid-cols-3 gap-3">
                                {[0, 1, 2].map((i) => <div key={i} className="rounded-2xl border bg-slate-50 animate-pulse aspect-square" />)}
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-3">
                                {alternatives.map((alt) => (
                                  <button key={alt.text} onClick={() => { setVerifyImageUrl(alt.imageUrl); setVerifyDecision("yes"); setAlternatives([]); }} className="flex flex-col items-center gap-2 rounded-2xl border p-2 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                    <img src={alt.imageUrl} alt={alt.text} className="w-full rounded-xl object-cover aspect-square" />
                                    <span className="text-xs text-muted-foreground leading-tight">{alt.text}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    {t.noVerifyImage}
                  </div>
                )}
              </CardContent>
            </Card>
            {verifyImageUrl && verifyDecision && (
              <div className="px-6 pb-5 pt-2">
                <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-500" onClick={() => setShowEvalB(true)}>
                  {t.nextEvaluate}
                </Button>
              </div>
            )}
            </>) : (
            <Card className="rounded-none shadow-none border-0">
              <div dir={language === "ar" ? "ltr" : undefined} className={`bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                <span className="text-2xl">📊</span>
                <div dir={language === "ar" ? "rtl" : undefined}>
                  <CardTitle className="text-lg">{t.rateTitleB}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.rateDescB}</p>
                </div>
              </div>
              <CardContent className="space-y-5 pt-5">
                <LikertItem title={t.qb1} value={likertB.imageAccuracy} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertB((x) => ({ ...x, imageAccuracy: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qb2} value={likertB.imageEase} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertB((x) => ({ ...x, imageEase: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qb3} value={likertB.profileReflection} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertB((x) => ({ ...x, profileReflection: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qb4} value={likertB.locationFit} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertB((x) => ({ ...x, locationFit: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qb5} value={likertB.usefulnessPotential} labels={language === "ar" ? likertLabelsAr.agree : likertLabels.agree} onChange={(v) => setLikertB((x) => ({ ...x, usefulnessPotential: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <div className="space-y-1">
                  <Label className={`text-sm font-medium ${language === "ar" ? "block text-right" : ""}`}>{t.additionalComments}</Label>
                  <Textarea dir={language === "ar" ? "rtl" : undefined} value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} placeholder={t.commentsPlaceholder} className="rounded-2xl min-h-[100px]" />
                </div>
                {!likertBSubmitted && (
                  <div dir={language === "ar" ? "ltr" : undefined} className={`flex gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
                    <Button variant="outline" className="rounded-full border-slate-200 text-slate-600" onClick={() => setShowEvalB(false)}>
                      {t.back}
                    </Button>
                    <Button
                      onClick={submitLikertB}
                      disabled={likertBSaving || Object.values(likertB).some((v) => v === null)}
                      className="flex-1 rounded-full bg-blue-600 hover:bg-blue-500 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {likertBSaving ? t.saving : t.submit}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
            </div>
            </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Thank you */}
        {likertBSubmitted && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <div className="text-xl font-bold text-green-800">{t.thankYou}</div>
            <p className="text-sm text-green-700">{t.thankYouDesc}</p>
            <Button onClick={resetForNewSubmission} className="rounded-2xl bg-blue-700 hover:bg-blue-600 px-8 py-5 text-base font-semibold">
              {t.doAnother}
            </Button>
          </motion.div>
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
  rtl = false,
  sliderHint = "Move the slider to rate",
}: {
  title: string;
  value: number | null;
  labels: string[];
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  rtl?: boolean;
  sliderHint?: string;
}) {
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const sliderMin = min - 1;
  const display = value ?? sliderMin;
  return (
    <div className={`space-y-2 rounded-2xl border p-4 ${value === null ? "border-dashed border-blue-200 bg-blue-50/40" : ""}`} dir={rtl ? "rtl" : "ltr"}>
      <div className="text-sm font-medium">{title}</div>
      <div className="flex items-center gap-4">
        <Badge className="rounded-full" variant={value === null ? "outline" : "secondary"}>
          {value ?? "—"}
        </Badge>
        <div className="flex-1 space-y-1">
          <Slider
            value={[display]}
            min={sliderMin}
            max={max}
            step={1}
            onValueChange={(v) => { const n = v?.[0] ?? sliderMin; if (n >= min) onChange(n); }}
            className="w-full"
            dir={rtl ? "rtl" : "ltr"}
          />
          <div className="flex justify-between px-2.5 text-xs text-muted-foreground">
            <span className="invisible select-none">0</span>
            {ticks.map((n) => (
              <span
                key={n}
                className={n === value ? "font-semibold text-blue-700" : ""}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {value !== null ? labels[value - 1] : sliderHint}
      </div>
    </div>
  );
}
