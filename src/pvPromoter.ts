import { TelegramClient } from "telegram";
import * as fs from "fs/promises";
import * as path from "path";

export class TelegramPvPromoter {
  private client: TelegramClient;
  private myId: string = "";
  private storageFilePath: string;
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
  }

  public async init() {
    await this.loadStorageSync();
  }

  public getPromoMessage(): string {
    return this.promoMessage;
  }

  public hasNotified(userId: string): boolean {
    return this.notifiedUsersSet.has(userId);
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

  public async saveUserAsNotified(userId: string) {
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
}
