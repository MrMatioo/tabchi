export type ConversationState = {
  stage: string;
  lastInteraction: number;
};

export const userConversationState = new Map<string, ConversationState>();

export const replies: Record<string, string[]> = {
  اصل: ["سارا ۲۲ تهران و شما؟"],
  اصل_بده: ["سارا ۲۲ تهران و شما؟"],
  معرفی: ["سارا ۲۲ تهران و شما؟"],
  ربات: ["ربات چیه مگه من آدم نیستم؟ 😂", "نه باو چه رباتی مگه بیحوصله ام"],
  رباتی: ["نه عزیزم ربات چیه مگه بیکارم😐"],
  سلام: [
    "سلامم روز بخیرر. خوبین؟",
    "سلام وقت بخیر. اوضاع چطوره؟ چه خبرا؟",
    "سلااام روز بخیر. امیدوارم روز خوبی رو شروع کرده باشین. شما چطورین؟",
  ],
  صبح_بخیر: [
    "سلام صبح شما هم بخیر. روزو پرانرژی شروع کردین یا چی؟ 😂",
    "صبح بخیرر. روز خوبی داشته باشین. شما معمولاً این ساعت بیدار میشین؟",
  ],
  خوبی: [
    "مرسی فدات شما خوبین؟ روزتون چطور پیش میره?",
    "مرسی شکر خدا شما چطورین؟ اوضاع بر وفق مراده؟",
    "ممنون از احوالپرسی‌تون. خوبم شما خوبین؟ کار و بار چطوره؟",
  ],
  چه_خبر: [
    "سلامتی خبری نیست والا. شما چه خبر؟ کارهای شما چطور پیش میره؟",
    "هیچی کارهای روزمره... خبر خاصی نیست. گپ هم یه کم خلوته نه؟",
  ],
  دانشگاه: [
    "درس‌ها و کلاس‌ها یه کم سنگین شده کلافه کننده‌اس واقعاً. شما هم دانشجوئین؟",
    "دانشگاه هم که کارهای خودش رو داره همیشه شلوغ پلوغه. کلاستون تموم شده؟",
  ],
  کلاس_دارم: [
    "خسته نباشین. استادش خیلی سخت‌گیره؟ اذیتتون می‌کنه؟ 😂",
    "موفق باشین. بعد کلاس اگه فرصت شد بیاین گپ. کلاس کی تموم میشه؟",
  ],
  امتحان: [
    "وای امتحانات واقعاً استرس‌آوره من که خیلی نگرانم همیشه. شما شروع کردین به خوندن؟",
    "انشالله که نتیجه‌اش خوب میشه نگران نباشین. نمونه سوال نگاه کردین؟",
  ],
  پروژه: ["پروژه‌ها خیلی وقت آدم رو می‌گیرن خسته نباشین. تحویلش نزدیکه؟"],
  خسته‌ام: [
    "حق دارین خستگی کار و درس طبیعیه. یه کم استراحت کنین...",
    "خسته نباشین. یه چای داغ بخورین شاید بهتر شدین.",
  ],
  حوصله‌ام_سر_رفته: [
    "آره گپ هم یه کم سوت و کور شده امشب... چرا هیشکی نیست؟",
    "می‌تونین یه فیلمی چیزی ببینین که زمان بگذره. ژانر خاصی مد نظرتون هست؟",
  ],
  سیسی_ناناص: [
    "جووون تو که بهتری ناناصممم 😍",
    "قربونت برم سیسی همه به فدات 😘",
  ],
  کل_کل: [
    "با من لج هرگز! کم میاری کم میارییی 😂",
    "وای خدا... چقد حرف میزنی من رفتم 🚶‍♀️",
  ],
  هول_بازی: [
    "داش مگه تا حالا دختر ندیدی انقدر هولی؟ 😂",
    "پیوی نرو داداش راه نداره... همین‌جا چت کن زشته",
  ],
  سین_زدن: [
    "آدم چت می‌کنه که جواب بگیره... سین نزن رفیق، یه تیکه‌ای بنداز لااقل",
  ],
  کراش: [
    "جووون رو کی کراش زدی کلک؟ زود بگوو 😍",
    "رو من کراش نزنید که من ماله کسی نمیشم 😎",
  ],
};

export function isPositiveAnswer(text: string): boolean {
  const positives = [
    "خوبم",
    "خوب",
    "عالی",
    "خوشحالم",
    "مرسی",
    "ممنون",
    "خداروشکر",
    "بد نیستم",
  ];
  return positives.some((p) => text.includes(p));
}

export function isNegativeAnswer(text: string): boolean {
  const negatives = [
    "نه",
    "خوب نیستم",
    "خراب",
    "ناراحتم",
    "هعی",
    "اه",
    "بد",
    "ناخوش",
  ];
  return negatives.some((n) => text.includes(n));
}

export function isGreeting(text: string): boolean {
  const greetings = ["سلام", "سلاام", "درود", "سلام داداش", "سلام علیک"];
  return greetings.some((g) => text.includes(g));
}

export function isHowAreYou(text: string): boolean {
  return (
    text.includes("خوبی") ||
    text.includes("چطوری") ||
    text.includes("حالت چطوره")
  );
}

export function isWhatsUp(text: string): boolean {
  const exactWhatsUp = ["چخبر", "چه خبر", "چه خبرا"];
  return exactWhatsUp.some((w) => text.includes(w));
}

export function getConversationalReply(userId: string, text: string): string {
  const lower = text.toLowerCase().trim();
  const now = Date.now();

  let state = userConversationState.get(userId) || {
    stage: "idle",
    lastInteraction: 0,
  };

  const isExpired = now - state.lastInteraction > 30000;
  if (isExpired) {
    state.stage = "idle";
  }

  if (
    lower.includes("اصل بده") ||
    lower === "اصل" ||
    lower.includes("معرفی کن") ||
    lower === "معرفی"
  ) {
    userConversationState.set(userId, {
      stage: "answered",
      lastInteraction: now,
    });
    return replies.اصل![0]!;
  }
  if (
    lower.includes("ربات") ||
    lower.includes("بات هستی") ||
    lower.includes("رباتی")
  ) {
    userConversationState.set(userId, {
      stage: "answered",
      lastInteraction: now,
    });
    return replies.ربات![Math.floor(Math.random() * replies.ربات!.length)]!;
  }

  if (lower.includes("چند سالته") || lower.includes("سن")) {
    userConversationState.set(userId, {
      stage: "asked_personal",
      lastInteraction: now,
    });
    return "۲۲ سالمه عزیزم! تو چند سالته؟";
  }
  if (
    lower.includes("تحصیلات") ||
    lower.includes("درس") ||
    lower.includes("دانشگاه") ||
    lower.includes("چی میخونی")
  ) {
    userConversationState.set(userId, {
      stage: "asked_personal",
      lastInteraction: now,
    });
    return "دانشجوی ارشد روانشناسی‌ام، تو چی میخونی؟";
  }
  if (
    lower.includes("اهل کجایی") ||
    lower.includes("کجا زندگی") ||
    lower.includes("شهر")
  ) {
    userConversationState.set(userId, {
      stage: "asked_personal",
      lastInteraction: now,
    });
    return "اهل تهرانم تو چی؟";
  }
  if (
    lower.includes("نام") ||
    lower.includes("اسم") ||
    lower.includes("چی بگم")
  ) {
    userConversationState.set(userId, {
      stage: "asked_personal",
      lastInteraction: now,
    });
    return "اسمم سارا";
  }

  if (state.stage === "asked_how_are_you") {
    if (isPositiveAnswer(lower)) {
      userConversationState.set(userId, {
        stage: "asked_whats_up",
        lastInteraction: now,
      });
      return "خداروشکر، چه خبر؟ دورت بگردم";
    } else if (isNegativeAnswer(lower)) {
      userConversationState.set(userId, {
        stage: "idle",
        lastInteraction: now,
      });
      return "نگران نباش ایشالا درست میشه همه چی، غصه نخور";
    }
  }

  if (state.stage === "asked_whats_up") {
    userConversationState.set(userId, { stage: "idle", lastInteraction: now });
    if (
      lower.includes("خبر") ||
      lower.includes("سلامتی") ||
      lower.includes("هیچی")
    ) {
      return "خداروشکر بیخبری خودش بهترین خبره فعلاً 😂";
    }
    return "آها، که اینطور! انشالله خیره";
  }

  if (state.stage === "asked_personal") {
    userConversationState.set(userId, { stage: "idle", lastInteraction: now });
    return "آها، خوشبختم عزیزم مرسی که گفتی! 👌";
  }

  if (isHowAreYou(lower)) {
    userConversationState.set(userId, {
      stage: "asked_whats_up",
      lastInteraction: now,
    });
    return "منم خوبم مرسی، چه خبرا؟ چیکارا می‌کنی؟";
  }
  if (isWhatsUp(lower)) {
    userConversationState.set(userId, { stage: "idle", lastInteraction: now });
    return "سلامتی خبری نیست والا، روزمرگی... شما چه خبر؟";
  }
  if (isGreeting(lower)) {
    userConversationState.set(userId, {
      stage: "asked_how_are_you",
      lastInteraction: now,
    });
    return "سلام خوبی؟";
  }

  for (const [key, arr] of Object.entries(replies)) {
    const cleanKey = key.replace(/_/g, " ");
    if ((lower.includes(key) || lower.includes(cleanKey)) && arr.length) {
      userConversationState.set(userId, {
        stage: "answered",
        lastInteraction: now,
      });
      return arr[Math.floor(Math.random() * arr.length)]!;
    }
  }

  userConversationState.set(userId, { stage: "idle", lastInteraction: now });
  const defaults = [
    "اع",
    "هوممم واقعا؟ 🤔",
    "درسته",
    "آها! 👌",
    "خوببب پس اینطور",
    "عجببب 🚶‍♀️",
    "هومم شنیدم",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)]!;
}
