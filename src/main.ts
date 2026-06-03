import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "readline/promises";
import express, { Express, Request, Response } from "express";
import { stdin, stdout } from "process";
import random from "random";
import dotenv from "dotenv";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";

dotenv.config();

function startSimpleServer() {
  const app: Express = express();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.get("/", (req: Request, res: Response) => {
    res.send("Bot is alive!");
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Simple HTTP server is running on port ${port}`);
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

// ==================== شخصیت ربات: دختر ۲۲ ساله ====================
type ConversationState = {
  stage: string; // 'idle', 'asked_how_are_you', 'asked_whats_up', 'asked_name', etc.
};
const userConversationState = new Map<string, ConversationState>();

// توابع کمکی برای تشخیص نوع پاسخ
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

// تابع اصلی پاسخ زنجیره‌ای با شخصیت دختر ۲۲ ساله
function getConversationalReply(userId: string, text: string): string {
  const lower = text.toLowerCase();
  let state = userConversationState.get(userId) || { stage: "idle" };

  // اولویت: سوالات شخصی
  if (lower.includes("چند سالته") || lower.includes("سن")) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "۲۲ سالمه عزیزم! تو چند سالته؟";
  }
  if (
    lower.includes("تحصیلات") ||
    lower.includes("درس") ||
    lower.includes("دانشگاه")
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
    return "اهل تهرانم، ولی عاشق شمال و دریام. تو اهل کجایی؟";
  }
  if (
    lower.includes("نام") ||
    lower.includes("اسم") ||
    lower.includes("چی بگم")
  ) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "اسم من ساراست! تو چی؟";
  }
  if (
    lower.includes("مجرد") ||
    lower.includes("متاهل") ||
    lower.includes("دوست پسر")
  ) {
    userConversationState.set(userId, { stage: "asked_personal" });
    return "مجرد و آزاد 😂 فعلاً عاشق درس و زندگی‌ام. تو چی؟";
  }

  // سوالات معمولی مکالمه
  if (isHowAreYou(lower)) {
    userConversationState.set(userId, { stage: "asked_whats_up" });
    return "خوبم ممنون، چه خبر؟ خودت خوبی؟";
  }
  if (isWhatsUp(lower)) {
    userConversationState.set(userId, { stage: "idle" });
    return "همون چرت و پرتای همیشگی! تو بگو چه خبر؟";
  }
  if (isGreeting(lower)) {
    userConversationState.set(userId, { stage: "asked_how_are_you" });
    return "سلام عزیزم! خوبی؟";
  }

  // وضعیت‌های مکالمه قبلی
  if (state.stage === "asked_how_are_you") {
    if (isPositiveAnswer(lower)) {
      userConversationState.set(userId, { stage: "asked_whats_up" });
      return "خوشحالم! چه خبر؟";
    } else if (isNegativeAnswer(lower)) {
      userConversationState.set(userId, { stage: "idle" });
      return "ناراحت نباش، انشالله بهتر میشه. بگذریم...";
    } else {
      userConversationState.set(userId, { stage: "idle" });
      return "مفهوم نشد، خوبی یا نه؟";
    }
  }
  if (state.stage === "asked_whats_up") {
    if (lower.includes("خبری نیست") || lower.includes("هیچی")) {
      userConversationState.set(userId, { stage: "idle" });
      return "آها، باشه پس. هر وقت خبر شد بگو!";
    } else if (isPositiveAnswer(lower)) {
      userConversationState.set(userId, { stage: "idle" });
      return "خوبه، خوشحالم برات!";
    } else {
      userConversationState.set(userId, { stage: "idle" });
      return "جالبه! راستی تو چیکار می‌کنی؟";
    }
  }

  // اگر در وضعیت شخصی بودیم، پاسخ ساده
  if (state.stage === "asked_personal") {
    userConversationState.set(userId, { stage: "idle" });
    return "آها، مرسی که گفتی!";
  }

  // در غیر این صورت، از دیتابیس پاسخ‌ها استفاده کن (با روحیه دخترانه)
  for (const [key, arr] of Object.entries(replies)) {
    if (lower.includes(key) && arr.length) {
      return arr[Math.floor(Math.random() * arr.length)]!;
    }
  }

  // پاسخ پیش‌فرض
  userConversationState.set(userId, { stage: "idle" });
  const defaults = [
    "اع",
    "متوجه نشدم",
    "هوم... جالبه!",
    "آها!",
    "چی گفتی؟",
    "خوب",
    "آها راستی",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)]!;
}

// ==================== دیتابیس پاسخ‌های دخترانه ====================
const replies: Record<string, string[]> = {
  سلام: ["سلام عزیزم!", "سلااام", "درود", "سلام داداش", "سلام علیک"],
  خوبی: [
    "قربونت، خوبم، تو خوبی؟",
    "مرسی خوبم! تو چطوری؟",
    "خوبم شکر, تو چه طور؟",
    "خداروشکر خوبم",
    "عالی‌ام، تو چه خبر؟",
  ],
  چطوری: [
    "خوبم ممنون، تو چطوری؟",
    "بد نیستم، ممنون که پرسیدی",
    "همه چی عالیه، تو بگو",
    "خوبم تو بگو",
  ],
  چخبر: [
    "سلامتی، این ور خبری نیست",
    "خبری نیست، تو بگو",
    "والا هیچی",
    "همه چی آرومه",
    "خبر خاصی نیست",
  ],
  خداحافظ: ["خدانگهدار", "فعلاً بابا", "بای بای", "خدافظ", "به امید دیدار"],
  ممنون: [
    "خواهش می‌کنم",
    "قابلی نداشت",
    "خواهش می‌کنم عزیزم",
    "نوکرم",
    "خدا خیرت بده",
  ],
  مرسی: [
    "مرسی تو لطف داری",
    "خواهش می‌کنم",
    "❤️ عشقی",
    "لطف داری",
    "خواهش می‌کنم",
  ],
  دوستت_دارم: ["منم دوست دارم", "خیلی نازی", "❤️ بی‌نهایت", "قربونت", "به به"],
  عاشقتم: ["منم عاشقتم", "عشق منی", "❤️❤️❤️", "عاشقتم بیشتر", "فدات شم"],
  عالی: ["ممنون", "👍 عالی", "قربونت", "دمت گرم", "خوشحالم"],
  جالب: ["عجب!", "به به", "وااای", "حقا!", "چه جالب"],
  آفرین: ["آفرین", "دستت درد نکنه", "به به", "باز هم ثابت کردی", "دمت گرم"],
  باحال: ["تو باحالی", "ممنون", "😎 تو خودتی", "چه باحال", "باحالی"],
  اشتباه: ["دقیقا", "نظرم فرق داره", "شاید", "نه بابا", "اصلاً اینطور نیست"],
  نه: ["نه عزیزم", "نه داداش", "نه مگه میشه", "نه", "نه والا"],
  بله: ["بله", "بله عزیزم", "بله جان", "بله درسته", "آره"],
  آره: ["آره", "بله", "آره جانم", "آره بابا", "آره موافقم"],
  هوف: ["هوف چرا؟", "هووف", "😂 هووف", "هوف از دست خودم", "هوف چه روزگاری"],
  عه: ["عه سلام", "عه تو اینجا", "عه یادم رفت", "عه واقعاً", "عه چه جالب"],
  هعی: ["هعی", "هعی دلم گرفت", "هعی خدا بزرگه", "هعی انشالله", "هعی بگذریم"],
  وای: ["وااای", "وای خدا", "وای منو کشتی", "وای چه خبر", "وای باورم نمیشه"],
  استیکر: ["😂😂", "❤️", "🤣", "👍", "🥰"],
  عکس: ["چه قشنگ", "به به", "عالیه", "قربون دستت", "وااای"],
  فیلم: ["چه فیلم خوبیه", "منم عاشقشم", "دستت درد نکنه", "فیلم خوبیه", "ممنون"],
  موزیک: [
    "چه آهنگ قشنگی",
    "دستت درد نکنه",
    "منم دوست دارم",
    "وااای چه حسی داره",
    "ممنون",
  ],
  باشه: ["باشه", "باشه انجام میدم", "باشه موافقم", "باشه چشم", "باشه قربونت"],
  اوکی: ["اوکیه", "اوکی", "اوکی موافقم", "اوکی عالی", "اوکیه نگران نباش"],
  حله: [
    "حله",
    "حله راحت باش",
    "حله خودم درستش می‌کنم",
    "حله نگران نباش",
    "حله قربونت",
  ],
  چشم: ["چشم", "چشم قربان", "چشم موافقم", "چشم حتماً", "چشم عزیزم"],
  چرا: [
    "چون اینطور بهتره",
    "چون دوست دارم",
    "به خاطر شرایط",
    "والا نمی‌دونم",
    "چون حق با توئه",
  ],
  کجا: [
    "همین جا کنار تو",
    "تهران تو کجایی",
    "همون جایی که باید باشم",
    "نمی‌دونم تو بگو",
    "جایی که دلم میخواد",
  ],
  کی: [
    "هر وقت تو بخوای",
    "به زودی انشالله",
    "هنوز معلوم نیست",
    "صبر کن",
    "فردا شاید",
  ],
  چطور: [
    "با آرامش",
    "قدم به قدم",
    "با کمک دوستان",
    "هنوز یاد نگرفتم",
    "تو خودت بلدی",
  ],
  انشالله: [
    "انشالله",
    "انشالله بهترینا",
    "انشالله شاد باشی",
    "انشالله به زودی",
    "انشالله خدا خیرت بده",
  ],
  خدانکنه: [
    "خدا نکنه",
    "خدا نکنه از این حرفا",
    "پناه بر خدا",
    "خدا نکنه بد شد",
  ],
  خداخیرت: [
    "خدا خیرت بده",
    "خدا خیرت بده دمت گرم",
    "خدا خیرت بده عزیزم",
    "ممنون",
  ],
  دلم_گرفت: [
    "هعی دلم گرفت",
    "می‌دونم روزای سختیه",
    "خدا رو شکر که تو هستی",
    "انشالله بهتر میشه",
    "دلگیر نباش",
  ],
  خوشحالم: [
    "خوشحالم",
    "منم خوشحالم",
    "واقعاً خوشحالم برات",
    "خوشحالم که دیدمت",
    "خوشحالم که اینجایی",
  ],
  ناراحتم: [
    "ناراحت نباش",
    "می‌فهمم",
    "ناراحت نباش من کنارتم",
    "انشالله خوب میشه",
    "بگذریم",
  ],
  بیا: [
    "بیا با هم خوش بگذرونیم",
    "بیا این دور هم جمع شیم",
    "بیا بریم یه جای دیگه",
    "بیا ببینمت",
    "بیا پی بگم بهت",
  ],
  بفرما: [
    "بفرما",
    "بفرما عزیزم",
    "بفرما جانم",
    "بفرما چیز خاصی نیست",
    "بفرما به روی چشم",
  ],
  بده: [
    "بده ببینم",
    "بده دست خودم",
    "بده ببینم چه خبره",
    "بده برات درستش کنم",
    "بده قربونت",
  ],
  ببین: [
    "ببین اینطور بهتر نیست",
    "ببین حرف حق رو بزن",
    "ببین هر چی باشه تو رئیسی",
    "ببین بیا حلش کنیم",
    "ببین ناراحت نشو",
  ],
  آها: [
    "آها فهمیدم",
    "آها راست میگی",
    "آها پس اینطور",
    "آها حالا فهمیدم",
    "آها چه جالب",
  ],
  واقعاً: [
    "واقعاً؟",
    "واقعاً همینطوره",
    "واقعاً ممنونم",
    "واقعاً عالی بود",
    "واقعاً خوشحالم کردی",
  ],
  خب: ["خب پس اینطور", "خب چی بگم", "خب موافقم", "خب هر چی تو بگی", "خب باشه"],
  بذار: [
    "بذار ببینم",
    "بذار فکر کنم",
    "بذار یه فکری بکنم",
    "بذار باهات باشم",
    "بذار بگذره",
  ],
  "بیا پیوی": [
    "جووووون",
    "بیا پیوی چی بگم؟ همینجا بگو",
    "اوکی بیا پیوی خودت",
    "باشه ولی نمیام",
    "چشم",
  ],
  "ادی اد کن": [
    "جووووون",
    "ادی اد کن یعنی چی؟",
    "باشه اد کردم",
    "جووووون دیگه نخواه",
    "چشم اد شد",
  ],
  "اد کن": ["جووووون", "اد کردم", "باشه اد شد", "چشم", "جووووون بیا بریم بالا"],
  جووووون: [
    "جووووون خودتی",
    "😂 ممنون",
    "جووووون والا",
    "به به ممنون",
    "جووووون تو باحالی",
  ],
};

// ==================== بقیه توابع ربات (ارسال سلام، صف، هندلر) ====================
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

  // ارسال سلام در پس‌زمینه
  sendHellos(client, groupIds).catch((err) =>
    console.error("Error sending hellos:", err),
  );

  // صف پاسخ‌ها با تأخیر ۰ تا ۶۰ ثانیه
  const queue: {
    chatId: string;
    messageId: number;
    replyText: string;
    userId: string;
  }[] = [];
  let processing = false;

  async function processQueue() {
    if (processing) return;
    processing = true;
    while (queue.length > 0) {
      const item = queue.shift()!;
      const answer = getConversationalReply(item.userId, item.replyText);
      try {
        await client.sendMessage(item.chatId, {
          message: answer,
          replyTo: item.messageId,
        });
        console.log(`📨 Replied to reply in group ${item.chatId}: "${answer}"`);
        const delaySec = random.int(0, 60); // 0 to 60 seconds
        await sleep(delaySec * 1000);
      } catch (err) {
        console.error("❌ Error sending reply:", err);
      }
    }
    processing = false;
  }

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
          processQueue();
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
