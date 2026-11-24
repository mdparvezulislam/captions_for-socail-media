import type { CaptionMeta, CaptionType, Page, PosterCopy, Product } from "@/lib/types";
import { discountPercent, taka } from "@/lib/format";

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

function shortName(product: Product, max = 26): string {
  const name = product.nameBn.replace(/\s+/g, " ").trim();
  return name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;
}

function moneyLine(product: Product): string {
  const price = taka(product.priceBdt);
  if (product.compareAtPriceBdt && product.compareAtPriceBdt > product.priceBdt) {
    return `${price} · আগে ${taka(product.compareAtPriceBdt)}`;
  }
  return price;
}

function offerLine(product: Product): string {
  return product.offerText?.trim() ? product.offerText.trim() : "সারা দেশে ক্যাশ অন ডেলিভারি";
}

const HOOKS = {
  image: [
    "এই দামে এত সুবিধা কোথায় পাবেন?",
    "একবার ব্যবহার করলেই বুঝবেন, কেন সবাই নিচ্ছে।",
    "ঘরের কাজ সহজ করার সবচেয়ে স্মার্ট উপায়।",
    "আপনার রোজকার কাজটা এখন অর্ধেক সময়ে।",
    "যেটা একবার কিনলে বারবার কাজে লাগে।",
    "দামে কম, কাজে বেশি — এটাই আসল হিসাব।",
    "প্রতিদিনের ঝামেলা কমানোর সহজ সমাধান।",
  ],
  video: [
    "৩০ সেকেন্ডে দেখে নিন — কেন এটা আলাদা 👇",
    "এই ভিডিওটা শেষ পর্যন্ত দেখুন, তারপর সিদ্ধান্ত নিন 👇",
    "যেটা দেখে মনে হবে — এটা আমার দরকারই ছিল 👇",
    "এই একটা জিনিস আপনার রুটিন বদলে দিতে পারে 👇",
    "শুরুতে দামটা দেখুন, তারপর ফিচার 👇",
  ],
  problem: [
    "সমস্যাটা চিনতে পারছেন?",
    "প্রতিদিন এই ঝামেলাটা কি আপনারও হয়?",
    "একটা ছোট সমস্যা, প্রতিদিন বড় হয়।",
    "এই ঝামেলাটা কি প্রতিদিনই হয়?",
    "যে সমস্যাটা কেউ বলে না, কিন্তু সবাই ভোগে।",
  ],
};

const BENEFIT_LINES = [
  "সময় বাঁচে, কাজ হয় দ্রুত।",
  "একবার কিনলে বছরের পর বছর ব্যবহার।",
  "কম খরচে বেশি সুবিধা।",
  "যত্ন নিতে হয় না বললেই চলে।",
];

const CTAS = [
  "অর্ডার করতে ইনবক্স করুন 👇",
  "আজই অর্ডার করতে মেসেজ দিন 📩",
  "স্টক ফুরানোর আগে অর্ডার করুন 🛒",
  "নিচে কমেন্ট করুন, আমরা কল দিচ্ছি 📞",
  "অর্ডার করতে চাইলে শুধু “অর্ডার” লিখে মেসেজ দিন ✅",
];

function features(product: Product, count = 2): string[] {
  const list = product.features.filter(Boolean);
  if (list.length === 0) return [product.solutionBn];
  return list.slice(0, count);
}

function tagsFor(product: Product, page: Page): string[] {
  const base = [
    ...product.tags.slice(0, 3).map((tag) => `#${tag.replace(/\s+/g, "")}`),
    ...page.hashtags.slice(0, 3),
    "#ক্যাশঅনডেলিভারি",
  ];
  return Array.from(new Set(base)).slice(0, 6);
}

export function demoCaption(product: Product, page: Page, type: CaptionType): { body: string; meta: CaptionMeta } {
  const seed = `${product.id}:${type}:${page.id}`;
  const f = features(product);
  const hook = pick(HOOKS[type], seed);
  const benefit = pick(BENEFIT_LINES, `${seed}:b`);
  const cta = pick(CTAS, `${seed}:c`);
  const price = moneyLine(product);
  const offer = offerLine(product);
  const hashtags = tagsFor(product, page);

  if (type === "video") {
    const body = [
      hook,
      `${product.solutionBn || f[0]}`,
      `${f[1] ?? benefit} — দাম ${price}`,
      cta,
    ].join("\n");
    return {
      body,
      meta: { hook, cta, angle: "video", source: "demo", hashtags } as CaptionMeta,
    };
  }

  if (type === "problem") {
    const body = [
      `${product.problemBn || hook}`,
      `সমাধান: ${product.solutionBn || f[0]}।`,
      `${f[0] ? `কেন এটাই: ${f.join(", ")}।` : benefit}`,
      `আজকের দাম ${price}${product.offerText ? ` — ${product.offerText}` : ""}`,
      cta,
    ].join("\n");
    return { body, meta: { hook: product.problemBn, cta, angle: "problem", source: "demo" } };
  }

  const body = [
    hook,
    `${product.solutionBn || f[0]}। ${f[1] ? `${f[1]}।` : benefit}`,
    `💰 ${price} · 📦 ${offer}`,
    cta,
  ].join("\n");
  return { body, meta: { hook, cta, angle: "image", source: "demo" } };
}

export function demoHashtags(product: Product, page: Page): string[] {
  return tagsFor(product, page);
}

export function demoPosterCopy(product: Product, page: Page): PosterCopy {
  const discount = discountPercent(product.priceBdt, product.compareAtPriceBdt);
  return {
    headline: shortName(product, 28),
    subline: product.offerText?.trim() || product.solutionBn.slice(0, 38) || page.tagline,
    badge: discount > 0 ? `${discount}% OFF` : "নতুন",
    cta: page.ctaText.replace(/^(অর্ডার করতে|কল করুন:?)\s*/i, "").slice(0, 22) || "ইনবক্স করুন",
  };
}

export function demoCaptionSet(product: Product, page: Page): { type: CaptionType; body: string; meta: CaptionMeta }[] {
  const poster = demoPosterCopy(product, page);
  return (["image", "video", "problem"] as CaptionType[]).map((type) => {
    const { body, meta } = demoCaption(product, page, type);
    return { type, body, meta: { ...meta, poster } };
  });
}
