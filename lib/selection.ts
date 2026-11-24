import type { Product } from "@/lib/types";
import { discountPercent } from "@/lib/format";

export interface SelectionInput {
  products: Product[];
  /** productId -> last date it appeared in a caption (YYYY-MM-DD) */
  lastUsed: Map<string, string>;
  usedToday: Set<string>;
  today: string;
  count: number;
  gapDays: number;
  categoryMax?: number;
  seed?: string;
  pinnedProductIds?: string[];
}

export interface ScoredProduct {
  product: Product;
  score: number;
  reasons: string[];
}

export interface SelectionResult {
  picked: ScoredProduct[];
  relaxed: boolean;
  exhausted: boolean;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / 864e5));
}

export function scoreProduct(product: Product, lastUsedDate: string | null, today: string): ScoredProduct {
  const reasons: string[] = [];

  const ageDays = product.sourceUpdatedAt ? daysBetween(product.sourceUpdatedAt.slice(0, 10), today) : 30;
  const freshness = Math.min(1, Math.max(0, 1 - ageDays / 30));
  if (freshness > 0.7) reasons.push("নতুন আপডেট");

  const discount = discountPercent(product.priceBdt, product.compareAtPriceBdt);
  const offer = discount >= 20 ? 1 : discount >= 5 ? 0.6 : product.offerText ? 0.4 : 0;
  if (discount > 0) reasons.push(`${discount}% ছাড়`);

  const gap = lastUsedDate ? daysBetween(lastUsedDate, today) : 999;
  const cooldown = Math.min(1, gap / 7);
  if (gap >= 7) reasons.push("অনেকদিন পোস্ট হয়নি");

  const stockHealth = product.stock >= 5 && product.stock <= 200 ? 1 : product.stock > 200 ? 0.6 : 0.3;

  const performance = lastUsedDate ? 0.5 : 0.5;

  const score =
    0.3 * freshness + 0.2 * offer + 0.2 * cooldown + 0.15 * stockHealth + 0.1 * performance;

  return { product, score: Math.round(score * 1000) / 1000, reasons };
}

export function eligible(
  input: SelectionInput,
  gapDays: number,
  options: { allowUsedToday?: boolean; categoryCounts?: Map<string, number> } = {},
): SelectionInput["products"] {
  const { products, lastUsed, usedToday, today } = input;
  const categoryCounts = options.categoryCounts ?? new Map<string, number>();
  const categoryMax = input.categoryMax ?? 2;

  return products
    .filter((product) => {
      if (!product.isActive) return false;
      if (product.stock <= 0) return false;
      if (!options.allowUsedToday && usedToday.has(product.id)) return false;
      const last = lastUsed.get(product.id);
      if (last && gapDays > 0 && daysBetween(last, today) < gapDays) return false;
      if ((categoryCounts.get(product.category) ?? 0) >= categoryMax) return false;
      return true;
    })
    .sort((a, b) => {
      const scoreA = scoreProduct(a, lastUsed.get(a.id) ?? null, today).score;
      const scoreB = scoreProduct(b, lastUsed.get(b.id) ?? null, today).score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return hash(`${input.seed ?? ""}${a.id}`) - hash(`${input.seed ?? ""}${b.id}`);
    });
}

/**
 * Picks `count` products honouring the repeat gap. If there are not enough
 * fresh products, the gap is progressively relaxed so the feed never runs dry.
 */
export function pickTopProducts(input: SelectionInput): SelectionResult {
  const count = Math.max(1, input.count);
  const pinned = (input.pinnedProductIds ?? [])
    .map((productId) => input.products.find((product) => product.id === productId))
    .filter((product): product is Product => Boolean(product))
    .filter((product) => product.isActive && product.stock > 0);

  const picked: ScoredProduct[] = [];
  const seen = new Set<string>();
  const categoryCounts = new Map<string, number>();

  for (const product of pinned) {
    if (picked.length >= count) break;
    const scored = scoreProduct(product, input.lastUsed.get(product.id) ?? null, input.today);
    scored.reasons.unshift("পিন করা");
    picked.push(scored);
    seen.add(product.id);
    categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1);
  }

  const remaining = count - picked.length;
  if (remaining <= 0) return { picked, relaxed: false, exhausted: false };

  const gaps = [input.gapDays, Math.floor(input.gapDays / 2), 0];
  let pool: Product[] = [];
  let relaxed = false;

  for (const gap of gaps) {
    pool = eligible(
      { ...input, products: input.products.filter((product) => !seen.has(product.id)) },
      gap,
      { categoryCounts },
    );
    if (pool.length >= remaining) {
      relaxed = gap !== input.gapDays;
      break;
    }
    relaxed = gap !== input.gapDays;
  }

  for (const product of pool) {
    if (picked.length >= count) break;
    const category = product.category;
    if ((categoryCounts.get(category) ?? 0) >= (input.categoryMax ?? 2)) continue;
    picked.push(scoreProduct(product, input.lastUsed.get(product.id) ?? null, input.today));
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  // Final pass: ignore the category cap if we still cannot fill the batch.
  if (picked.length < count) {
    for (const product of input.products) {
      if (picked.length >= count) break;
      if (picked.some((item) => item.product.id === product.id)) continue;
      if (!product.isActive || product.stock <= 0) continue;
      if (input.usedToday.has(product.id)) continue;
      picked.push(scoreProduct(product, input.lastUsed.get(product.id) ?? null, input.today));
    }
  }

  return {
    picked,
    relaxed,
    exhausted: picked.length < count,
  };
}
