import type { CaptionMeta, CaptionType, Page, PosterCopy, Product } from "@/lib/types";
import { deriveKeyword } from "@/lib/facebook-text";
import { discountPercent } from "@/lib/format";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: T[], seed: string): T {
  return items[hash(seed) % items.length];
}

export function englishName(product: Product): string {
  return product.enrich?.nameEn?.trim() || product.nameBn;
}

export function commentKeyword(product: Product): string {
  return product.enrich?.keyword?.trim() || deriveKeyword(product.nameBn, product.category);
}

function labels(product: Product): string[] {
  return product.enrich?.featureLabels?.length ? product.enrich.featureLabels : product.features.map((f) => f.split(":")[0]);
}

function clamp(text: string, max = 96): string {
  const clean = text.replace(/\s+/g, " ").trim().replace(/।+$/, "");
  const first = clean.split("।")[0] ?? clean;
  const value = first.length > 12 ? first : clean;
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function solution(product: Product): string {
  return clamp(product.solutionBn, 130);
}

/** বুলেট — লেবেল + ফিচারের বাংলা অংশ */
function bullets(product: Product, start: number, count: number): string {
  const featureList = product.features;
  const labelList = labels(product);
  const tails = ["", "", "", ""];
  const lines: string[] = [];
  for (let index = 0; index < count; index++) {
    const feature = featureList[(start + index) % Math.max(featureList.length, 1)];
    if (!feature) break;
    const label = labelList[(start + index) % Math.max(labelList.length, 1)] ?? "";
    const cleaned = feature.replace(/^[^:]{2,32}:\s*/, "");
    const tail = tails[(start + index) % tails.length];
    const body = clamp(cleaned, 88);
    lines.push(`✅ ${label || cleaned.split(" ").slice(0, 3).join(" ")} - ${body}${tail}`);
  }
  return lines.join("\n");
}

const OPENERS: Record<CaptionType, string[]> = {
  image: [
    "গত সপ্তাহে রাতে কাজ করতে করতে হাতের কাছে কিছু ছিল না, তখনই বুঝলাম ছোট জিনিসটাও কত দরকার।",
    "সকালে বের হওয়ার আগে পাঁচ মিনিট বাঁচলে সেটা কত বড় লাগে, সেটা যিনি জানেন তিনি জানেন।",
    "একটা জিনিস একবার অভ্যাস হয়ে গেলে আর আগের মতো ফিরে থাকা যায় না।",
  ],
  video: [
    "আপনার দিনে এই একই কাজটা কতবার করছেন?",
    "একটা জিনিস কেন এত দরকার — ২০ সেকেন্ডে বুঝে নিন।",
    "এই ঝামেলাটা আপনারও হয়ে থাকে?",
  ],
  problem: [
    "দিনশেষে সবচেয়ে খারাপ লাগে সেই মুহূর্তটায়, যখন দেখেন কাজটা আবার পিছিয়ে গেছে।",
    "আসলে সমস্যাটা জিনিস নয়, অভ্যাস।",
    "সবাই একই ভুলটা করে — দরকারের সময়ে হাতের কাছে থাকে না।",
  ],
};

const INSIGHTS = [
  "আসল কথা হলো, আমরা তখনই সমাধান খুঁজি যখন ঝামেলাটা বাড়তে থাকে।",
  "বিষয়টা প্রযুক্তি নয় — বিষয়টা সময়ের।",
  "যেটা রোজ দরকার হয়, সেটা যত সহজে হাতের কাছে থাকে তত ভালো।",
];

function ctaFor(type: CaptionType, product: Product): string {
  if (type === "video") return "👀 দাম জানতে ইনবক্স করুন — স্টক শেষ হওয়ার আগে।";
  if (type === "problem") {
    return product.offerText
      ? `🔥 ${product.offerText} — আজকের স্টকে শেষ হয়ে যাবে।`
      : "🔥 অল্প স্টকে এসেছে, দেরি করলে মিস করবেন।";
  }
  return `কমেন্টে '${commentKeyword(product)}' লিখুন, দাম আর অর্ডার লিংক ইনবক্সে দিয়ে দিচ্ছি।`;
}

function tagsFor(product: Product, page: Page, type: CaptionType): string[] {
  const keyword = commentKeyword(product).replace(/[^A-Za-z0-9]/g, "");
  const brand = page.brandName.replace(/[^A-Za-z0-9]/g, "");
  const category = (product.enrich?.keyword ?? product.category).replace(/[^A-Za-z0-9\u0980-\u09FF]/g, "");
  if (type === "video") return [`#${keyword}`, "#রিলস", `#${brand}`].filter((tag) => tag.length > 3);
  if (type === "problem") {
    const pain = product.tags[0]?.replace(/\s+/g, "") || category;
    return [`#${pain}`, `#${category}`, `#${keyword}`].filter((tag) => tag.length > 3);
  }
  return [`#${keyword}`, `#${brand}`, `#${category}`, ...page.hashtags.slice(0, 2)].slice(0, 5);
}

export function demoCaption(product: Product, page: Page, type: CaptionType): { body: string; meta: CaptionMeta } {
  const seed = `${product.id}:${type}:${page.id}`;
  const nameEn = englishName(product);
  const cta = ctaFor(type, product);
  const hashtags = tagsFor(product, page, type);
  void hashtags;

  if (type === "video") {
    const opener = pick(OPENERS.video, seed);
    const body = [
      opener,
      `${nameEn} — ${solution(product)}।`,
      cta,
    ].join("\n");
    return { body, meta: { hook: opener, cta, angle: "question", source: "demo" } };
  }

  if (type === "problem") {
    const opener = pick(OPENERS.problem, seed);
    const insight = pick(INSIGHTS, `${seed}:b`);
    const body = [
      opener,
      insight,
      "",
      bullets(product, 3, 2),
      "",
      `${nameEn} ঠিক এই জায়গাতেই কাজে আসে — ${solution(product)}।`,
      cta,
    ].join("\n");
    return { body, meta: { hook: opener, cta, angle: "confession", source: "demo" } };
  }

  const opener = pick(OPENERS.image, seed);
  const body = [
    opener,
    `${nameEn} এখন আমার রুটিনের অংশ — ${clamp(product.features[0] ?? solution(product), 110)}।`,
    "",
    bullets(product, 0, 4),
    "",
    cta,
  ].join("\n");
  return { body, meta: { hook: opener, cta, angle: "story", source: "demo" } };
}

export function demoHashtags(product: Product, page: Page, type: CaptionType = "image"): string[] {
  return tagsFor(product, page, type);
}

export function demoPosterCopy(product: Product, page: Page): PosterCopy {
  const discount = discountPercent(product.priceBdt, product.compareAtPriceBdt);
  return {
    headline: englishName(product).slice(0, 28),
    subline: product.offerText?.trim() || product.solutionBn.slice(0, 38) || page.tagline,
    badge: discount > 0 ? `${discount}% OFF` : "নতুন",
    cta: commentKeyword(product).slice(0, 22) || "ইনবক্স করুন",
  };
}

export function demoCaptionSet(product: Product, page: Page): { type: CaptionType; body: string; meta: CaptionMeta }[] {
  const poster = demoPosterCopy(product, page);
  return (["image", "video", "problem"] as CaptionType[]).map((type) => {
    const { body, meta } = demoCaption(product, page, type);
    return { type, body, meta: { ...meta, poster } };
  });
}
