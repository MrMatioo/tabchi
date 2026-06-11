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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const log = {
  info: (msg: string) =>
    console.log(
      `\x1b[36m[INFO]\x1b[0m ${new Date().toLocaleTimeString()} - ${msg}`,
    ),
  success: (msg: string) =>
    console.log(
      `\x1b[32m[SUCCESS]\x1b[0m ${new Date().toLocaleTimeString()} - ${msg}`,
    ),
  warn: (msg: string) =>
    console.log(
      `\x1b[33m[WARN]\x1b[0m ${new Date().toLocaleTimeString()} - ${msg}`,
    ),
  error: (msg: string) =>
    console.log(
      `\x1b[31m[ERROR]\x1b[0m ${new Date().toLocaleTimeString()} - ${msg}`,
    ),
  flood: (msg: string) =>
    console.log(
      `\x1b[35m[FLOOD]\x1b[0m ${new Date().toLocaleTimeString()} - ${msg}`,
    ),
};

function startSimpleServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive!");
  });
  server.listen(port, "0.0.0.0");
  log.info(`HTTP server started on port ${port}`);
}

const rl = readline.createInterface({ input: stdin, output: stdout });
async function ask(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

class FloodAwareExecutor {
  private consecutiveFloods = 0;

  async execute<T>(fn: () => Promise<T>, context: string): Promise<T | null> {
    try {
      const result = await fn();
      this.consecutiveFloods = Math.max(0, this.consecutiveFloods - 1);
      return result;
    } catch (err: any) {
      const msg = err.message || "";
      const floodMatch =
        msg.match(/FLOOD_WAIT_(\d+)/i) || msg.match(/A wait of (\d+) seconds/i);
      if (floodMatch) {
        let wait = parseInt(floodMatch[1], 10);
        this.consecutiveFloods++;
        const backoff = Math.min(
          30 * Math.pow(2, this.consecutiveFloods - 1),
          3600,
        );
        const finalWait = Math.max(wait, backoff);
        log.flood(
          `${context} -> wait ${finalWait}s (backoff level ${this.consecutiveFloods})`,
        );
        await sleep(finalWait * 1000);
        if (this.consecutiveFloods < 3) return this.execute(fn, context);
        else return null;
      }
      throw err;
    }
  }
}

const floodExecutor = new FloodAwareExecutor();

interface QueueJob {
  type: "reply" | "promo" | "groupMessage";
  chatId: string;
  messageId?: number;
  replyText?: string;
  userId?: string;
  message?: string;
}

let jobQueue: QueueJob[] = [];
let isProcessing = false;

async function processQueue(
  client: TelegramClient,
  promoter: TelegramPvPromoter,
) {
  if (isProcessing) return;
  isProcessing = true;
  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) continue;
    try {
      if (
        job.type === "reply" &&
        job.chatId &&
        job.messageId &&
        job.replyText
      ) {
        await floodExecutor.execute(async () => {
          await client.markAsRead(job.chatId);
          const typingDuration = Math.min(
            Math.max(job.replyText!.length * 70, 1800),
            7000,
          );
          await simulateHumanTyping(client, job.chatId, typingDuration);
          const sendParams: any = { message: job.replyText! };
          if (job.messageId) sendParams.replyTo = job.messageId;
          await client.sendMessage(job.chatId, sendParams);
          log.success(
            `Reply sent to ${job.chatId.slice(-6)} (${job.replyText!.slice(0, 30)}...)`,
          );
        }, `reply_${job.chatId}`);
      } else if (job.type === "promo" && job.chatId && job.userId) {
        if (promoter.shouldSendPromo(job.userId)) {
          await floodExecutor.execute(async () => {
            await client.markAsRead(job.chatId);
            await simulateHumanTyping(client, job.chatId, 5000);
            const promoMsg = promoter.getPromoMessage(
              job.userId!,
              job.replyText || "",
            );
            await client.sendMessage(job.chatId, {
              message: promoMsg,
              buttons: promoter.getPromoKeyboard() as any,
            });
            await promoter.saveUserAsNotified(job.userId!);
            log.success(`Promo sent to ${job.chatId.slice(-6)}`);
          }, `promo_${job.chatId}`);
        }
      } else if (job.type === "groupMessage" && job.chatId && job.message) {
        await floodExecutor.execute(async () => {
          await sleep(random.int(8000, 20000));
          await client.sendMessage(job.chatId, { message: job.message! });
          log.info(
            `Random group message sent to ${job.chatId.slice(-6)}: "${job.message}"`,
          );
        }, `groupMsg_${job.chatId}`);
      }
      await sleep(random.int(8000, 18000));
    } catch (err) {
      log.error(`Job error: ${err}`);
    }
  }
  isProcessing = false;
}

async function simulateHumanTyping(
  client: TelegramClient,
  peer: string,
  durationMs: number,
) {
  const actions: Api.TypeSendMessageAction[] = [
    new Api.SendMessageTypingAction(),
    new Api.SendMessageRecordAudioAction(),
    new Api.SendMessageUploadDocumentAction({ progress: 100 }),
  ];
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    if (!action) continue;
    try {
      await client.invoke(new Api.messages.SetTyping({ peer, action }));
    } catch {}
    await sleep(random.int(3500, 6000));
  }
}

async function startPeriodicGroupMessages(
  client: TelegramClient,
  groupIds: string[],
) {
  const randomMessages = [
    "👩‍🦯👩‍🦯👩‍🦯",
    "😂😂😂",
    "🤔 نظرتون چیه؟",
    "سلام چه خبرا؟",
    "هیچی خاص?",
    "😎",
    "🔥",
  ];
  setInterval(
    async () => {
      if (groupIds.length === 0) return;
      const randomGroup = groupIds[Math.floor(Math.random() * groupIds.length)];
      if (!randomGroup) return;
      const randomMsg =
        randomMessages[Math.floor(Math.random() * randomMessages.length)];
      if (randomMsg) {
        jobQueue.push({
          type: "groupMessage",
          chatId: randomGroup,
          message: randomMsg,
        });
        processQueue(client, null as any);
      }
    },
    random.int(2.5 * 60 * 60 * 1000, 6 * 60 * 60 * 1000),
  );
  log.info("Periodic group messages scheduler started (2.5-6h interval)");
}

async function main() {
  const apiId = Number(process.env.API_ID);
  const apiHash = String(process.env.API_HASH);
  if (!apiId || !apiHash) {
    log.error("API_ID or API_HASH missing in .env");
    process.exit(1);
  }

  const client = new TelegramClient(
    new StringSession(process.env.STRINGSESSION || ""),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
    },
  );
  startSimpleServer();

  log.info("Starting Telegram client...");
  await client.start({
    phoneNumber: async () => await ask("Phone number: "),
    phoneCode: async () => await ask("Code: "),
    password: async () => await ask("2FA password (if any): "),
    onError: (err) => log.error(`Auth error: ${err}`),
  });

  log.success("Connected to Telegram");
  const me = await client.getMe();
  const myId = me.id.toString();
  log.info(`Logged in as ${me.firstName} (${myId})`);

  const dialogs = await client.getDialogs({});
  const groupIds = dialogs
    .filter((d) => d.isGroup && d.entity && d.id)
    .map((d) => d.id!.toString());
  log.info(`Found ${groupIds.length} groups`);

  const promoter = new TelegramPvPromoter(client, myId);
  await promoter.init();
  log.info("Promoter initialized");

  startPeriodicGroupMessages(client, groupIds);

  client.addEventHandler(async (event: NewMessageEvent) => {
    const msg = event.message;
    if (!msg || !msg.text) return;
    const chatIdObj = msg.chatId;
    const senderIdObj = msg.senderId;
    if (!chatIdObj || !senderIdObj) return;
    const chatId = chatIdObj.toString();
    const senderId = senderIdObj.toString();
    if (senderId === myId) return;

    const text = msg.text.trim();
    const isPrivate = !chatId.startsWith("-100") && !chatId.startsWith("-");
    const isGroup = chatId.startsWith("-100");

    log.info(
      `Message from ${senderId.slice(-6)} (${isPrivate ? "PV" : "Group"}): "${text.slice(0, 40)}"`,
    );

    if (isPrivate) {
      const userMsgCount = promoter.incrementMessageCount(senderId);
      const { reply, action } = getConversationalReply(
        senderId,
        text,
        userMsgCount,
        promoter.hasNotified(senderId),
      );
      if (reply) {
        jobQueue.push({
          type: "reply",
          chatId: senderId,
          messageId: msg.id,
          replyText: reply,
          userId: senderId,
        });
        log.info(
          `Queued reply for ${senderId.slice(-6)} (msgCount=${userMsgCount})`,
        );
      }
      if (
        !promoter.hasNotified(senderId) &&
        promoter.shouldSendPromo(senderId)
      ) {
        jobQueue.push({
          type: "promo",
          chatId: senderId,
          userId: senderId,
          replyText: text,
        });
        log.info(`Queued promo for ${senderId.slice(-6)}`);
      }
      processQueue(client, promoter);
      return;
    }

    if (isGroup && msg.replyTo) {
      const repliedMsg = await msg.getReplyMessage();
      if (repliedMsg && repliedMsg.senderId?.toString() === myId) {
        const { reply } = getConversationalReply(senderId, text, 0, false);
        if (reply) {
          jobQueue.push({
            type: "reply",
            chatId: chatId,
            messageId: msg.id,
            replyText: reply,
            userId: senderId,
          });
          log.info(
            `Queued group reply for ${senderId.slice(-6)} in ${chatId.slice(-6)}`,
          );
          processQueue(client, promoter);
        }
      }
    }
  }, new NewMessage({}));

  process.on("SIGINT", () => {
    log.warn("Shutting down gracefully...");
    process.exit(0);
  });
}

main().catch((err) => log.error(`Fatal: ${err}`));
