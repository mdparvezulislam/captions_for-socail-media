import { describe, expect, it } from "vitest";
import { pickTopProducts, scoreProduct } from "@/lib/selection";
import type { Product } from "@/lib/types";

function product(overrides: Partial<Product>): Product {
  return {
    id: "prod_1",
    pageId: "page_1",
    sourceId: "SKU-1",
    nameBn: "টেস্ট প্রোডাক্ট",
    category: "হোম",
    priceBdt: 1000,
    compareAtPriceBdt: 1500,
    stock: 20,
    offerText: "ফ্রি ডেলিভারি",
    features: ["ফিচার"],
    problemBn: "সমস্যা",
    solutionBn: "সমাধান",
    material: "ABS",
    targetAudience: "সবাই",
    tags: ["টেস্ট"],
    imageUrl: null,
    artSeed: "seed",
    isActive: true,
    sourceUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const today = "2026-11-24";

describe("pickTopProducts", () => {
  it("skips products inside the repeat gap", () => {
    const items = [
      product({ id: "a", category: "হোম" }),
      product({ id: "b", category: "কিচেন" }),
      product({ id: "c", category: "গ্যাজেট" }),
    ];
    const result = pickTopProducts({
      products: items,
      lastUsed: new Map([["a", "2026-11-22"]]),
      usedToday: new Set(),
      today,
      count: 2,
      gapDays: 7,
    });
    expect(result.picked.map((item) => item.product.id)).not.toContain("a");
    expect(result.picked).toHaveLength(2);
  });

  it("never repeats a product already used today", () => {
    const items = [product({ id: "a" }), product({ id: "b" }), product({ id: "c", category: "অন্য" })];
    const result = pickTopProducts({
      products: items,
      lastUsed: new Map(),
      usedToday: new Set(["a", "b"]),
      today,
      count: 2,
      gapDays: 0,
    });
    expect(result.picked.map((item) => item.product.id)).toEqual(["c"]);
  });

  it("relaxes the gap when the catalogue runs dry", () => {
    const items = [product({ id: "a", category: "হোম" }), product({ id: "b", category: "কিচেন" })];
    const result = pickTopProducts({
      products: items,
      lastUsed: new Map([
        ["a", "2026-11-23"],
        ["b", "2026-11-23"],
      ]),
      usedToday: new Set(),
      today,
      count: 2,
      gapDays: 14,
    });
    expect(result.relaxed).toBe(true);
    expect(result.picked).toHaveLength(2);
  });

  it("respects the per-category cap", () => {
    const items = [
      product({ id: "a", category: "হোম" }),
      product({ id: "b", category: "হোম" }),
      product({ id: "c", category: "হোম" }),
      product({ id: "d", category: "কিচেন" }),
    ];
    const result = pickTopProducts({
      products: items,
      lastUsed: new Map(),
      usedToday: new Set(),
      today,
      count: 3,
      gapDays: 0,
      categoryMax: 2,
    });
    const home = result.picked.filter((item) => item.product.category === "হোম");
    expect(home.length).toBeLessThanOrEqual(2);
  });

  it("scores fresh discounts higher than stale full-price items", () => {
    const fresh = scoreProduct(product({ id: "fresh" }), null, today);
    const stale = scoreProduct(
      product({
        id: "stale",
        compareAtPriceBdt: null,
        offerText: null,
        sourceUpdatedAt: new Date(Date.now() - 60 * 864e5).toISOString(),
      }),
      "2026-11-23",
      today,
    );
    expect(fresh.score).toBeGreaterThan(stale.score);
  });

  it("reports exhaustion when nothing is eligible", () => {
    const result = pickTopProducts({
      products: [product({ id: "a", stock: 0 })],
      lastUsed: new Map(),
      usedToday: new Set(),
      today,
      count: 3,
      gapDays: 7,
    });
    expect(result.picked).toHaveLength(0);
    expect(result.exhausted).toBe(true);
  });
});
