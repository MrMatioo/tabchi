import { TelegramClient } from "telegram";
import * as fs from "fs/promises";
import * as path from "path";

export interface ChatPair {
  question: string;
  answer: string;
}

export class TelegramChatAnalyzer {
  private client: TelegramClient;
  private myId: string = "";
  private logFilePath: string;
  private isProcessing: boolean = false;
  private stopSignal: boolean = false;
  private messagesLimitPerGroup: number = 35;

  // 📥 Buffer to hold QA pairs temporarily in memory
  private qaBuffer: ChatPair[] = [];
  private readonly batchSize: number = 50;

  constructor(
    client: TelegramClient,
    myId: string,
    outputFilename: string = "collected_keywords.json",
  ) {
    this.client = client;
    this.myId = myId;
    this.logFilePath = path.resolve(process.cwd(), outputFilename);
    this.initFile();
    this.startPeriodicAnalysis();
  }

  private async initFile() {
    try {
      await fs.access(this.logFilePath);
    } catch {
      try {
        await fs.writeFile(
          this.logFilePath,
          JSON.stringify({}, null, 2),
          "utf-8",
        );
      } catch {}
    }
  }

  private async startPeriodicAnalysis() {
    await new Promise((resolve) => setTimeout(resolve, 60000));

    while (!this.stopSignal) {
      if (this.isProcessing) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      try {
        this.isProcessing = true;
        const dialogs = await this.client.getDialogs({});
        const groupIds = dialogs
          .filter(
            (d) =>
              d.isGroup &&
              d.id !== undefined &&
              d.id.toString().startsWith("-100"),
          )
          .map((d) => d.id!.toString());

        for (const chatId of groupIds) {
          if (this.stopSignal) break;
          try {
            const messages = await this.client.getMessages(chatId, {
              limit: this.messagesLimitPerGroup,
            });
            const messageMap = new Map<number, any>();
            for (const m of messages) {
              if (m && m.id) messageMap.set(m.id, m);
            }

            for (const msg of messages) {
              if (!msg || !msg.text || msg.senderId?.toString() === this.myId)
                continue;

              if (msg.replyTo && msg.replyTo.replyToMsgId) {
                const parentMsg = messageMap.get(msg.replyTo.replyToMsgId);
                if (
                  parentMsg &&
                  parentMsg.text &&
                  parentMsg.senderId?.toString() !== this.myId
                ) {
                  const cleanQ = this.cleanText(parentMsg.text);
                  const cleanA = this.cleanText(msg.text);

                  if (
                    cleanQ &&
                    cleanA &&
                    cleanQ.length <= 50 &&
                    cleanA.length <= 50 &&
                    cleanQ !== cleanA
                  ) {
                    // Push to memory buffer instead of immediate disk write
                    this.qaBuffer.push({ question: cleanQ, answer: cleanA });

                    // When buffer reaches the threshold, flush all pairs to disk
                    if (this.qaBuffer.length >= this.batchSize) {
                      await this.flushBufferToDisk();
                    }
                  }
                }
              }
            }
            const groupSleepSec =
              Math.floor(Math.random() * (20 - 10 + 1)) + 10;
            await new Promise((resolve) =>
              setTimeout(resolve, groupSleepSec * 1000),
            );
          } catch (groupErr) {}
        }
      } catch (loopErr) {
      } finally {
        this.isProcessing = false;
        const randomIntervalMin = Math.floor(Math.random() * (7 - 4 + 1)) + 4;
        await new Promise((resolve) =>
          setTimeout(resolve, randomIntervalMin * 60 * 1000),
        );
      }
    }
  }

  private cleanText(text: string): string {
    if (!text) return "";
    return text
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}\p{Symbol}]/gu, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?+=@|\\\[\]{}""'']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Flushes the full buffer to disk at once and logs the event
   */
  private async flushBufferToDisk() {
    try {
      let fileData = "{}";
      try {
        fileData = await fs.readFile(this.logFilePath, "utf-8");
      } catch {
        fileData = "{}";
      }

      const existingData: Record<string, string> = JSON.parse(fileData || "{}");
      const currentBatchSize = this.qaBuffer.length;

      // Merge all items from buffer into database object
      for (const pair of this.qaBuffer) {
        existingData[pair.question] = pair.answer;
      }

      await fs.writeFile(
        this.logFilePath,
        JSON.stringify(existingData, null, 2),
        "utf-8",
      );

      // Clean and output a single concise log for the batch operation
      console.log(`[Analyzer] QA written: ${currentBatchSize}`);
      this.qaBuffer = [];
    } catch (diskErr) {
      // Gracefully prevent I/O crashes
    }
  }

  public shutdown() {
    this.stopSignal = true;
  }
}
