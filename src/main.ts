import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "readline/promises";
import http from "http";
import { stdin, stdout } from "process";
import { TelegramPvPromoter } from "./pvPromoter.js";
import random from "random";
import dotenv from "dotenv";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import { getConversationalReply, setGeminiKey } from "./replies.js";
import { TelegramChatAnalyzer } from "./analyzer.js";

dotenv.config();

// ========== Keep-alive HTTP server for Render ==========
function startSimpleServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive!");
  });
  server.listen(port, "0.0.0.0");
}

// ========== Readline helper ==========
const rl = readline.createInterface({ input: stdin, output: stdout });
async function ask(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

// ========== Environment variables ==========
const apiId = Number(process.env.API_ID);
const apiHash = String(process.env.API_HASH);
const stringSession = new StringSession(process.env.STRINGSESSION || "");
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!apiId || !apiHash) {
  console.error("❌ API_ID or API_HASH missing in .env");
  process.exit(1);
}

if (!geminiApiKey) {
  console.warn(
    "⚠️ GEMINI_API_KEY not set. AI replies will fallback to rule-based.",
  );
} else {
  setGeminiKey(geminiApiKey);
  console.log("✅ Gemini AI configured.");
}

// ========== Queue for processing replies ==========
interface QueueItem {
  chatId: string;
  messageId: number;
  replyText: string;
  userId: string;
}
const queue: QueueItem[] = [];
let processing = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ========== Get all group IDs ==========
async function getGroupIds(client: TelegramClient): Promise<string[]> {
  const dialogs = await client.getDialogs({});
  return dialogs
    .filter((d) => d.isGroup && d.entity && d.id !== undefined)
    .map((d) => d.id!.toString());
}

// ========== Send hello messages to groups ==========
async function sendHellos(client: TelegramClient, groupIds: string[]) {
  const shuffled = [...groupIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  for (const id of shuffled) {
    try {
      if (!id.startsWith("-100")) continue;
      await client.sendMessage(id, { message: "👩‍🦯👩‍🦯👩‍🦯" });
      const delay = random.int(40, 140);
      await sleep(delay * 1000);
    } catch (err) {
      // ignore
    }
  }
}

// ========== Process queued messages ==========
async function processQueue(client: TelegramClient) {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;

    const answer = await getConversationalReply(
      item.userId,
      item.replyText,
      item.chatId,
    );
    try {
      const typingDelay = random.int(5, 10);
      await sleep(typingDelay * 1000);

      await client.sendMessage(item.chatId, {
        message: answer,
        replyTo: item.messageId,
      });
      console.log(`[Bot Reply] Sent -> ${answer.substring(0, 50)}...`);

      const delaySec = random.int(10, 45);
      await sleep(delaySec * 1000);
    } catch (err) {
      // ignore
    }
  }
  processing = false;
}

// ========== Main ==========
async function main() {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 10,
  });
  startSimpleServer();

  await client.start({
    phoneNumber: async () => await ask("Phone number: "),
    phoneCode: async () => await ask("Code: "),
    password: async () => await ask("2FA password (if any): "),
    onError: (err) => console.error(err),
  });

  console.log("✅ Connected to Telegram");
  const me = await client.getMe();
  const myId = me.id.toString();
  const groupIds = await getGroupIds(client);

  if (groupIds.length === 0) {
    console.log("⚠️ No groups found.");
    return;
  }

  // Start modules
  new TelegramChatAnalyzer(client, myId);
  const promoter = new TelegramPvPromoter(client, myId);
  promoter.startPvPromotion().catch(() => {});

  sendHellos(client, groupIds).catch(() => {});

  const cleanGroupIds = groupIds.map((id) => id.replace(/^-100/, ""));

  client.addEventHandler(async (event: NewMessageEvent) => {
    try {
      const msg = event.message;
      if (
        !msg ||
        !msg.isGroup ||
        !msg.text ||
        msg.senderId?.toString() === myId
      )
        return;

      const chatId = msg.chatId?.toString() || "";
      const cleanChatId = chatId.replace(/^-100/, "");
      if (!cleanGroupIds.includes(cleanChatId)) return;

      if (msg.replyTo && msg.replyTo.replyToMsgId) {
        try {
          const [repliedMsg] = await client.getMessages(chatId, {
            ids: msg.replyTo.replyToMsgId,
          });
          if (repliedMsg && repliedMsg.senderId?.toString() === myId) {
            queue.push({
              chatId,
              messageId: msg.id,
              replyText: msg.text || "",
              userId: msg.senderId?.toString() || "unknown",
            });
            processQueue(client);
          }
        } catch (err) {
          // ignore
        }
      }
    } catch (err) {
      // ignore
    }
  }, new NewMessage({}));
}

main().catch(console.error);
