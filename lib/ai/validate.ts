import type { CaptionType, Product } from "@/lib/types";
import { bnNumber } from "@/lib/format";

export interface ValidationInput {
  body: string;
  type: CaptionType;
  product: Product;
  recentBodies: string[];
  hashtags: string[];
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
  similarity: number;
  wordCount: number;
  banglaRatio: number;
}

const WORD_RANGE: Record<CaptionType, [number, number]> = {
  image: [35, 95],
  video: [18, 85],
  problem: [40, 120],
};

const BANNED = /১০০\s*%\s*গ্যারান্টি|রোগ\s*(সারায়|সারে|মুক্ত)|ডাক্তার|ঔষধ|সরকারি\s*(অনুমোদিত|প্রকল্প)|ক্যান্সার|ডায়াবেটিস\s*(সারায়|নিরাময়)/;

const BN_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (digit) => BN_DIGITS[digit] ?? digit);
}

function trigrams(input: string): Set<string> {
  const cleaned = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const padded = ` ${cleaned} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

export function similarity(a: string, b: string): number {
  const first = trigrams(a);
  const second = trigrams(b);
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  for (const gram of first) if (second.has(gram)) shared++;
  return shared / Math.sqrt(first.size * second.size);
}

export function containsPriceMismatch(body: string, priceBdt: number, compareAt: number | null): boolean {
  const matches = body.match(/৳\s*([০-৯0-9][০-৯0-9,]*)/g) ?? [];
  if (matches.length === 0) return false;
  const allowed = new Set([priceBdt, compareAt ?? -1].filter((value) => value > 0).map((value) => String(value)));
  for (const match of matches) {
    const digits = toAsciiDigits(match).replace(/[^0-9]/g, "");
    if (digits.length === 0) continue;
    if (!allowed.has(String(Number(digits)))) return true;
  }
  return false;
}

export function emojiCount(text: string): number {
  const matches = text.match(/\p{Extended_Pictographic}/gu);
  return matches ? matches.length : 0;
}

export function banglaRatio(text: string): number {
  const bangla = (text.match(/[\u0980-\u09FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = bangla + latin;
  if (total === 0) return 0;
  return bangla / total;
}

export function validateCaption(input: ValidationInput): ValidationResult {
  const issues: string[] = [];
  const body = input.body.trim();
  const words = body.split(/\s+/).filter(Boolean);
  const [min, max] = WORD_RANGE[input.type];
  const ratio = banglaRatio(body);

  if (words.length < min || words.length > max) {
    issues.push(`দৈর্ঘ্য ঠিক নেই (${bnNumber(words.length)} শব্দ, দরকার ${bnNumber(min)}–${bnNumber(max)})`);
  }

  if (ratio < 0.55) {
    issues.push("বাংলার অনুপাত কম — প্রায় পুরোটা বাংলায় লিখতে হবে");
  }

  if (emojiCount(body) > 6) {
    issues.push("ইমোজি বেশি হয়ে গেছে");
  }

  if (BANNED.test(body)) {
    issues.push("নিষিদ্ধ দাবি আছে (চিকিৎসা/গ্যারান্টি সংক্রান্ত)");
  }

  if (containsPriceMismatch(body, input.product.priceBdt, input.product.compareAtPriceBdt)) {
    issues.push("দাম প্রোডাক্ট ডেটার সাথে মিলছে না");
  }

  if (/\[|\]|\{\{|\}\}|XXX|lorem/i.test(body)) {
    issues.push("প্লেসহোল্ডার টেক্সট রয়ে গেছে");
  }

  const tags = input.hashtags.filter(Boolean);
  if (tags.length < 3 || tags.length > 8) {
    issues.push("হ্যাশট্যাগ ৩–৮টির মধ্যে দরকার");
  }
  if (tags.some((tag) => !tag.startsWith("#") || /\s/.test(tag))) {
    issues.push("হ্যাশট্যাগের ফরম্যাট ঠিক নেই");
  }

  let maxSimilarity = 0;
  for (const recent of input.recentBodies) {
    if (!recent) continue;
    maxSimilarity = Math.max(maxSimilarity, similarity(body, recent));
  }
  if (maxSimilarity >= 0.75) {
    issues.push("পূর্বের ক্যাপশনের সাথে খুব মিল");
  }

  return {
    ok: issues.length === 0,
    issues,
    similarity: Math.round(maxSimilarity * 100) / 100,
    wordCount: words.length,
    banglaRatio: Math.round(ratio * 100) / 100,
  };
}
