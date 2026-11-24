import { describe, expect, it } from "vitest";
import { containsPriceMismatch, similarity, validateCaption } from "@/lib/ai/validate";
import type { Product } from "@/lib/types";

const product: Product = {
  id: "prod_1",
  pageId: "page_1",
  sourceId: "SKU-1",
  nameBn: "রিচার্জেবল মিনি ফ্যান",
  category: "ফ্যান",
  priceBdt: 1290,
  compareAtPriceBdt: 1690,
  stock: 40,
  offerText: "ফ্রি ডেলিভারি",
  features: ["৬–৮ ঘণ্টা ব্যাকআপ"],
  problemBn: "লোডশেডিং-এ গরম",
  solutionBn: "চার্জ দিলেই ঠান্ডা বাতাস",
  material: "ABS",
  targetAudience: "সবাই",
  tags: ["ফ্যান"],
  imageUrl: null,
  artSeed: "seed",
  enrich: null,
  isActive: true,
  sourceUpdatedAt: null,
  createdAt: "2026-11-20T00:00:00Z",
};

const goodBody = [
  "লোডশেডিং-এ ঘুম ভাঙে? আর নয় 🔥",
  "ফুল চার্জে ছয় থেকে আট ঘণ্টা ঠান্ডা বাতাস, বিদ্যুৎ ছাড়াই চলে।",
  "ইউএসবি সি চার্জিং, তিন স্পিড, মাত্র সাতশ বিশ গ্রাম ওজন।",
  "দাম ৳১,২৯০ — আগে ছিল ৳১,৬৯০, ডেলিভারি ফ্রি।",
  "অর্ডার করতে ইনবক্স করুন 👇",
].join("\n");

describe("containsPriceMismatch", () => {
  it("accepts the real price", () => {
    expect(containsPriceMismatch("দাম ৳১,২৯০", 1290, 1690)).toBe(false);
  });

  it("accepts the compare-at price", () => {
    expect(containsPriceMismatch("আগে ৳১,৬৯০", 1290, 1690)).toBe(false);
  });

  it("flags an invented price", () => {
    expect(containsPriceMismatch("মাত্র ৳৯৯৯", 1290, 1690)).toBe(true);
  });

  it("ignores text without a price", () => {
    expect(containsPriceMismatch("দাম কম, কোয়ালিটি ভালো", 1290, null)).toBe(false);
  });
});

describe("similarity", () => {
  it("scores identical text as 1", () => {
    expect(similarity(goodBody, goodBody)).toBeCloseTo(1, 5);
  });

  it("scores different text low", () => {
    expect(similarity("আজকের অফার শেষ হচ্ছে", "নতুন কালেকশন এসেছে")).toBeLessThan(0.3);
  });
});

describe("validateCaption", () => {
  it("accepts a well formed image caption", () => {
    const result = validateCaption({
      body: goodBody,
      type: "image",
      product,
      recentBodies: [],
      hashtags: ["#ফ্যান", "#লোডশেডিং", "#অফার"],
    });
    expect(result.ok).toBe(true);
    expect(result.banglaRatio).toBeGreaterThan(0.55);
    expect(result.wordCount).toBeGreaterThanOrEqual(35);
  });

  it("rejects a banned guarantee claim", () => {
    const result = validateCaption({
      body: `${goodBody}\n১০০% গ্যারান্টি সারাজীবন`,
      type: "image",
      product,
      recentBodies: [],
      hashtags: ["#ফ্যান", "#অফার", "#কিনুন"],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.join(" ")).toContain("নিষিদ্ধ");
  });

  it("rejects a caption that is too short", () => {
    const result = validateCaption({
      body: "ভালো ফ্যান।",
      type: "image",
      product,
      recentBodies: [],
      hashtags: ["#ফ্যান", "#অফার", "#কিনুন"],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("দৈর্ঘ্য"))).toBe(true);
  });

  it("rejects near duplicates of recent captions", () => {
    const result = validateCaption({
      body: goodBody,
      type: "image",
      product,
      recentBodies: [goodBody],
      hashtags: ["#ফ্যান", "#অফার", "#কিনুন"],
    });
    expect(result.ok).toBe(false);
    expect(result.similarity).toBeGreaterThanOrEqual(0.75);
  });

  it("rejects malformed hashtags", () => {
    const result = validateCaption({
      body: goodBody,
      type: "image",
      product,
      recentBodies: [],
      hashtags: ["ফ্যান", "#অফার"],
    });
    expect(result.ok).toBe(false);
  });
});
