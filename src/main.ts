import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "readline/promises";
import http from "http";
import { stdin, stdout } from "process";
import { TelegramPvPromoter } from "./pvPromoter.js";
import random from "random";
import dotenv from "dotenv";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import { getConversationalReply } from "./replies.js";

dotenv.config();

function startSimpleServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive!");
  });
  server.listen(port, "0.0.0.0");
}

const rl = readline.createInterface({ input: stdin, output: stdout });
async function ask(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

const apiId = Number(process.env.API_ID);
const apiHash = String(process.env.API_HASH);
const stringSession = new StringSession(process.env.STRINGSESSION || "");

if (!apiId || !apiHash) {
  console.error("❌ API_ID or API_HASH missing in .env");
  process.exit(1);
}

interface QueueItem {
  chatId: string;
  messageId: number;
  replyText: string;
  userId: string;
}
const queue: QueueItem[] = [];
let processing = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getGroupIds(client: TelegramClient): Promise<string[]> {
  try {
    const dialogs = await client.getDialogs({});
    return dialogs
      .filter((d) => d.isGroup && d.entity && d.id !== undefined)
      .map((d) => d.id!.toString());
  } catch (err) {
    return [];
  }
}

async function sendHellos(client: TelegramClient, groupIds: string[]) {
  const shuffled = [...groupIds].filter((id) => id.startsWith("-100"));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  for (const id of shuffled) {
    try {
      await client.sendMessage(id, { message: "👩‍🦯👩‍🦯👩‍🦯" });
      await sleep(random.int(180, 360) * 1000);
    } catch (err) {
      console.error(`[Hello Error] Failed for group ${id}`);
    }
  }
}

async function processQueue(client: TelegramClient) {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;

    const answer = getConversationalReply(item.userId, item.replyText);
    try {
      await sleep(random.int(12, 25) * 1000);

      await client.sendMessage(item.chatId, {
        message: answer,
        replyTo: item.messageId,
      });

      console.log(`[Bot Reply] Sent -> ${answer.substring(0, 50)}...`);
      await sleep(random.int(45, 90) * 1000);
    } catch (err: any) {
      if (err.message?.includes("FLOOD")) {
        console.warn(
          "[Queue Anti-Flood] Heavy FloodWait triggered. Sleeping for 10 minutes.",
        );
        await sleep(10 * 60 * 1000);
      }
    }
  }
  processing = false;
}

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

  const promoter = new TelegramPvPromoter(client, myId);
  promoter.startPvPromotion().catch(() => {});
  sendHellos(client, groupIds).catch(() => {});

  const cleanGroupIds = groupIds.map((id) => id.replace(/^-100/, ""));

  client.addEventHandler(async (event: NewMessageEvent) => {
    try {
      const msg = event.message;
      if (!msg || !msg.text || msg.senderId?.toString() === myId) return;

      const chatId = msg.chatId?.toString() || "";
      const senderId = msg.senderId?.toString() || "unknown";

      if (msg.isPrivate) {
        const cleanTxt = msg.text.trim();
        const triggerRegex = /عضو شدم|شدم|اومدم|سلام|درود|سلم|خوبی/i;

        if (triggerRegex.test(cleanTxt)) {
          queue.push({
            chatId: senderId,
            messageId: msg.id,
            replyText: msg.text,
            userId: senderId,
          });
          processQueue(client);
        }
        return;
      }

      if (msg.isGroup) {
        const cleanChatId = chatId.replace(/^-100/, "");
        if (!cleanGroupIds.includes(cleanChatId)) return;

        if (msg.replyTo) {
          const repliedMsg = await msg.getReplyMessage();

          if (repliedMsg && repliedMsg.senderId?.toString() === myId) {
            queue.push({
              chatId,
              messageId: msg.id,
              replyText: msg.text,
              userId: senderId,
            });
            processQueue(client);
          }
        }
      }
    } catch (err) {}
  }, new NewMessage({}));

  process.on("SIGINT", () => {
    console.log("Gracefully shutting down...");
    process.exit(0);
  });
}

main().catch(console.error);
