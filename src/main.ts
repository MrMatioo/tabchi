import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "readline/promises";
import http from "http";
import { stdin, stdout } from "process";
import random from "random";
import dotenv from "dotenv";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";

dotenv.config();

function startSimpleServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive!");
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`✅ Simple HTTP server running on port ${port}`);
  });
}

const rl = readline.createInterface({ input: stdin, output: stdout });
async function ask(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

const apiId = Number(process.env.API_ID);
const apiHash = String(process.env.API_HASH);
const stringSession = new StringSession(process.env.STRINGSESSION || "");

type ConversationState = {
  stage: string;
};
const userConversationState = new Map<string, ConversationState>();

interface QueueItem {
  chatId: string;
  messageId: number;
  replyText: string;
  userId: string;
}

const queue: QueueItem[] = [];
let processing = false;

function isPositiveAnswer(text: string): boolean {
  const positives = [
    "خوبم",
    "خوب",
    "عالی",
    "خوشحالم",
    "مرسی",
    "ممنون",
    "خداروشکر",
    "آره",
    "بله",
    "اوکی",
    "حله",
    "بد نیستم",
    "بد نبود",
    "خیلی خوب",
  ];
  return positives.some((p) => text.includes(p));
}

function isNegativeAnswer(text: string): boolean {
  const negatives = [
    "نه",
    "خوب نیستم",
    "خراب",
    "ناراحتم",
    "هعی",
    "اه",
    "بد",
    "ناخوش",
    "گرفتگی",
  ];
  return negatives.some((n) => text.includes(n));
}

function isGreeting(text: string): boolean {
  const greetings = ["سلام", "سلاام", "درود", "سلام داداش", "سلام علیک"];
  return greetings.some((g) => text.includes(g));
}

function isHowAreYou(text: string): boolean {
  return (
    text.includes("خوبی") ||
    text.includes("چطوری") ||
    text.includes("حالت چطوره")
  );
}

function isWhatsUp(text: string): boolean {
  return (
    text.includes("چخبر") || text.includes("چه خبر") || text.includes("خبر")
  );
}

function getConversationalReply(userId: string, text: string): string {
  const lower = text.toLowerCase().trim();
  let state = userConversationState.get(userId) || { stage: "idle" };

  if (lower.includes("چند سالته") || lower.includes("سن")) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "۲۲ سالمه عزیزم! تو چند سالته؟";
  }
  if (
    lower.includes("تحصیلات") ||
    lower.includes("درس") ||
    lower.includes("دانشگاه") ||
    lower.includes("چی میخونی")
  ) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "دانشجوی ارشد روانشناسی‌ام، تو چی میخونی؟";
  }
  if (
    lower.includes("شغل") ||
    lower.includes("کار") ||
    lower.includes("چیکار میکنی")
  ) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "الان دانشجو هستم، گاهی فریلنسری هم کار می‌کنم. خودت چی؟";
  }
  if (
    lower.includes("اهل کجایی") ||
    lower.includes("کجا زندگی") ||
    lower.includes("شهر")
  ) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "اهل تهرانم تو چی؟";
  }
  if (
    lower.includes("نام") ||
    lower.includes("اسم") ||
    lower.includes("چی بگم")
  ) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "اسمم سارا";
  }
  if (
    lower.includes("مجرد") ||
    lower.includes("متاهل") ||
    lower.includes("دوست پسر")
  ) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "مجردم";
  }

  if (isHowAreYou(lower)) {
    userConversationState.set(userId, { stage: "asked_whats_up" });
    return "خوبم ممنون، چه خبر؟ خودت خوبی؟";
  }
  if (isWhatsUp(lower)) {
    userConversationState.set(userId, { stage: "idle" });
    return "مثل همیشه خودت چخبر";
  }
  if (isGreeting(lower)) {
    userConversationState.set(userId, { stage: "asked_how_are_you" });
    return "سلام خوبی";
  }

  if (state.stage === "asked_how_are_you") {
    if (isPositiveAnswer(lower)) {
      userConversationState.set(userId, { stage: "asked_whats_up" });
      return "خداروشکر چه خبر؟";
    } else if (isNegativeAnswer(lower)) {
      userConversationState.set(userId, { stage: "idle" });
      return "نگران نباش ایشالا درست میشه همه چی";
    } else {
      userConversationState.set(userId, { stage: "idle" });
      return "نفغمیدم بالاخره خوبی یا نه😐😑";
    }
  }
  if (state.stage === "asked_whats_up") {
    if (lower.includes("خبری نیست") || lower.includes("هیچی")) {
      userConversationState.set(userId, { stage: "idle" });
      return "خداروشکر بیخبری خوبه";
    } else if (isPositiveAnswer(lower)) {
      userConversationState.set(userId, { stage: "idle" });
      return "عالی";
    } else {
      userConversationState.set(userId, { stage: "idle" });
      return "ایبابا این همه خبر";
    }
  }

  if (state.stage === "asked_personal") {
    userConversationState.set(userId, { stage: "idle" });
    return "آها، مرسی که گفتی!";
  }

  for (const [key, arr] of Object.entries(replies)) {
    const cleanKey = key.replace(/_/g, " ");
    if ((lower.includes(key) || lower.includes(cleanKey)) && arr.length) {
      return arr[Math.floor(Math.random() * arr.length)]!;
    }
  }

  userConversationState.set(userId, { stage: "idle" });
  const defaults = [
    "اع",
    "یعنی چی؟ 🤔",
    "هوممم",
    "درسته",
    "آها! 👌",
    "چی گفتی متوجه نشدم؟",
    "خوببب",
    "عجببب 🚶‍♀️",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)]!;
}

const replies: Record<string, string[]> = {
  // --- MORNING GREETINGS & STARTING THE DAY ---
  سلام: [
    "سلامم روز بخیرر. خوبین؟",
    "سلام وقت بخیر. اوضاع چطوره؟ چه خبرا؟",
    "سلااام روز بخیر. امیدوارم روز خوبی رو شروع کرده باشین. شما چطورین؟",
  ],
  صبح_بخیر: [
    "سلام صبح شما هم بخیر. روزو پرانرژی شروع کردین یا چی؟ 😂",
    "صبح بخیرر. روز خوبی داشته باشین. شما معمولاً این ساعت بیدار میشین؟",
    "سلام صبح بخیر. انشالله روز خوبی باشه واسه همه. مشغول کاری هستین الان؟",
  ],
  خوبی: [
    "مرسی فدات شما خوبین؟ روزتون چطور پیش میره؟",
    "مرسی شکر خدا شما چطورین؟ اوضاع بر وفق مراده؟",
    "ممنون از احوالپرسی‌تون. خوبم شما خوبین؟ کار و بار چطوره؟",
    "راستش بد نیستم گذران عمره😂 شما چطورین؟ روز شلوغی داشتین؟",
  ],
  چه_خبر: [
    "سلامتی خبری نیست والا. شما چه خبر؟ کارهای شما چطور پیش میره؟",
    "هیچی کارهای روزمره... خبر خاصی نیست. گپ هم یه کم خلوته نه؟ کجایین پس؟",
    "سلامتی خبر خاصی که نیست. شما چخبر؟ برنامه خاصی دارین برای امروز؟",
    "والا خبری نیست همه چیز مثل همیشه‌اس. برای شما چطور؟ اتفاق جدیدی نیفتاده؟",
  ],

  // --- ACADEMIC & UNIVERSITY LIFE ---
  دانشگاه: [
    "راستش درس‌ها و کلاس‌ها یه کم سنگین شده کلافه کننده‌اس واقعاً. شما هم دانشجوئین؟",
    "دانشگاه هم که کارهای خودش رو داره همیشه شلوغ پلوغه. شما کلاستون تموم شده؟",
    "والا من این ترم کلاً خیلی خسته شدم از کلاس‌ها. شما اوضاع درساتون چطوره؟",
    "امتحانات که نزدیک میشن آدم همش استرس داره... شما برنامه‌ریزی کردین براش؟",
  ],
  کلاس_دارم: [
    "خسته نباشین. استادش خیلی سخت‌گیره؟ اذیتتون می‌کنه؟ 😂",
    "موفق باشین. بعد کلاس اگه فرصت شد بیاین گپ. کلاس کی تموم میشه؟",
    "بله حتماً به درستون برسین خدا به همراتون. خیلی طول می‌کشه کلاستون؟",
  ],
  امتحان: [
    "وای امتحانات واقعاً استرس‌آوره من که خیلی نگرانم همیشه. شما شروع کردین به خوندن？",
    "انشالله که نتیجه‌اش خوب میشه نگران نباشین. نمونه سوال نگاه کردین؟",
    "سخت بود؟ امیدوارم نمره‌تون خوب بشه. بقیه درساتون چطورن؟",
    "کاش زودتر این ترم تموم بشه راحت شیم واقعاً! شما چند واحد دارین این ترم؟",
  ],
  پروژه: [
    "پروژه‌ها خیلی وقت آدم رو می‌گیرن خسته نباشین. تحویلش نزدیکه؟",
    "منم کلی کار تحویلی دارم ولی اصلاً حسش نمیاد انجام بدم... شما هم همش عقب می‌اندازین؟",
    "امیدوارم زودتر جمع‌وجورش کنین کار سختیه واقعاً. کمک نمی‌خواید از کسی؟",
  ],
  خسته‌ام: [
    "حق دارین خستگی کار و درس طبیعیه. یه کم استراحت کنین... روز خیلی سختی بود؟",
    "خسته نباشین. یه چای داغ بخورین شاید بهتر شدین. کاری مونده که باید انجام بدین؟",
    "کارها واقعاً انرژی آدم رو می‌گیرن. استراحت کنین حتماً. می‌خواین بعداً صحبت کنیم؟",
  ],

  // --- FOOD, DRINKS & DAILY ROUTINES ---
  ناهار: [
    "نوش جانتون باشه گوارای وجود. ناهار چی داشتین حالا؟ 😋",
    "نوش جان بفرمایید جای ما هم خالی. خودتون درست کردین؟",
    "منم تازه ناهار خوردم ممنون. شما بعد ناهار خوابتون نمیگیره؟",
  ],
  شام: [
    "نوش جان شام سبک بخورین که اذیت نشین. برنامه‌تون چیه واسه بعد شام؟",
    "ممنون گوارای وجودتون باشه. شام رو زود می‌خورین همیشه؟",
    "راستش من هنوز درست نکردم یه کم تنبلیم میاد امشب... شما ایده خاصی دارین چی درست کنم؟",
  ],
  گشنمه: [
    "خب پاشین یه چیزی درست کنین ضعف نکنین یه وقت! چیز آماده تو یخچال ندارین؟",
    "آدم وقتی کار می‌کنه زود گشنه‌اش میشه. یه چیز کوچیک بخورین حداقل. املت چطوره؟",
    "منم بعضی وقتا اینطوری میشم ولی حوصله آشپزی ندارم. شما معمولاً از بیرون غذا می‌گیرین؟",
  ],
  چایی: [
    "نوش جان چای بعد از کار واقعاً خستگی رو در می‌کنه. شما چای پررنگ دوست دارین؟",
    "آخ گفتی! منم برم واسه خودم یه چای بریزم موافقین؟ ☕️",
    "بفرمایید داغه مواظب باشین. با شکلات می‌خورین یا قند؟",
  ],
  کیک: [
    "نوش جانتون باشه به نظر خوشمزه میاد. خودتون پختین؟",
    "مبارکه به چه مناسبتی؟ نوش جان کادو هم گرفتین؟ 😍",
    "گوارای وجودتون با چای می‌چسبه. میل دارین؟",
  ],

  // --- AFTERNOON, BOREDOM & CHAT FLOW ---
  عصر_بخیر: [
    "عصر شما هم بخیر باشه خسته نباشین. برنامه‌تون چیه واسه غروب؟",
    "سلام عصر بخیر چیکار می‌کنین؟ روزتون چطور گذشت؟",
    "عصر خوش امیدوارم حالتون خوب باشه. بیرون رفتین امروز؟",
  ],
  حوصله‌ام_سر_رفته: [
    "آره گپ هم یه کم سوت و کور شده امشب... چرا هیشکی نیست؟",
    "می‌تونین یه فیلمی چیزی ببینین که زمان بگذره. ژانر خاصی مد نظرتون هست؟",
    "کاش یه بحث خوبی راه بیفته که سرگرم بشیم. شما پیشنهادی دارین؟ چی کار کنیم؟",
  ],
  کجایی: [
    "من خونه‌ام چطور مگه؟ اتفاقی افتاده؟ 🤔",
    "بیرونم یه کم کار داشتم. کاری داشتین؟ موضوع خاصیه؟",
    "هستم تو گپ چت‌ها رو می‌خونم معمولاً. شما کجایین الان؟",
  ],
  چیکار_کنی: [
    "هیچی والا کار خاصی نمی‌کنم شما چیکار می‌کنین؟ کاراتون تموم شد؟",
    "یه کم کار دارم انجام بدم میام. عجله دارین؟",
    "دارم چت‌های گپ رو نگاه می‌کنم خبر خاصی نیست. شما موضوع جالبی دیدین؟",
  ],
  چه_هواییه: [
    "آره واقعاً هوای امروز خیلی خوب و آرومه. اونجا بارون نمیاد؟",
    "اینجا که هوا یه کم دلگیره آدم کلافه میشه. هوای اونجا چطوره؟",
    "من عاشق این‌جور هوام حس خوبی میده. شما هم پیاده‌روی رو دوست دارین تو این هوا؟",
  ],

  // --- AGREEMENT, DISAGREEMENT & GROUP LOGIC ---
  موافقم: [
    "بله دقیقاً منم نظرم همینه. بقیه هم با ما هم‌عقیده‌ان؟",
    "حرفتون کاملاً منطقیه موافقم باهاتون. شما همیشه انقدر دقیق به قضایا نگاه می‌کنین؟",
    "درسته منم فکر می‌کنم بهترین راه همینه. به نظرتون کی باید شروعش کنیم؟",
  ],
  مخالفم: [
    "نمیدونم والا ولی به نظرم این‌جوری هم نیست... دلایلتون چیه برای این حرف؟",
    "شاید حق با شما باشه ولی من یه کم نظرم فرق می‌کنه. مایلین بیشتر توضیح بدین؟",
    "فکر کنم از یه زاویه دیگه هم میشه بهش نگاه کرد. به نظر شما اون طرف قضیه چی میشه؟",
  ],
  جدی_میگم: [
    "بله متوجه شدم لحنتون کاملاً جدی بود. واقعاً شوخی نبود؟ 😮",
    "عجب! واقعاً فکر نمی‌کردم اینطوری باشه. مطمئنین از این قضیه؟",
    "حرفتون درسته قبول دارم. حالا قراره چیکار کنین؟",
  ],
  شوخی_کردم: [
    "بله می‌دونم یه لحظه جدی گرفتم😂 راستش همیشه انقدر جدی شوخی می‌کنین؟",
    "عیب نداره شوخی‌تون جالب بود. بقیه هم متوجه شوخی شدن؟",
    "مشکلی نیست متوجه شدم شوخی بود ولی یه لحظه نگران شدما! شما چطور؟",
  ],
  راست_میگی: [
    "آره واقعاً عین واقعیته خودم هم تعجب کردم. شما قبلا اینو شنیده بودین؟",
    "بله درسته منم اینو شنیده بودم قبلاً. منبعش رو می‌دونین کجاست؟",
  ],
  دروغه: [
    "نمیدونم والا چرا باید دروغ بگن آخه؟ نفعش چیه براشون؟",
    "راست و دروغش رو نمیدونم منم فقط شنیدم. شما حقیقتش رو می‌دونین؟",
    "شاید سوءتفاهم شده زود قضاوت نکنیم بهتره. موافق نیستین؟",
  ],
  مطمئنی: [
    "تا جایی که من اطلاع دارم بله... حالا باز دقیق نمیدونم. شما چیز دیگه‌ای شنیدین？",
    "راستش کاملاً مطمئن نیستم ولی به نظر میاد درست باشه. شما شک دارین بهش؟",
    "بذارین باز چک کنم اگه لازم شد. شما جای معتبری سراغ دارین؟",
  ],

  // --- TECH ISSUES & ROUTINE DISRUPTIONS ---
  نتم_خرابه: [
    "وای بله نت کلاً رو اعصابه امروز... خیلی اذیت می‌کنه. اپراتورتون چیه مگه؟",
    "واسه منم هی قطع و وصل میشه کلافه کننده‌اس واقعاً. مودمتون رو چک کردین؟",
    "یه بار حالت پرواز بزنین شاید نتش پایدارتر شد. فرجی شد واسه شما؟ 😂",
  ],
  شارژ_ندارم: [
    "بزنین به شارژ خاموش نشه گوشیتون. پاوربانک دارین همراهتون؟",
    "منم همش نگران شارژ گوشیمم زود خالی میکنه. مدل گوشیتون چیه مگه؟",
    "بله حتماً برین تا خاموش نشده. فعلاً... بعداً میاین دیگه؟",
  ],
  پیام_دادم: [
    "ببخشید من ندیدم الان نگاه می‌کنم. پیامتون رو توی پیوی فرستادین یا همین‌جا؟",
    "کجا پیام دادین؟ بذارین چک کنم. ریپلای کردین روی متنم؟",
    "متوجه نشدم الان ریپلای‌ها رو بررسی می‌کنم. چیز مهمی بود؟",
  ],
  تلفن: [
    "ببخشید گوشیم زنگ می‌خوره یه لحظه غایب میشم بعداً می‌بینمتون باشه؟",
    "بله حتماً جواب بدین کار واجب واجب‌تره. تماس مهمی بود؟",
  ],

  // --- EMOTIONS, EXPRESSIONS & EMPOWERMENT ---
  ببین: [
    "بله بفرمایید می‌شنوم موضوع چیه؟",
    "جانم؟ چیزی شده؟ من اشتباهی کردم؟ 🥺",
    "بله سراپا گوشم بفرمایید",
  ],
  راستی: [
    "بله؟ یاد چی افتادین؟ خیر باشه انشالله؟ 😏",
    "جانم؟ بفرمایید گوش میدم",
    "بله چیزی شده؟ موضوع جدیدیه؟",
  ],
  نمیدونم: [
    "عیب نداره پیش میاد منم خیلی چیزا رو نمیدونم! بپرسیم از بقیه؟",
    "منم برام مبهمه راستش... ولش کنین اصلاً بحث رو عوض کنیم؟",
  ],
  ببخشید: [
    "خواهش می‌کنم اشکالی نداره اصلاً. شما که کاری نکردین؟",
    "نه بابا این چه حرفیه مشکلی نیست. نگران چی بودین مگه؟",
    "فدای سرتون پیش میاد دیگه. ناراحت که نشدین؟",
  ],
  کلافه‌ام: [
    "چرا آخه؟ چیزی نگرانتون کرده؟ می‌تونم کمکی کنم؟",
    "می‌فهمم بعضی روزا آدم بی‌دلیل کلافه میشه... اتفاق خاصی افتاده امروز؟",
    "یه کم استراحت کنین یا محیط رو عوض کنین شاید بهتر شدین. موافقین؟",
  ],
  استرس_دارم: [
    "آرامش خودتون رو حفظ کنین همه‌چیز درست میشه انشالله. کاری از دست من برمیاد؟",
    "سپردم به خدا نگران نباشین تهش خوبه. نفس عمیق کشیدین؟",
    "استرس فقط کارو خراب‌تر می‌کنه. نفس عمیق بکشین... چیزی تا امتحان یا تحویل کار مونده؟",
  ],

  // --- LATE NIGHT, FAKE EXITS & CLOSING CHAT ---
  دیره: [
    "آره واقعاً زمان چقدر زود گذشت امشب! شما فردا باید زود بیدار شین؟",
    "راست می‌گین منم باید کم‌کم برم دیگه دیروقته. شما هم بیدار نمی‌مونین؟",
    "بله فردا هم کلی کار داریم باید خوابید. شما برنامه‌تون چیه واسه فردا؟",
  ],
  خوابم_میاد: [
    "خب برین بخوابین که فردا بتونین زود بیدار شین. خسته‌این خیلی؟",
    "منم چشمام داره سنگین میشه کم‌کم برم بخوابم... شما هم میاین بریم؟",
    "شب بخیر خوب استراحت کنین. فردا هم میاین گپ؟",
  ],
  شبتون_بخیر: [
    "شب شما هم بخیر خوب بخوابین فردا می‌بینمتون؟",
    "شبتون آروم با اجازه من رفع زحمت می‌کنم. کاری با من ندارین؟",
    "شب همگی بخیر خدانگهدارتون. فردا روز شلوغی دارین؟",
    "شبتون خوش فردا می‌بینمتون انشالله. خواب‌های خوب ببینین 😴",
  ],
  فعلا: [
    "فعلاً خدانگهدارتون باز هم سر بزنین به گپ باشه؟ 👋",
    "به سلامت وقتتون بخیر. کاری داشتین پی‌وی بفرستین",
    "فعلاً با اجازه مراقب خودتون باشین خدانگهدار",
  ],

  // --- NEWLY ADDED CATEGORIES (GP ALLIANCES, FAKE EXITS & SURFING) ---
  سیسی_ناناص: [
    "جووون تو که بهتری ناناصممم 😍",
    "قربونت برم سیسی همه به فدات 😘",
    "عقشمممم مرسی که هستی اصلاً",
  ],
  کل_کل: [
    "با من لج هرگز! کم میاری کم میارییی 😂",
    "سر تا پامو باید طلا بگیری با این تیکه‌هات",
    "وای خدا... پیرمرد/پیرزن جامعه چقد حرف میزنی من رفتم 🚶‍♀️",
  ],
  من_رفتم: [
    "من رفتم واقعاً... ریپ نزنید اصلاً... (ولی هنوز بک‌گراند چت رو نگاه می‌کنه 😂)",
    "بابای معسلامه من رفتم (دو دقیقه بعد دوباره ریپلای می‌کنه)",
  ],

  // --- NEW EXTRA EXTENSIONS FOR GP FLOW ---
  هول_بازی: [
    "داش مگه تا حالا دختر ندیدی انقدر هولی؟ 😂",
    "پیوی نرو داداش راه نداره... همین‌جا چت کن زشته",
    "وای خدا این باز چشماش دختر دید دوید پیوی 🤦‍♀️ ریپ نزن بابا حوصلتو ندارم",
  ],
  سین_زدن: [
    "آدم چت می‌کنه که جواب بگیره... سین نزن رفیق، یه تیکه‌ای بنداز لااقل",
    "چرا همه دارین فقط بالا-پایین می‌برین چت رو؟ مگه کانال اخباره؟ ریپ بزن چت کنیم",
    "واای چقدر روح داریم تو گپ! لفت بدین بابا اگه چت نمی‌کنین",
  ],
  خوش_آمدگویی: [
    "سلامم خیلی خوش اومدی به گپ مریضاا 😂 اصل بده آشنا شیم",
    "به‌به عضو جدید! خوش اومدی. چت کن، نخون فقط سیسی",
    "سلام خوش اومدی. شیرینی ورودت چیه حالا؟ 😉",
  ],
  موزیک_بفرست: [
    "یکی یه آهنگ قشنگ بفرسته مودمون عوض شه... مردیم از بی‌حوصلگی",
    "آهنگ جدید چی دارین؟ همشو گوش دادم تکراری شده واسم",
    "یه ویس/اهنگ بدین صفا کنیم. این گپ چرا انقد سوت و کوره آخه؟",
  ],
  پیام_پین_شده: [
    "این چیه پین کردی باز؟ قانون جدیده یا دارین کل‌کل می‌کنین؟ 😂",
    "پین رو نگاه... چقدر هم مهم! ول کنین بابا چت کنین",
    "باز مدیر گپ جوگیر شد یه چیزی پین کرد 🚶‍♀️",
  ],

  // --- ANTIDOTE FOR TG DRAMA & CHAT FLOWS ---
  ریپ_زدن: [
    "ریپ نزن رو من سیسی حوصلتو ندارم اصلاً",
    "چرا رو چت من ریپ میزنی؟ بیا وسط کل کلتو بکن 😂",
    "واای باز این ریپ زد... بگو چی میگی لفتش نده",
  ],
  لفت_دادن: [
    "هرکی لفت میده خزه... بمونین چت کنین بابا",
    "لفت نده بیبی چت کن... گپ بدون تو صفا نداره",
    "کی لفت داد باز؟ جو نده بمون همینجا",
  ],
  بلاک: [
    "بلاک کن بابا راحت شی... لیاقت چت نداره",
    "بلاک چیه؟ همینجا قهوهایش کن صفا کنیم 😂",
    "الان بلاکت میکنه میاي گریه میکنی تو گپ",
  ],
  شات: [
    "شات بگیر بفرست ببینیم کی چی گفته واای 😂",
    "شات نده بابا حسش نیست بخونیم کوتاه بگو",
    "الان از چتت شات میگیرن پخش میکنن حواست باشه",
  ],
  کراش: [
    "جووون رو کی کراش زدی کلک؟ زود بگوو 😍",
    "کراش چیه بابا همشون هولن ول کن",
    "رو من کراش نزنید که من ماله کسی نمیشم 😎",
  ],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getGroupIds(client: TelegramClient): Promise<string[]> {
  const dialogs = await client.getDialogs({});
  return dialogs
    .filter((d) => d.isGroup && d.entity && d.id !== undefined)
    .map((d) => d.id!.toString());
}

async function sendHellos(client: TelegramClient, groupIds: string[]) {
  const shuffled = [...groupIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }

  for (const id of shuffled) {
    try {
      await client.sendMessage(id, { message: "👩‍🦯👩‍🦯👩‍🦯" });
      console.log(`✅ "Salam" sent to group ${id}`);
      const delay = random.int(20, 120);
      console.log(`⏳ Waiting ${delay} seconds before next group...`);
      await sleep(delay * 1000);
    } catch (err) {
      console.log(`❌ Error sending to group ${id}:`, err);
    }
  }
  console.log("🏁 Finished sending all 'Salam' messages.");
}

async function processQueue(client: TelegramClient) {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;

    const answer = getConversationalReply(item.userId, item.replyText);
    try {
      await client.sendMessage(item.chatId, {
        message: answer,
        replyTo: item.messageId,
      });
      console.log(`📨 Replied to reply in group ${item.chatId}: "${answer}"`);

      const delaySec = random.int(1, 15);
      await sleep(delaySec * 1000);
    } catch (err) {
      console.error("❌ Error sending reply:", err);
    }
  }
  processing = false;
}

async function main() {
  console.log("Connecting...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  startSimpleServer();

  await client.start({
    phoneNumber: async () => await ask("Phone number: "),
    phoneCode: async () => await ask("Code: "),
    password: async () => await ask("2FA password (if any): "),
    onError: (err) => console.log(err),
  });

  console.log("✅ Connected");
  const me = await client.getMe();
  const myId = me.id.toString();
  console.log(`🤖 Bot: ${me.firstName} (${myId})`);

  const groupIds = await getGroupIds(client);
  console.log(`📋 Number of accessible groups: ${groupIds.length}`);

  if (groupIds.length === 0) {
    console.log("⚠️ No groups found!");
    return;
  }

  sendHellos(client, groupIds).catch((err) =>
    console.error("Error sending hellos:", err),
  );

  client.addEventHandler(async (event: NewMessageEvent) => {
    const msg = event.message;
    if (!msg || !msg.isGroup) return;
    if (msg.senderId?.toString() === myId) return;

    const chatId = msg.chatId?.toString();
    if (!chatId || !groupIds.includes(chatId)) return;

    if (msg.replyTo) {
      try {
        const repliedMsg = await msg.getReplyMessage();
        if (repliedMsg && repliedMsg.senderId?.toString() === myId) {
          const userId = msg.senderId?.toString() || "unknown";
          console.log(`🔁 Reply to bot from ${userId} in group ${chatId}`);

          queue.push({
            chatId,
            messageId: msg.id,
            replyText: msg.text || "",
            userId: userId,
          });

          processQueue(client);
        }
      } catch (err) {
        console.error("Error getting replied message:", err);
      }
    }
  }, new NewMessage({}));

  console.log(
    "🟢 Bot is ready. Waiting for replies to sent 'Salam' messages...",
  );
}

main().catch((err) => console.log("Error in execution:", err));
