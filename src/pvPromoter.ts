import { TelegramClient } from "telegram";
import * as fs from "fs/promises";
import * as path from "path";

export class TelegramPvPromoter {
  private client: TelegramClient;
  private myId: string;
  private storagePath: string;
  private notifiedUsers: Set<string> = new Set();
  private userMsgCount: Map<string, number> = new Map();

  constructor(client: TelegramClient, myId: string) {
    this.client = client;
    this.myId = myId;
    this.storagePath = path.resolve(process.cwd(), "promoter_data.json");
  }

  async init() {
    try {
      const data = await fs.readFile(this.storagePath, "utf-8");
      const parsed = JSON.parse(data);
      this.notifiedUsers = new Set(parsed.notified || []);
      if (parsed.msgCounts) {
        this.userMsgCount = new Map(Object.entries(parsed.msgCounts));
      }
    } catch {
      await this.save();
    }
  }

  private async save() {
    const toSave = {
      notified: Array.from(this.notifiedUsers),
      msgCounts: Object.fromEntries(this.userMsgCount),
    };
    await fs.writeFile(this.storagePath, JSON.stringify(toSave, null, 2));
  }

  incrementMessageCount(userId: string): number {
    const newCount = (this.userMsgCount.get(userId) || 0) + 1;
    this.userMsgCount.set(userId, newCount);
    this.save().catch(() => {});
    return newCount;
  }

  shouldSendPromo(userId: string): boolean {
    if (this.notifiedUsers.has(userId)) return false;
    const count = this.userMsgCount.get(userId) || 0;
    return count >= 4;
  }

  hasNotified(userId: string): boolean {
    return this.notifiedUsers.has(userId);
  }

  async saveUserAsNotified(userId: string) {
    if (!this.notifiedUsers.has(userId)) {
      this.notifiedUsers.add(userId);
      await this.save();
    }
  }

  getPromoMessage(userId: string, context: string): string {
    const lowerContext = context.toLowerCase();
    if (
      lowerContext.includes("فیلتر") ||
      lowerContext.includes("نت") ||
      lowerContext.includes("vpn") ||
      lowerContext.includes("کانفیگ") ||
      lowerContext.includes("proxy")
    ) {
      return "🌐 آها این روزا نت خیلی اذیت میکنه میدونم. من یه کانال دارم هر روز چندتا کانفیگ رایگان V2Ray و Slipnet میذاره. خودم استفاده میکنم خوبه. میخوای بفرستم برات؟ @configCollectore_Bot";
    }
    if (lowerContext.includes("رایگان") || lowerContext.includes("مجانی")) {
      return "🎯 راستی یه خبر خوب داشتم برات: یه کانال پیدا کردم که کانفیگ V2Ray و پروکسی رایگان میذاره. خیلی به دردم خورده. بفرستم واست؟ @configCollectore_Bot";
    }
    return "🌍 اینترنت آزاد حق همه‌ست! من هر روز توی کانالم کانفیگ‌های رایگان V2Ray و Slipnet میذارم. بدون هیچ هزینه‌ای میتونی استفاده کنی. بیا ببین:\n@configCollectore_Bot";
  }

  getPromoKeyboard() {
    return [
      [
        { text: "📡 کانفیگ رایگان", url: "https://t.me/configCollectore_Bot" },
        { text: "👥 دعوت دوستان", switchInlineQuery: "join_channel" },
      ],
    ];
  }
}
