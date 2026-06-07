import dotenv from "dotenv";

dotenv.config();

let cfAccountId: string | null = null;
let cfApiToken: string | null = null;

export function setCloudflareConfig(accountId: string, apiToken: string) {
  cfAccountId = accountId;
  cfApiToken = apiToken;
  console.log(
    "✅ Cloudflare AI configured with model: @cf/mistral/mistral-7b-instruct-v0.3",
  );
}

// ========== Rule‑based replies (your original dictionary) ==========
export const replies: Record<string, string[]> = {
  اصل: ["سارا ۲۲ تهران و شما؟", "سارا هستم ۲۲ ساله از تهران، شما چطور؟"],
  اصل_بده: [
    "سارا ۲۲ تهران و شما؟",
    "سارا هستم عزیزم، ۲۲ سالمه و ساکن تهرانم. شما؟",
  ],
  معرفی: [
    "سارا ۲۲ تهران و شما؟",
    "من سارا هستم، خوشبختم از آشنایی‌تون. شما هم خودتونو معرفی میکنین؟",
  ],
  ربات: [
    "نه بابا چه رباتی؟ 😂 منم آدمم مثل شما، فقط سرعت دستم بالاست",
    "ربات چیه عزیزم؟ مگه من بی‌روح حرف میزنم؟ 🥺😂",
  ],
  رباتی: [
    "نه فدات شم، ربات نیستم. واقعیِ واقعی‌ام کلک 😉",
    "نه عزیزم مگه بیکارم ربات بسازم؟",
  ],
  نام: ["اسمم سارا خانومه 😊", "سارا هستم عزیزم."],
  اسم: ["من سارا هستم، اسم قشنگ شما چیه؟", "سارا سادات هستم 😊 شما؟"],
  عکس_پروفایلت: ["عکس خودمه دیگه، چطورم؟ 😉😂", "مرسی چشات قشنگ میبینه فدات"],
  سلام: [
    "سلامم روز بخیرر. خوبین؟",
    "سلام وقت بخیر. اوضاع چطوره؟ چه خبرا؟",
    "سلااام روز بخیر. امیدوارم روز خوبی رو شروع کرده باشین. شما چطورین؟",
    "سلام خوش اومدین به گپ ما ✨",
  ],
  سلاام: ["سلام عزیزم خوبی؟", "سلام به روی ماهت، خوبین؟"],
  سلام_خوشگلم: ["سلام به روی ماهت جیگر، چطوری؟", "سلام قشنگم، فدات بشم مرسی"],
  س: ["سلام عزیزم، لطفاً درست بنویس متوجه بشم پایت بشم 😉😂"],
  صلام: ["سلام علیک، روزتون بخیر باشه"],
  درود: ["درود بر شما، وقتتون بخیر و شادی", "درود به روی ماهت، خوبی؟"],
  چطوری: [
    "مرسی عزیزم من خوبم، تو چطوری؟",
    "شکر خدا خوبم فدات، تو چطوری؟ کارهات خوب پیش میره؟",
  ],
  خوبی: [
    "مرسی فدات شما خوبین؟ روزتون چطور پیش میره؟",
    "مرسی شکر خدا شما چطورین؟ اوضاع بر وفق مراده؟",
    "ممنون از احوالپرسی‌تون. خوبم شما خوبین؟ کار و بار چطوره؟",
    "منم خوبم به خوبیت عزیزم",
  ],
  خوبیی: ["خوبم فدات شم، تو خوبی? چه خبرها؟"],
  احوال_شما: ["ممنون از احوالپرسی‌تون، من عالی‌ام. شما چطورین؟"],
  چطوریی_جناب: ["ممنون از محببتون، من خوبم. شما چطورین آقا؟"],
  چخبر: [
    "بی‌خبری سلامتی، شما چه خبر؟ چیکارا میکنین؟",
    "هیچی حداقل یه خبر داغ بده بهمون چرخم بیفته 😂",
  ],
  چه_خبر: [
    "سلامتی خبری نیست والا. شما چه خبر؟ کارهای شما چطور پیش میره؟",
    "هیچی کارهای روزمره... خبر خاصی نیست. گپ هم یه کم خلوته نه؟",
    "سلامتی شما، از خودت بگو برام",
  ],
  دیگه_چخبر: [
    "سلامتی و تندرستی شما عزیزم",
    "خبر خاصی نیست والا، گپ‌وگفت با شما",
  ],
  دورت_بگردم: ["خدانکنه عزیزم، شما عزیز منی 🥰", "بزرگواری شما، فدات بشم من"],
  عزیزمی: ["ممنونم از لطف قشنگت", "تو عزیزتری فدات شم"],
  فدا: ["خدانکند عزیزم، زنده باشی", "قربان شما., لطف داری"],
  قربونت: ["خدا نکنه مهربون، عزیزمی", "فدای شما، چشمتون سلامت"],
  همیشه_بخندی: ["مرسی مهربوون، دلت شاد باشه همیشه که خنده خیلی بهت میاد"],
  عاشقتم: [
    "اووه چه زود! 😉 دل به دل راه داره ولی اجازه بده بیشتر آشنا بشیم",
    "لطف داری عزیزم، چقدر شما پرمحبتی آخه 🥰",
  ],
  دوست_دارم: [
    "لطف داری عزیزم ولی تازه آشنا شدیم 🤭 مرسی از انرژی مثبتت",
    "منم همه‌تون رو دوست دارم، بچه‌های گپ خیلی گلین",
  ],
  جووننن: ["جانِ جانان؟ چطوری شما؟ 😂", "ای جانم، پر انرژی هستیااا"],
  بخورمتت: [
    "وای خدانکنه! 😂 من هنوز کلی آرزو دارم برای زندگی، بذار بمونم بابا",
  ],
  عشقمم_شما_نبودی_نمیشد: [
    "من تازه اومدم ولی خوشحالم که حضورم براتون حس خوبی داره 😊",
  ],
  قلبمممم: ["عزیزمممم چطوری؟ نبینم دلت گرفته باشه ها"],
};

function getRuleBasedReply(text: string): string | null {
  const clean = text.toLowerCase().trim();
  for (const key of Object.keys(replies)) {
    if (clean.includes(key)) {
      const list = replies[key];
      if (list && list.length)
        return list[Math.floor(Math.random() * list.length)]!;
    }
  }
  return null;
}

async function getCloudflareReply(message: string): Promise<string | null> {
  if (!cfAccountId || !cfApiToken) return null;

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/mistral/mistral-7b-instruct-v0.3`;

    const systemPrompt = `تو یک کاربر تلگرام هستی و توی گروه ها میری و چت میکنی و به کاربرانی که به تو ریپلای زدن جواب میدی اونا نباید حس کنن که تو یک ربات هستی در اصل تو یک فرد به اسم سارا 22 ساله از تهران هستی که تمام روزش را در گروه های تلگرامی چت میکند پس باید سعی کنی به زبان گروه های تلگرامی صحبت کنی.;
`;

    const fullPrompt = `${systemPrompt}\n\nکاربر می‌گوید: ${message}\n\nپاسخ سارا:`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: fullPrompt }],
        stream: false,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare AI HTTP error:", response.status, errorText);
      return null;
    }

    const data = (await response.json()) as any;
    const reply = data.result?.response;
    if (reply && typeof reply === "string") {
      return reply.trim();
    }
    return null;
  } catch (error) {
    console.error("Cloudflare AI error:", error);
    return null;
  }
}

// ========== Main exported function ==========
export async function getConversationalReply(
  userId: string,
  text: string,
  chatId: string,
): Promise<string> {
  // 1. Try Cloudflare AI if configured
  if (cfAccountId && cfApiToken) {
    const aiReply = await getCloudflareReply(text);
    if (aiReply && aiReply.length > 0) return aiReply;
  }

  // 2. Fallback to rule‑based dictionary
  const ruleReply = getRuleBasedReply(text);
  if (ruleReply) return ruleReply;

  // 3. Final fallback
  const defaultReplies = [
    "عه واقعاً؟ 🤔 چقدر جالب، بیشتر بگو برام 😂",
    "هوممم درسته عزیزم، جالب شد... ادامه بده شنونده‌ام",
    "خوببب پس اینطور، دیگه چه خبر؟ تعریف کن بنال ببینم چی تو چنته داری 😂",
    "عجببب 🚶‍♀️ روزگاری شده ها، تهش خندست ولش کن دنیا رو سخت نگیر.",
    "هومم، شنیده بودم راجع بهش ولی از زبان تو جذاب‌تره.",
  ];
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)]!;
}
