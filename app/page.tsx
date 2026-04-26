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
import { Switch } from "@/components/ui/switch";
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
  async generateImage({ prompt, style }: { prompt: string; style: "realistic" | "cartoon" }) {
    // SWITCH MODELS HERE!!!
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, style }),
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
};

const SAMPLE_IMAGES: Record<
  string,
  { src: string; label: string; arLabel: string }[]
> = {
  pharmacy: [
    {
      src: "/samples/pharmacy/medicine.jpg",
      label: "Medicine box",
      arLabel: "علبة دواء",
    },
    { src: "/samples/pharmacy/pills.jpg", label: "Pills", arLabel: "حبوب" },
  ],
  cafe: [
    { src: "/samples/cafe/coffee.jpg", label: "Coffee", arLabel: "قهوة" },
    {
      src: "/samples/cafe/sandwich.jpg",
      label: "Sandwich",
      arLabel: "ساندويش",
    },
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
};

const PARTNER_ROLE_AR: Record<string, string> = {
  parent: "والد/ة",
  caregiver: "مقدم رعاية",
  teacher: "معلم",
  slt: "أخصائي نطق",
  stranger: "غريب / عام",
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
    pharmacyScenario: "Pharmacy counter",
    pharmacyScenarioDesc:
      "Point camera at medicine box → get a short sentence about dosage or a refill.",
    cafeScenario: "Café ordering",
    cafeScenarioDesc:
      "Point camera at the menu → order independently with AI-suggested words.",
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
    generateImage: "Generate verification image",
    clearImage: "Clear image",
    imageStyle: "Image style",
    imageStyleRealistic: "Realistic",
    imageStyleCartoon: "Cartoon",
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
    extraContextPlaceholder:
      "Example: asthma med, child is anxious, need a very short sentence",
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
    refineLabel: "Add keywords to improve the suggestions",
    regenerate: "Regenerate",
    profileNameLabel: "Name",
    profileAgeLabel: "Age",
    profileGenderLabel: "Gender",
    profileConditionLabel: "Condition",
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
    pharmacyDesc: "Ask about medicine or dosage",
    cafeDesc: "Order food or drinks independently",
    majlisDesc: "Join a family gathering or conversation",
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
    rateTitleA: "Rate the keywords & sentences",
    rateDescA: "How well did the AI support word and sentence generation?",
    qa1: "How well did the generated sentences match what you wanted to say?",
    qa2: "How useful were the sentence options for what you wanted to say?",
    qa3: "How easy was it to generate a sentence for this situation?",
    qa4: "How would you rate the speed of the AI output?",
    // Stage B — image evaluation (step 4)
    rateTitleB: "Rate the image verification",
    rateDescB: "How well did the AI image help confirm your intended meaning?",
    qb1: "How accurately did the image represent your intended meaning?",
    qb2: "How helpful was the image verification for confirming your intent?",
    qb3: "How likely are you to use this feature to convey your message?",
    qb4: "How would you rate the speed of the image generation?",
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
    footer: "Qatar AAC AI Design Probe · Workshop prototype",
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
    pharmacyScenario: "طاولة الصيدلية",
    pharmacyScenarioDesc:
      "وجّه الكاميرا نحو علبة الدواء ← احصل على جملة قصيرة عن الجرعة أو إعادة الصرف.",
    cafeScenario: "طلب في المقهى",
    cafeScenarioDesc:
      "وجّه الكاميرا نحو القائمة ← اطلب باستقلالية بكلمات مقترحة من الذكاء الاصطناعي.",
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
    generateImage: "توليد صورة للتحقق",
    clearImage: "مسح الصورة",
    imageStyle: "نمط الصورة",
    imageStyleRealistic: "واقعي",
    imageStyleCartoon: "كرتوني",
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
    extraContextPlaceholder:
      "مثال: دواء الربو، الطفل قلق، أحتاج جملة قصيرة جداً",
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
    intentQuestion: "سؤال / طلب",
    intentConversation: "محادثة",
    // Step 1 — right panel
    keywordsTitle: "الكلمات ← الجمل",
    keywordsDesc: "الذكاء الاصطناعي يقترح كلمات، ثم 3 خيارات جمل للاختيار.",
    noKeywords: "لا توجد كلمات بعد. ارفع صورة أو التقط واحدة، ثم ولّد.",
    addExtraKeywords: "أضف كلمات إضافية لتوليد الجمل",
    keywordsPlaceholder: "",
    generatingSentences: "جارٍ توليد الجمل…",
    generate3Sentences: "توليد 3 خيارات جمل",
    sentenceSelected: "محددة",
    noSentences: "ولّد جملاً لرؤية الخيارات.",
    matchQuestion: "هل هذا يعكس المعنى المقصود؟",
    refineLabel: "أضف كلمات لتحسين الاقتراحات",
    regenerate: "إعادة التوليد",
    profileNameLabel: "الاسم",
    profileAgeLabel: "العمر",
    profileGenderLabel: "الجنس",
    profileConditionLabel: "الحالة",
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
    pharmacyDesc: "سؤال عن الدواء أو الجرعة",
    cafeDesc: "طلب طعام أو مشروبات باستقلالية",
    majlisDesc: "الانضمام إلى تجمع عائلي أو حوار",
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
    rateTitleA: "قيّم الكلمات والجمل",
    rateDescA: "كيف دعم الذكاء الاصطناعي توليد الكلمات والجمل؟",
    qa1: "ما مدى تطابق الجمل المقترحة مع ما أردت قوله؟",
    qa2: "ما مدى فائدة خيارات الجمل لما أردت قوله؟",
    qa3: "ما مدى سهولة توليد جملة في هذا الموقف؟",
    qa4: "كيف تقيّم سرعة مخرجات الذكاء الاصطناعي؟",
    // Stage B — image evaluation (step 4)
    rateTitleB: "قيّم التحقق بالصورة",
    rateDescB: "كيف ساعدت صورة الذكاء الاصطناعي في تأكيد معناك المقصود؟",
    qb1: "ما مدى دقة الصورة في تمثيل معناك المقصود؟",
    qb2: "ما مدى فائدة التحقق بالصورة في تأكيد قصدك؟",
    qb3: "ما مدى احتمال استخدامك لهذه الميزة لنقل رسالتك؟",
    qb4: "كيف تقيّم سرعة توليد الصورة؟",
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
    footer: "مسبار تصميم AAC بالذكاء الاصطناعي في قطر · نموذج أولي للورشة",
  },
} as const;

const SCENARIO_CONFIG: Record<string, { en: { prompt: string; inputLabel: string; placeholder: string }; ar: { prompt: string; inputLabel: string; placeholder: string } }> = {
  cafe: {
    en: {
      prompt: "You're at a busy café and the barista is waiting for your order! You'd like to order a drink.",
      inputLabel: "Which drink would you like to order?",
      placeholder: "e.g. large iced latte, hot chocolate with cream…",
    },
    ar: {
      prompt: "أنت في مقهى مزدحم والبارستا ينتظر طلبك! تريد طلب مشروب.",
      inputLabel: "أي مشروب تريد أن تطلب؟",
      placeholder: "مثال: لاتيه مثلج كبير، شوكولاتة ساخنة...",
    },
  },
  pharmacy: {
    en: {
      prompt: "You are at a pharmacy and need medicine for a symptom you're experiencing.",
      inputLabel: "What symptom do you have, or what medicine do you need?",
      placeholder: "e.g. headache, cough syrup, fever medication…",
    },
    ar: {
      prompt: "أنت في صيدلية وتحتاج إلى دواء لأحد الأعراض التي تعاني منها.",
      inputLabel: "ما العرض الذي تعاني منه أو الدواء الذي تحتاجه؟",
      placeholder: "مثال: صداع، شراب للسعال، دواء للحمى...",
    },
  },
  majlis: {
    en: {
      prompt: "You are hosting guests in your majlis and would like to offer them something!",
      inputLabel: "What would you like to offer your guests?",
      placeholder: "e.g. Arabic coffee, dates, tea, sweets…",
    },
    ar: {
      prompt: "أنت تستضيف ضيوفاً في مجلسك وتريد تقديم شيء لهم!",
      inputLabel: "ماذا تريد أن تقدم لضيوفك؟",
      placeholder: "مثال: قهوة عربية، تمر، شاي، حلويات...",
    },
  },
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
  const partnerRole = "parent";
  const [language, setLanguage] = useState("en");
  const simpleStyle = true;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "sample" | "camera">(
    "upload",
  );
  const [imagePreview, setImagePreview] = useState("");
  const [location, setLocation] = useState("pharmacy");
  const [goal, setGoal] = useState("ask dose");
  const [freeContext, setFreeContext] = useState("");
  const [intention, setIntention] = useState("question");

  const [notes, setNotes] = useState("");
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
  const [imageStyleMode, setImageStyleMode] = useState<"realistic" | "cartoon">("realistic");

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyDecision, setVerifyDecision] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<
    { text: string; imageUrl: string }[]
  >([]);
  const [altLoading, setAltLoading] = useState(false);

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
    keywordRelevance: null,
    sentenceUsefulness: null,
    ease: null,
    speed: null,
  });
  const [likertB, setLikertB] = useState<Record<string, number | null>>({
    imageAccuracy: null,
    helpfulness: null,
    likelihood: null,
    speed: null,
  });

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const style = simpleStyle ? "simple" : "rich";
  const t = UI_LABELS[language as "en" | "ar"] ?? UI_LABELS.en;

  const availableGoals = useMemo(
    () => goalsByLocation[location] || goalsByLocation.pharmacy,
    [location],
  );

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
    const allowed = goalsByLocation[location] || goalsByLocation.pharmacy;
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

  async function runVerifyImage() {
    setVerifyLoading(true);
    setVerifyDecision(null);
    try {
      const prompt = notes || "User note";
      const out = await api.generateImage({ prompt, style: imageStyleMode });
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
    // Record "no" attempt with refinement keywords before resetting
    if (sentenceMatch === "no" && refinementKw.trim()) {
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

  function speakSelectedSentence() {
    if (!selectedSentence || typeof window === "undefined") return;
    window.speechSynthesis.cancel();

    const isArabic = language === "ar";

    function pickVoiceAndSpeak() {
      const utterance = new SpeechSynthesisUtterance(selectedSentence);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.lang = isArabic ? "ar-SA" : "en-US";

      const voices = window.speechSynthesis.getVoices();

      if (isArabic) {
        const preferred = ["Maged", "Laila"];
        const voice =
          voices.find((v) => preferred.some((n) => v.name.includes(n))) ||
          voices.find((v) => v.lang.startsWith("ar"));
        if (voice) utterance.voice = voice;
      } else {
        const preferred = ["Samantha", "Karen", "Daniel", "Moira", "Google UK English Female", "Google US English"];
        const voice =
          voices.find((v) => preferred.some((n) => v.name.includes(n))) ||
          voices.find((v) => v.lang.startsWith("en") && v.localService);
        if (voice) utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      pickVoiceAndSpeak();
    } else {
      // Voices not loaded yet (common on iOS) — wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        pickVoiceAndSpeak();
      };
    }
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
            body: JSON.stringify({ prompt: text, style: imageStyleMode }),
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

      await fetch("/api/save-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          profile: { name: profileName, age: profileAge, gender: profileGender, condition: profileCondition, language },
          location,
          scenario: { intention },
          keywords,
          selectedSentence,
          sentenceMatch: sentenceMatchHistory,
          evaluationA: likertA,
          commentsA,
          verifyDecision,
          verifyImageUrl: savedImageUrl,
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
    setLocation("pharmacy");
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
    setAlternatives([]);
    setImageStyleMode("realistic");
    setLikertA({ keywordRelevance: null, sentenceUsefulness: null, ease: null, speed: null });
    setLikertB({ imageAccuracy: null, helpfulness: null, likelihood: null, speed: null });
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
              <CardTitle className="text-2xl font-bold">{t.welcome}</CardTitle>
              <CardDescription className="text-blue-200 text-base mt-1">
                {t.welcomeDesc}
              </CardDescription>
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
        <div key={sessionKey} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Column 1: Profile + Location */}
          <div className="space-y-6">
            <div className="rounded-3xl overflow-hidden shadow-sm border">
            <Card className="rounded-none shadow-none border-0 border-b">
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-sm">1</div>
                <div>
                  <CardTitle className="text-lg">{t.selectProfile}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.selectProfileDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t.profileNameLabel} <span className="text-red-500">*</span></Label>
                    <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder={t.namePlaceholder} disabled={profileSubmitted} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t.profileAgeLabel}</Label>
                    <Input type="number" min={1} max={120} value={profileAge} onChange={(e) => setProfileAge(e.target.value)} placeholder={t.agePlaceholder} disabled={profileSubmitted} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t.profileGenderLabel}</Label>
                    <Select value={profileGender} onValueChange={setProfileGender} disabled={profileSubmitted}>
                      <SelectTrigger><SelectValue placeholder={t.selectPlaceholder} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t.genderMale}</SelectItem>
                        <SelectItem value="female">{t.genderFemale}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t.profileConditionLabel}</Label>
                    <Select value={profileCondition} onValueChange={setProfileCondition} disabled={profileSubmitted}>
                      <SelectTrigger><SelectValue placeholder={t.selectPlaceholder} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="autism">{t.conditionAutism}</SelectItem>
                        <SelectItem value="als">{t.conditionALS}</SelectItem>
                        <SelectItem value="cerebral-palsy">{t.conditionCerebralPalsy}</SelectItem>
                        <SelectItem value="down-syndrome">{t.conditionDownSyndrome}</SelectItem>
                        <SelectItem value="aphasia">{t.conditionAphasia}</SelectItem>
                        <SelectItem value="other">{t.conditionOther}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none shadow-none border-0">
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-3 flex items-center gap-3">
                <CardTitle className="text-base">{t.chooseLocation} <span className="text-red-500">*</span></CardTitle>
              </div>
              <CardContent className="pt-3 pb-3">
                <div className="grid gap-2">
                  {[
                    { id: "pharmacy", emoji: "💊", label: "Pharmacy", arLabel: "صيدلية", desc: t.pharmacyDesc },
                    { id: "cafe", emoji: "☕", label: "Café", arLabel: "مقهى", desc: t.cafeDesc },
                    { id: "majlis", emoji: "🏡", label: "Majlis", arLabel: "مجلس", desc: t.majlisDesc },
                  ].map((loc) => {
                    const isSelected = selectedLocationId === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => { if (!profileSubmitted) { setSelectedLocationId(loc.id); setLocation(loc.id); } }}
                        disabled={profileSubmitted}
                        className={`rounded-2xl border-2 px-3 py-2.5 text-left transition-all flex items-center gap-3 ${isSelected ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700/20" : "border-transparent bg-slate-50 hover:border-blue-200 hover:bg-blue-50"} ${profileSubmitted ? "cursor-default" : ""}`}
                      >
                        <span className="text-2xl shrink-0">{loc.emoji}</span>
                        <div>
                          <div className="font-semibold text-sm">{language === "ar" ? loc.arLabel : loc.label}</div>
                          <p className="text-xs text-muted-foreground leading-tight">{loc.desc}</p>
                        </div>
                        {isSelected && <Check className="ml-auto h-4 w-4 text-blue-700 shrink-0" />}
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
                disabled={!profileName.trim() || !selectedLocationId}
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

          {/* Column 2: Generate + Evaluate A */}
          <div className={`space-y-6 transition-opacity duration-300 ${!profileSubmitted ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <div className="rounded-3xl overflow-hidden shadow-sm border">
            {!showEvalA ? (<>
            <Card className="rounded-none shadow-none border-0 border-b">
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-lg">1</div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {t.addPhotoTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.addPhotoDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-4">
                <div className="flex rounded-xl border overflow-hidden text-sm font-medium">
                  {(["upload", "sample", "camera"] as const).map((mode) => {
                    const labels = { upload: language === "ar" ? "رفع صورة" : "Upload", sample: language === "ar" ? "أمثلة" : "Samples", camera: language === "ar" ? "كاميرا" : "Camera" };
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
                          className={`rounded-xl border-2 overflow-hidden text-left transition-all ${imagePreview && imagePreview.length > 100 && imageFile?.name === s.src.split("/").pop() ? "border-blue-700 ring-2 ring-blue-700/20" : "border-transparent hover:border-blue-300"}`}
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {t.locationLabel}</Label>
                    <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {{ pharmacy: "💊", cafe: "☕", majlis: "🏡" }[location] ?? "📍"}
                      <span>{{ pharmacy: t.locPharmacy, cafe: t.locCafe, majlis: t.locMajlis }[location] ?? location}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t.intentionLabel}</Label>
                    <Select value={intention} onValueChange={setIntention}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="question">{t.intentQuestion}</SelectItem>
                        <SelectItem value="conversation">{t.intentConversation}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card className="rounded-none shadow-none border-0">
              <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-b px-6 py-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-800 text-white font-bold text-lg">2</div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> {t.keywordsTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.keywordsDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={runKeywords} disabled={!imagePreview || kwLoading || sentLoading} className="rounded-full">
                    {kwLoading || sentLoading ? t.generatingSentences : t.generate3Sentences}
                  </Button>
                  <Button variant="secondary" onClick={() => { setKeywords([]); setSentences([]); setSelectedSentence(""); setSentenceMatch(null); setRefinementKw(""); setSentenceMatchHistory([]); }} className="rounded-full">
                    {t.clear}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">{t.sentenceOptions}</div>
                  {sentences.length ? (
                    <div className="space-y-2">
                      {sentences.map((s) => (
                        <button key={s} onClick={() => setSelectedSentence(s)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedSentence === s ? "border-blue-700 ring-2 ring-blue-700/20" : "hover:bg-muted"}`}>
                          <div className="text-sm leading-relaxed">{s}</div>
                          {selectedSentence === s && <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Check className="h-3 w-3" /> {t.sentenceSelected}</div>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{t.noSentences}</div>
                  )}
                </div>

                {sentences.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="text-sm font-medium">{t.matchQuestion}</div>
                      <div className="flex gap-2">
                        <Button type="button" variant={sentenceMatch === "yes" ? "default" : "outline"} className="rounded-full" onClick={() => { setSentenceMatch("yes"); setSentenceMatchHistory((prev) => [...prev, { match: "yes" }]); setRefinementKw(""); }}>
                          <Check className="mr-2 h-4 w-4" /> {t.yes}
                        </Button>
                        <Button type="button" variant={sentenceMatch === "no" ? "default" : "outline"} className="rounded-full" onClick={() => setSentenceMatch("no")}>
                          <X className="mr-2 h-4 w-4" /> {t.no}
                        </Button>
                      </div>
                      {sentenceMatch === "no" && (
                        <div className="space-y-2">
                          <Label>{t.refineLabel}</Label>
                          <Input value={refinementKw} onChange={(e) => setRefinementKw(e.target.value)} placeholder="e.g. urgent, help, price" />
                          <Button onClick={runSentences} disabled={!refinementKw.trim() || sentLoading} className="w-full rounded-xl">
                            {sentLoading ? t.generatingSentences : t.regenerate}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-1">🔊 {t.readyToSpeak}</div>
                  <div className={`rounded-2xl border-2 p-4 text-base font-medium leading-relaxed transition-colors ${selectedSentence ? "border-blue-300 bg-blue-50 text-blue-800" : "border-dashed"}`}>
                    {selectedSentence || <span className="text-muted-foreground text-sm font-normal">{t.selectSentenceHint}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button className="rounded-full" disabled={!selectedSentence} onClick={speakSelectedSentence}><Volume2 className="mr-2 h-4 w-4" /> {t.speak}</Button>
                    <Button variant="secondary" className="rounded-full" onClick={stopSpeaking}><Square className="mr-2 h-4 w-4" /> {t.stop}</Button>
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
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <CardTitle className="text-lg">{t.rateTitleA}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.rateDescA}</p>
                </div>
              </div>
              <CardContent className="space-y-5 pt-5">
                <LikertItem title={t.qa1} value={likertA.keywordRelevance} labels={language === "ar" ? likertLabelsAr.keywordRelevance : likertLabels.keywordRelevance} onChange={(v) => setLikertA((x) => ({ ...x, keywordRelevance: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qa2} value={likertA.sentenceUsefulness} labels={language === "ar" ? likertLabelsAr.sentenceHelpfulness : likertLabels.sentenceHelpfulness} onChange={(v) => setLikertA((x) => ({ ...x, sentenceUsefulness: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qa3} value={likertA.ease} labels={language === "ar" ? likertLabelsAr.ease : likertLabels.ease} onChange={(v) => setLikertA((x) => ({ ...x, ease: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qa4} value={likertA.speed} labels={language === "ar" ? likertLabelsAr.speed : likertLabels.speed} onChange={(v) => setLikertA((x) => ({ ...x, speed: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t.additionalComments}</Label>
                  <Textarea value={commentsA} onChange={(e) => setCommentsA(e.target.value)} placeholder={t.commentsPlaceholder} className="rounded-2xl min-h-[100px]" />
                </div>
                {!likertASubmitted ? (
                  <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed" onClick={submitLikertA} disabled={Object.values(likertA).some((v) => v === null)}>
                    {t.submit}
                  </Button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
                    <Check className="h-4 w-4 shrink-0" /> {t.submitted}
                  </motion.div>
                )}
              </CardContent>
            </Card>
            )}
            </div>
          </div>

          {/* Column 3: Verify + Evaluate B */}
          <div className={`space-y-6 transition-opacity duration-300 ${!likertASubmitted ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <div className="rounded-3xl overflow-hidden shadow-sm border">
            {!showEvalB ? (<>
            <Card className="rounded-none shadow-none border-0 border-b">
              <div className="bg-gradient-to-r from-slate-100 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <CardTitle className="text-lg">{t.verifyTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.verifyDesc}</p>
                </div>
              </div>
              <CardContent className="space-y-4">
                {selectedLocationId && SCENARIO_CONFIG[selectedLocationId] && (
                  <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 leading-relaxed">
                    {SCENARIO_CONFIG[selectedLocationId][language === "ar" ? "ar" : "en"].prompt}
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    {selectedLocationId && SCENARIO_CONFIG[selectedLocationId]
                      ? SCENARIO_CONFIG[selectedLocationId][language === "ar" ? "ar" : "en"].inputLabel
                      : t.quickNote}
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      selectedLocationId && SCENARIO_CONFIG[selectedLocationId]
                        ? SCENARIO_CONFIG[selectedLocationId][language === "ar" ? "ar" : "en"].placeholder
                        : t.quickNotePlaceholder
                    }
                  />
                  <p className="text-xs text-muted-foreground">{language === "ar" ? "اكتب ما ستقوله في هذا الموقف" : "Type what you would say in this situation"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t.imageStyle}</Label>
                  <div className="flex rounded-xl border overflow-hidden w-fit">
                    <button type="button" onClick={() => setImageStyleMode("realistic")} className={`px-4 py-2 text-sm font-medium transition-colors ${imageStyleMode === "realistic" ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>📷 {t.imageStyleRealistic}</button>
                    <button type="button" onClick={() => setImageStyleMode("cartoon")} className={`px-4 py-2 text-sm font-medium transition-colors ${imageStyleMode === "cartoon" ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>🎨 {t.imageStyleCartoon}</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="rounded-full bg-blue-600 hover:bg-blue-500" onClick={runVerifyImage} disabled={!notes.trim() || verifyLoading}>
                    {verifyLoading ? "…" : t.generateImage}
                  </Button>
                  <Button variant="outline" className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => { setVerifyImageUrl(""); setVerifyDecision(null); }} disabled={!verifyImageUrl}>
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
                      <img src={verifyImageUrl} alt="verification" className="h-auto w-full" />
                    </div>
                    <div className="text-sm font-medium">{t.doesMatch}</div>
                    <div className="flex gap-2">
                      <Button className={`rounded-xl ${verifyDecision === "yes" ? "bg-blue-700 hover:bg-blue-600 text-white" : "border border-blue-200 text-blue-700 hover:bg-blue-50 bg-white"}`} onClick={() => setVerifyDecision("yes")}>
                        <Check className="mr-2 h-4 w-4" /> {t.yes}
                      </Button>
                      <Button className={`rounded-xl ${verifyDecision === "no" ? "bg-blue-800 hover:bg-blue-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"}`} onClick={() => { setVerifyDecision("no"); fetchAlternatives(); }}>
                        <X className="mr-2 h-4 w-4" /> {t.no}
                      </Button>
                    </div>
                    {verifyDecision === "no" && (
                      <div className="space-y-3 pt-1">
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
            {verifyImageUrl && (
              <div className="px-6 pb-5 pt-2">
                <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-500" onClick={() => setShowEvalB(true)}>
                  {t.nextEvaluate}
                </Button>
              </div>
            )}
            </>) : (
            <Card className="rounded-none shadow-none border-0">
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b px-6 py-4 flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <CardTitle className="text-lg">{t.rateTitleB}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.rateDescB}</p>
                </div>
              </div>
              <CardContent className="space-y-5 pt-5">
                <LikertItem title={t.qb1} value={likertB.imageAccuracy} labels={language === "ar" ? likertLabelsAr.imageAccuracy : likertLabels.imageAccuracy} onChange={(v) => setLikertB((x) => ({ ...x, imageAccuracy: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qb2} value={likertB.helpfulness} labels={language === "ar" ? likertLabelsAr.helpfulness : likertLabels.helpfulness} onChange={(v) => setLikertB((x) => ({ ...x, helpfulness: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qb3} value={likertB.likelihood} labels={language === "ar" ? likertLabelsAr.likelihood : likertLabels.likelihood} onChange={(v) => setLikertB((x) => ({ ...x, likelihood: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <LikertItem title={t.qb4} value={likertB.speed} labels={language === "ar" ? likertLabelsAr.speed : likertLabels.speed} onChange={(v) => setLikertB((x) => ({ ...x, speed: v }))} rtl={language === "ar"} sliderHint={t.sliderHint} />
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t.additionalComments}</Label>
                  <Textarea value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} placeholder={t.commentsPlaceholder} className="rounded-2xl min-h-[100px]" />
                </div>
                {!likertBSubmitted && (
                  <Button
                    onClick={submitLikertB}
                    disabled={likertBSaving || Object.values(likertB).some((v) => v === null)}
                    className="w-full rounded-full bg-blue-600 hover:bg-blue-500 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {likertBSaving ? t.saving : t.submit}
                  </Button>
                )}
              </CardContent>
            </Card>
            )}
            </div>
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
