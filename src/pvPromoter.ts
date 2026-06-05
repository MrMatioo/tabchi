import { TelegramClient } from "telegram";
import * as fs from "fs/promises";
import * as path from "path";
import random from "random";

export class TelegramPvPromoter {
  private client: TelegramClient;
  private myId: string = "";
  private storageFilePath: string;
  private isProcessing: boolean = false;

  private readonly promoMessage: string =
    "سلام اگه می‌خوای با هم بیشتر حرف بزنیم و گپ بزنیم، اول عضو کانالم شو بعد بیا پیوی منتظرتم:\n\n" +
    "👉 https://t.me/+4xCwLqQ6PBoyYWVk ";

  constructor(
    client: TelegramClient,
    myId: string,
    filename: string = "notified_users.json",
  ) {
    this.client = client;
    this.myId = myId;
    this.storageFilePath = path.resolve(process.cwd(), filename);
    this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.access(this.storageFilePath);
    } catch {
      try {
        await fs.writeFile(
          this.storageFilePath,
          JSON.stringify([], null, 2),
          "utf-8",
        );
      } catch {}
    }
  }

  private async getNotifiedUsers(): Promise<string[]> {
    try {
      const data = await fs.readFile(this.storageFilePath, "utf-8");
      return JSON.parse(data || "[]");
    } catch {
      return [];
    }
  }

  private async saveUserAsNotified(userId: string) {
    try {
      const notified = await this.getNotifiedUsers();
      if (!notified.includes(userId)) {
        notified.push(userId);
        await fs.writeFile(
          this.storageFilePath,
          JSON.stringify(notified, null, 2),
          "utf-8",
        );
      }
    } catch (err) {
      // silent
    }
  }

  private async getPendingUsers(): Promise<string[]> {
    const dialogs = await this.client.getDialogs({});
    const notified = await this.getNotifiedUsers();
    return dialogs
      .filter(
        (d) =>
          d.isUser &&
          d.id !== undefined &&
          d.id.toString() !== this.myId &&
          !notified.includes(d.id.toString()),
      )
      .map((d) => d.id!.toString());
  }

  public async startPvPromotion() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    await new Promise((resolve) => setTimeout(resolve, 45000));

    let messageCounter = 0;

    try {
      while (true) {
        const pendingUsers = await this.getPendingUsers();

        if (pendingUsers.length === 0) {
          // No more users to process, exit the loop
          break;
        }

        const userId = pendingUsers[0];

        try {
          await this.client.sendMessage(userId!, {
            message: this.promoMessage,
          });
          await this.saveUserAsNotified(userId!);
          console.log(`[Promoter] Message delivered to PV -> [${userId}]`);
          messageCounter++;

          const microDelaySec = random.int(60, 300);
          await new Promise((resolve) =>
            setTimeout(resolve, microDelaySec * 1000),
          );

          if (messageCounter % 5 === 0) {
            const macroDelayMin = random.int(10, 20);
            console.log(
              `[Promoter] Anti-Flood cooling triggered. Resting for ${macroDelayMin} minutes...`,
            );
            await new Promise((resolve) =>
              setTimeout(resolve, macroDelayMin * 60 * 1000),
            );
          }
        } catch (pvErr: any) {
          if (
            pvErr.message?.includes("FLOOD") ||
            pvErr.message?.includes("LIMIT")
          ) {
            await new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000));
          } else {
            // For other errors, mark as notified to avoid infinite retry
            await this.saveUserAsNotified(userId!);
          }
        }
      }
    } catch (macroErr) {
      // silent
    } finally {
      this.isProcessing = false;
    }
  }
}
