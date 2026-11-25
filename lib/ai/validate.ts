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
  hard: string[];
  soft: string[];
  similarity: number;
  wordCount: number;
  banglaRatio: number;
  cliches: string[];
  copiedLines: string[];
}

const WORD_RANGE: Record<CaptionType, [number, number]> = {
  image: [40, 90],
  video: [14, 60],
  problem: [45, 110],
};

const BANNED = /১০০\s*%\s*গ্যারান্টি|রোগ\s*(সারায়|সারে|মুক্ত)|ডাক্তার|ঔষধ|সরকারি\s*(অনুমোদিত|প্রকল্প)|ক্যান্সার|ডায়াবেটিস\s*(সারায়|নিরাময়)/;

/** AI-এর ছাপ ফেলে দেয় এমন ক্লিশে — মানুষের লেখায় এগুলো থাকে না */
const CLICHES = [
  "এই সুবিধা পেতে",
  "সহজ হয়ে যায়",
  "সহজ করে তোলে",
  "সহজ করে দেয়",
  "আপনার জীবনকে",
  "দৈনন্দিন জীবনে",
  "নিশ্চিন্তে ব্যবহার",
  "বিশাল ডিসপ্লে",
  "সেরা সঙ্গী",
  "চমৎকার",
  "অসাধারণ",
  "দারুণ",
  "একদম",
  "কেন নেবেন",
  "সমাধান:",
  "সেরা সমাধান",
  "পারফেক্ট",
  "সময় বাঁচান",
  "জীবন বদলে",
  "এই ঝামেলা এড়াতে আমি এখন ব্যবহার করছি",
  "সুবিধা পেতে",
];

const BN_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
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
  return text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
}

export function banglaRatio(text: string): number {
  const bangla = (text.match(/[\u0980-\u09FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = bangla + latin;
  return total === 0 ? 0 : bangla / total;
}

export function clicheHits(text: string): string[] {
  return CLICHES.filter((phrase) => text.includes(phrase));
}

function normalizeLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/[✅✔️•●\-–—]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ক্যাপশনের লাইনগুলো (ফাঁকা বাদ, নরমালাইজড) */
export function captionLines(body: string): string[] {
  return body
    .split("\n")
    .map(normalizeLine)
    .filter((line) => line.length > 8);
}

/** বুলেটের বাংলা অংশ কি API-র ফিচার বর্ণনার সাথে প্রায় হুবহু? */
export function copiedFeatureLines(body: string, features: string[]): string[] {
  const bullets = body
    .split("\n")
    .filter((line) => line.trim().startsWith("✅"))
    .map((line) => normalizeLine(line.replace(/^[^\p{L}]*/u, "")));
  const sources = features.map(normalizeLine).filter(Boolean);
  const hits: string[] = [];
  for (const bullet of bullets) {
    for (const source of sources) {
      if (source.length < 12) continue;
      if (bullet.includes(source) || similarity(bullet, source) >= 0.82) {
        hits.push(bullet.slice(0, 60));
        break;
      }
    }
  }
  return hits;
}

export interface CrossCheck {
  sharedLines: string[];
  similarity: number;
  sameOpening: boolean;
  sameCta: boolean;
}

/** দুটো ক্যাপশন কতটা একই রকম — লাইন, শুরু আর শেষ লাইন ধরে */
export function crossCheck(a: string, b: string): CrossCheck {
  const linesA = captionLines(a);
  const linesB = captionLines(b);
  const setB = new Set(linesB);
  const sharedLines = linesA.filter((line) => setB.has(line));

  const opening = (text: string) => normalizeLine(text.split("\n").find((line) => line.trim()) ?? "").slice(0, 40);
  const cta = (text: string) => {
    const list = text.split("\n").map((line) => line.trim()).filter(Boolean);
    return normalizeLine(list[list.length - 1] ?? "").slice(0, 60);
  };

  return {
    sharedLines,
    similarity: Math.round(similarity(a, b) * 100) / 100,
    sameOpening: opening(a).length > 12 && opening(a) === opening(b),
    sameCta: cta(a).length > 8 && cta(a) === cta(b),
  };
}

export function validateCaption(input: ValidationInput): ValidationResult {
  const hard: string[] = [];
  const soft: string[] = [];
  const body = input.body.trim();
  const words = body.split(/\s+/).filter(Boolean);
  const [min, max] = WORD_RANGE[input.type];
  const ratio = banglaRatio(body);

  if (words.length < min || words.length > max) {
    hard.push(`দৈর্ঘ্য ঠিক নেই (${bnNumber(words.length)} শব্দ, দরকার ${bnNumber(min)}–${bnNumber(max)})`);
  }
  if (ratio < 0.55) hard.push("বাংলার অনুপাত কম — প্রায় পুরোটা বাংলায় লিখতে হবে");
  if (emojiCount(body) > 5) soft.push("ইমোজি বেশি হয়ে গেছে");
  if (BANNED.test(body)) hard.push("নিষিদ্ধ দাবি আছে (চিকিৎসা/গ্যারান্টি সংক্রান্ত)");
  if (containsPriceMismatch(body, input.product.priceBdt, input.product.compareAtPriceBdt)) {
    hard.push("দাম প্রোডাক্ট ডেটার সাথে মিলছে না");
  }
  if (/\[|\]|\{\{|\}\}|XXX|lorem/i.test(body)) hard.push("প্লেসহোল্ডার টেক্সট রয়ে গেছে");

  const tags = input.hashtags.filter(Boolean);
  if (tags.length < 3 || tags.length > 8) hard.push("হ্যাশট্যাগ ৩–৮টির মধ্যে দরকার");
  if (tags.some((tag) => !tag.startsWith("#") || /\s/.test(tag))) hard.push("হ্যাশট্যাগের ফরম্যাট ঠিক নেই");

  let maxSimilarity = 0;
  for (const recent of input.recentBodies) {
    if (!recent) continue;
    maxSimilarity = Math.max(maxSimilarity, similarity(body, recent));
  }
  if (maxSimilarity >= 0.75) hard.push("পূর্বের ক্যাপশনের সাথে খুব মিল");

  const cliches = clicheHits(body);
  if (cliches.length > 0) soft.push(`ক্লিশে বাক্য: ${cliches.slice(0, 3).join(", ")}`);

  const copied = copiedFeatureLines(body, input.product.features);
  if (copied.length > 0) soft.push("ফিচারের বর্ণনা হুবহু কপি করা হয়েছে");

  const issues = [...hard, ...soft];
  return {
    ok: hard.length === 0,
    issues,
    hard,
    soft,
    similarity: Math.round(maxSimilarity * 100) / 100,
    wordCount: words.length,
    banglaRatio: Math.round(ratio * 100) / 100,
    cliches,
    copiedLines: copied,
  };
}
