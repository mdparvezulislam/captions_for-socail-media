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

function featureLabels(product: Product): string[] {
  return product.enrich?.featureLabels?.length ? product.enrich.featureLabels : product.features.slice(0, 4);
}

function bulletLines(product: Product, count: number): string {
  const labels = featureLabels(product);
  const features = product.features;
  const lines: string[] = [];
  for (let index = 0; index < Math.min(count, labels.length, Math.max(features.length, 1)); index++) {
    const label = labels[index];
    const description = features[index] ?? product.solutionBn;
    lines.push(`✅ ${label} - ${description}`);
  }
  return lines.join("\n");
}

const SHORT_HOOKS = [
  "কাজটা কি আরও দ্রুত ও সহজ করতে চান?",
  "প্রতিদিনের এই ঝামেলা কি আপনারও আছে?",
  "এক কেনার মধ্যেই বছরের সমাধান চান?",
];

const CTA_TEMPLATE = "কমেন্টে '{keyword}' লিখুন। দাম আর অর্ডার লিংক ইনবক্সে দিয়ে দিচ্ছি।";

function ctaLine(product: Product): string {
  return CTA_TEMPLATE.replace("{keyword}", commentKeyword(product));
}

function tagsFor(product: Product, page: Page): string[] {
  const keywordTag = `#${commentKeyword(product).replace(/[^A-Za-z0-9]/g, "")}`;
  const brandTag = `#${page.brandName.replace(/[^A-Za-z0-9]/g, "")}`;
  const categoryTag = `#${(product.enrich?.keyword ?? product.category).replace(/[^A-Za-z0-9\u0980-\u09FF]/g, "")}`;
  return Array.from(new Set([keywordTag, brandTag, categoryTag, ...page.hashtags.slice(0, 2)])).slice(0, 5);
}

export function demoCaption(product: Product, page: Page, type: CaptionType): { body: string; meta: CaptionMeta } {
  const seed = `${product.id}:${type}:${page.id}`;
  const nameEn = englishName(product);
  const cta = ctaLine(product);
  const hashtags = tagsFor(product, page);

  if (type === "video") {
    const hook = pick(SHORT_HOOKS, seed);
    const body = [
      `${hook} আজই নিয়ে নিন ${nameEn}।`,
      "",
      `✅ ${product.features[0] ?? product.solutionBn}।`,
      "",
      cta,
    ].join("\n");
    return { body, meta: { hook, cta, angle: "video", source: "demo" } };
  }

  if (type === "problem") {
    const body = [
      `${product.problemBn}।`,
      "",
      `সমাধান: ${product.solutionBn} — ${nameEn}।`,
      "",
      bulletLines(product, 3),
      "",
      cta,
    ].join("\n");
    return { body, meta: { hook: product.problemBn, cta, angle: "problem", source: "demo" } };
  }

  const body = [
    `${product.problemBn}। এই ঝামেলা এড়াতে আমি এখন ব্যবহার করছি ${nameEn}।`,
    "",
    bulletLines(product, 4),
    "",
    cta,
  ].join("\n");
  return { body, meta: { hook: product.problemBn, cta, angle: "image", source: "demo" } };
}

export function demoHashtags(product: Product, page: Page): string[] {
  return tagsFor(product, page);
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
