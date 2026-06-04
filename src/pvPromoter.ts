import { TelegramClient } from "telegram";
import * as fs from "fs/promises";
import * as path from "path";
import random from "random";

export class TelegramPvPromoter {
  private client: TelegramClient;
  private myId: string = "";
  private storageFilePath: string;
  private isProcessing: boolean = false;

  // Single blended message: Send "Salam" and "Promo text" together in one shot
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
      // Catch I/O bottlenecks silently
    }
  }

  public async startPvPromotion() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Initial boot delay (45 seconds) to keep the startup silent and secure
    await new Promise((resolve) => setTimeout(resolve, 45000));

    try {
      const dialogs = await this.client.getDialogs({});
      const notifiedUsers = await this.getNotifiedUsers();

      // Filter: ONLY target human PVs that have NEVER received any promo message before
      const targetUsers = dialogs.filter((d) => {
        return (
          d.isUser &&
          d.id !== undefined &&
          d.id.toString() !== this.myId &&
          !notifiedUsers.includes(d.id.toString()) // Critical guard against duplicates
        );
      });

      let messageCounter = 0;

      for (const dialog of targetUsers) {
        const userId = dialog.id!.toString();

        try {
          // Send the single text bundle (Salam + Ad link)
          await this.client.sendMessage(userId, { message: this.promoMessage });

          // Lock the user ID instantly in the database before the next iteration or restart
          await this.saveUserAsNotified(userId);

          console.log(`[Promoter] Message delivered to PV -> [${userId}]`);
          messageCounter++;

          // High-security micro delay: Sleep randomly between 1 to 5 minutes
          const microDelaySec = random.int(60, 300);
          await new Promise((resolve) =>
            setTimeout(resolve, microDelaySec * 1000),
          );

          // Macro cooling delay: Every 5 PVs, rest completely for 10 to 20 minutes
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
            // Force prolonged 30-minute sleep if Telegram raises a warning flag
            await new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000));
          }
        }
      }
    } catch (macroErr) {
      // Catch high-level failures quietly
    } finally {
      this.isProcessing = false;
    }
  }
}
