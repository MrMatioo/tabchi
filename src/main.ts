import { TelegramClient, Api } from "telegram";
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
  isPvPromo?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isSleepingTime(): boolean {
  const tehranTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Tehran",
  });
  const currentHour = new Date(tehranTime).getHours();
  return currentHour >= 2 && currentHour < 8;
}

async function simulateHumanTyping(
  client: TelegramClient,
  peer: string,
  durationMs: number,
) {
  try {
    const startTime = Date.now();
    while (Date.now() - startTime < durationMs) {
      await client.invoke(
        new Api.messages.SetTyping({
          peer: peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
      await sleep(4000);
    }
  } catch (err) {}
}

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
      if (isSleepingTime()) {
        await sleep(60000);
        continue;
      }

      await sleep(random.int(240, 540) * 1000);
      await simulateHumanTyping(client, id, random.int(3000, 7000));
      await client.sendMessage(id, { message: "👩‍🦯👩‍🦯👩‍🦯" });
    } catch (err) {
      console.error(`[Hello Error] Failed for group ${id}`);
    }
  }
}

async function handleSingleMessage(
  client: TelegramClient,
  promoter: TelegramPvPromoter,
  item: QueueItem,
) {
  if (isSleepingTime()) return;

  try {
    if (item.isPvPromo) {
      await sleep(random.int(50, 180) * 1000);
      await client.markAsRead(item.chatId);
      await simulateHumanTyping(client, item.chatId, random.int(4000, 9000));
      await client.sendMessage(item.chatId, {
        message: promoter.getPromoMessage(),
      });
      await promoter.saveUserAsNotified(item.chatId);
      console.log(`[Promoter] Promo delivered to PV -> [${item.chatId}]`);
      return;
    }

    const answer = getConversationalReply(item.userId, item.replyText);
    if (!answer) return;

    // --- CHANGED: Dynamic delay set between 10 seconds to 2 minutes (10 to 120 seconds) ---
    await sleep(random.int(10, 120) * 1000);

    await client.markAsRead(item.chatId);
    const typingDuration = Math.min(Math.max(answer.length * 100, 2000), 7000);
    await simulateHumanTyping(client, item.chatId, typingDuration);

    await client.sendMessage(item.chatId, {
      message: answer,
      replyTo: item.messageId,
    });

    console.log(`[Bot Reply] Sent -> ${answer.substring(0, 50)}...`);
  } catch (err: any) {
    if (err.message?.includes("FLOOD")) {
      console.warn("[Anti-Flood] FloodWait triggered. Heavy load detected.");
    }
  }
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
  await promoter.init();
  sendHellos(client, groupIds).catch(() => {});

  const cleanGroupIds = groupIds.map((id) => id.replace(/^-100/, ""));

  client.addEventHandler(async (event: NewMessageEvent) => {
    try {
      if (isSleepingTime()) return;

      const msg = event.message;
      if (!msg || !msg.text || msg.senderId?.toString() === myId) return;

      const chatId = msg.chatId?.toString() || "";
      const senderId = msg.senderId?.toString() || "unknown";

      if (msg.isPrivate) {
        const cleanTxt = msg.text.trim();

        if (!promoter.hasNotified(senderId)) {
          const answer = getConversationalReply(senderId, cleanTxt);

          if (answer) {
            handleSingleMessage(client, promoter, {
              chatId: senderId,
              messageId: msg.id,
              replyText: cleanTxt,
              userId: senderId,
            });
          }

          handleSingleMessage(client, promoter, {
            chatId: senderId,
            messageId: msg.id,
            replyText: cleanTxt,
            userId: senderId,
            isPvPromo: true,
          });
          return;
        }

        const answer = getConversationalReply(senderId, cleanTxt);
        if (answer) {
          handleSingleMessage(client, promoter, {
            chatId: senderId,
            messageId: msg.id,
            replyText: cleanTxt,
            userId: senderId,
          });
        }
        return;
      }

      if (msg.isGroup) {
        const cleanChatId = chatId.replace(/^-100/, "");
        if (!cleanGroupIds.includes(cleanChatId)) return;

        if (msg.replyTo) {
          const repliedMsg = await msg.getReplyMessage();
          if (repliedMsg && repliedMsg.senderId?.toString() === myId) {
            const answer = getConversationalReply(senderId, msg.text);
            if (answer) {
              handleSingleMessage(client, promoter, {
                chatId,
                messageId: msg.id,
                replyText: msg.text,
                userId: senderId,
              });
            }
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
