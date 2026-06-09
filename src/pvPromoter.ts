import { TelegramClient } from "telegram";
import * as fs from "fs/promises";
import * as path from "path";
import random from "random";

export class TelegramPvPromoter {
  private client: TelegramClient;
  private myId: string = "";
  private storageFilePath: string;
  private isProcessing: boolean = false;
  private notifiedUsersSet: Set<string> = new Set();

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
    this.loadStorageSync();
  }

  private async loadStorageSync() {
    try {
      await fs.access(this.storageFilePath);
      const data = await fs.readFile(this.storageFilePath, "utf-8");
      const list: string[] = JSON.parse(data || "[]");
      this.notifiedUsersSet = new Set(list);
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

  private async saveUserAsNotified(userId: string) {
    try {
      if (!this.notifiedUsersSet.has(userId)) {
        this.notifiedUsersSet.add(userId);
        const arrayData = Array.from(this.notifiedUsersSet);
        await fs.writeFile(
          this.storageFilePath,
          JSON.stringify(arrayData, null, 2),
          "utf-8",
        );
      }
    } catch (err) {}
  }

  private async getPendingUsers(): Promise<string[]> {
    try {
      const dialogs = await this.client.getDialogs({});
      return dialogs
        .filter(
          (d) =>
            d.isUser &&
            d.id !== undefined &&
            d.id.toString() !== this.myId &&
            !this.notifiedUsersSet.has(d.id.toString()),
        )
        .map((d) => d.id!.toString());
    } catch (err) {
      return [];
    }
  }

  public async startPvPromotion() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    await new Promise((resolve) => setTimeout(resolve, 60000));
    let messageCounter = 0;

    try {
      while (true) {
        const pendingUsers = await this.getPendingUsers();
        if (pendingUsers.length === 0) break;

        const userId = pendingUsers[0]!;

        try {
          await this.client.sendMessage(userId, { message: this.promoMessage });
          await this.saveUserAsNotified(userId);
          console.log(`[Promoter] Message delivered to PV -> [${userId}]`);
          messageCounter++;

          // Ultra-safe micro rest: 4 to 8 minutes between separate promotional messages
          const microDelaySec = random.int(240, 480);
          await new Promise((resolve) =>
            setTimeout(resolve, microDelaySec * 1000),
          );

          if (messageCounter % 3 === 0) {
            // Ultra-safe macro rest: 45 to 70 minutes cool down after 3 messages
            const macroDelayMin = random.int(45, 70);
            console.log(
              `[Promoter] Heavy Anti-Flood protective wait. Resting for ${macroDelayMin} minutes...`,
            );
            await new Promise((resolve) =>
              setTimeout(resolve, macroDelayMin * 60 * 1000),
            );
          }
        } catch (pvErr: any) {
          const errMsg = pvErr.message || "";
          if (errMsg.includes("FLOOD") || errMsg.includes("LIMIT")) {
            console.warn(
              "[Promoter Anti-Flood] Heavy Flood block detected! Cooling down for 90 minutes.",
            );
            await new Promise((resolve) => setTimeout(resolve, 90 * 60 * 1000));
          } else {
            await this.saveUserAsNotified(userId);
          }
        }
      }
    } catch (macroErr) {
    } finally {
      this.isProcessing = false;
    }
  }
}
