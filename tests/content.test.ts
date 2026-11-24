import { describe, expect, it } from "vitest";
import { buildPrompt, RESPONSE_SCHEMA } from "@/lib/ai/prompts";
import { demoCaptionSet, demoPosterCopy } from "@/lib/ai/demo";
import { bnDate, bnNumber, dhakaDate, discountPercent, taka, wordCount } from "@/lib/format";
import { posterSize, wrapLines } from "@/lib/poster";
import type { Page, Product } from "@/lib/types";

const page: Page = {
  id: "page_1",
  name: "Unique Store BD",
  slug: "unique-store-bd",
  brandName: "Unique Store BD",
  tagline: "ঘরের প্রয়োজন, এক জায়গায়",
  voice: "বন্ধুত্বপূর্ণ",
  ctaText: "অর্ডার করতে ইনবক্স করুন",
  hashtags: ["#UniqueStoreBD", "#ক্যাশঅনডেলিভারি"],
  dailyCount: 5,
  repeatGapDays: 14,
  brand: {
    primary: "#1C1917",
    accent: "#E5632A",
    surface: "#FBF7F1",
    ink: "#191512",
    logoMark: "ইউ",
    watermark: "uniquestorebd.com",
    font: "anek",
    layout: "editorial",
  },
  isActive: true,
  createdAt: "2026-11-20T00:00:00Z",
};

const product: Product = {
  id: "prod_1",
  pageId: "page_1",
  sourceId: "USB-1000",
  nameBn: "রিচার্জেবল মিনি ফ্যান",
  category: "ফ্যান",
  priceBdt: 1290,
  compareAtPriceBdt: 1690,
  stock: 40,
  offerText: "ফ্রি ডেলিভারি",
  features: ["৬–৮ ঘণ্টা ব্যাকআপ", "USB-C চার্জিং"],
  problemBn: "লোডশেডিং-এ গরম",
  solutionBn: "চার্জ দিলেই ঠান্ডা বাতাস",
  material: "ABS",
  targetAudience: "ছাত্র",
  tags: ["ফ্যান"],
  imageUrl: null,
  artSeed: "seed",
  isActive: true,
  sourceUpdatedAt: null,
  createdAt: "2026-11-20T00:00:00Z",
};

describe("buildPrompt", () => {
  const prompt = buildPrompt({ page, product, type: "image", angle: "benefit", avoid: ["পুরনো ক্যাপশন এক"] });

  it("includes the real price and brand voice", () => {
    expect(prompt.user).toContain("৳১,২৯০");
    expect(prompt.user).toContain("Unique Store BD");
    expect(prompt.system).toContain("বাংলা");
  });

  it("includes the avoid list", () => {
    expect(prompt.user).toContain("পুরনো ক্যাপশন এক");
  });

  it("forbids invented facts and banned claims", () => {
    expect(prompt.system).toContain("বানিয়ে লিখবে না");
    expect(prompt.system).toContain("১০০% গ্যারান্টি");
  });

  it("declares a structured schema with all keys", () => {
    const properties = RESPONSE_SCHEMA.properties as Record<string, unknown>;
    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining(["image_caption", "video_caption", "problem_caption", "hashtags", "poster"]),
    );
  });
});

describe("demo generator", () => {
  const set = demoCaptionSet(product, page);

  it("returns all three caption types", () => {
    expect(set.map((item) => item.type)).toEqual(["image", "video", "problem"]);
  });

  it("is deterministic for the same product and page", () => {
    expect(demoCaptionSet(product, page)[0].body).toBe(set[0].body);
  });

  it("only uses the real price", () => {
    for (const item of set) {
      if (item.body.includes("৳")) {
        expect(item.body).not.toMatch(/৳(?!১,২৯০|১,৬৯০)/);
      }
    }
  });

  it("builds poster copy with a badge and CTA", () => {
    const poster = demoPosterCopy(product, page);
    expect(poster.badge).toContain("OFF");
    expect(poster.cta.length).toBeGreaterThan(2);
  });
});

describe("format helpers", () => {
  it("converts digits to Bangla", () => {
    expect(bnNumber(1290)).toBe("১,২৯০");
    expect(taka(1290)).toBe("৳১,২৯০");
  });

  it("formats a Bangla date", () => {
    expect(bnDate("2026-11-24")).toBe("২৪ নভেম্বর");
  });

  it("computes discount percentage", () => {
    expect(discountPercent(1290, 1690)).toBe(24);
    expect(discountPercent(1290, null)).toBe(0);
  });

  it("computes Dhaka date independent of UTC", () => {
    expect(dhakaDate(new Date("2026-11-24T20:00:00Z"))).toBe("2026-11-25");
  });

  it("counts words", () => {
    expect(wordCount("এক দুই  তিন")).toBe(3);
  });
});

describe("poster helpers", () => {
  it("returns correct pixel sizes", () => {
    expect(posterSize("4:5")).toEqual({ width: 1080, height: 1350 });
    expect(posterSize("1:1")).toEqual({ width: 1080, height: 1080 });
    expect(posterSize("9:16")).toEqual({ width: 1080, height: 1920 });
  });

  it("wraps text and honours the line limit", () => {
    const lines = wrapLines("এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ", 12, 2);
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.length <= 14)).toBe(true);
  });
});
