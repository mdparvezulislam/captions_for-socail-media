import { readyDb } from "@/lib/db";
import { dhakaDate } from "@/lib/format";
import type { ProductEnrich } from "@/lib/types";

/**
 * Product sync from Unique Store BD's public catalog API.
 *
 * Primary source: GET https://uniquestorebd.top/api/v1/products
 * - one request returns the full catalog (pagination.totalPages === 1 at ~60 items)
 * - every product carries `updatedAt` → we skip unchanged rows (delta by row)
 * - products missing from the payload are soft-deleted
 */

export interface UniStoreProduct {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  sku?: string | null;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  discountAmount?: number;
  discountPercent?: number;
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  primaryImage?: string | null;
  images?: { url: string; isPrimary?: boolean }[];
  category?: { name?: string; slug?: string } | null;
  inStock?: boolean;
  availability?: string;
  deliveryInfo?: { warranty?: string; cashOnDelivery?: boolean } | null;
  orderLinks?: { productPage?: string; directCheckout?: string; whatsappOrder?: string; hotline?: string } | null;
  updatedAt?: string;
}

export interface UniStoreResponse {
  ok?: boolean;
  products?: UniStoreProduct[];
  data?: UniStoreProduct[];
  pagination?: { page: number; totalPages: number };
}

export const UNISTORE_SYNC_URL = "https://uniquestorebd.top/api/v1/products";

export function firstBanglaSentence(text: string | undefined, max = 170): string {
  if (!text) return "";
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const banglaLine =
    lines.find((line) => /[\u0980-\u09FF]/.test(line) && !line.startsWith("•") && !line.startsWith("🔥")) ?? lines[0] ?? "";
  const sentence = banglaLine.split("।")[0]?.trim() ?? "";
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

function splitHighlight(highlight: string): { label: string; text: string } {
  const separator = highlight.indexOf(":");
  if (separator > 0 && separator < 40) {
    return { label: highlight.slice(0, separator).trim(), text: highlight.slice(separator + 1).trim() };
  }
  return { label: "", text: highlight.trim() };
}

export function mapUniStoreProduct(item: UniStoreProduct, pageId: string) {
  const name = item.title ?? item.name ?? item.slug;
  const price = Math.round(item.salePrice ?? item.price ?? 0);
  const compareAt = item.regularPrice && item.regularPrice > price ? Math.round(item.regularPrice) : null;
  const highlights = (item.highlights ?? []).slice(0, 5);
  const features = highlights.map((highlight) => splitHighlight(highlight).text || highlight);
  const featureLabels = highlights.map((highlight) => splitHighlight(highlight).label).filter(Boolean);
  const discount = item.discountAmount ?? 0;
  const galleryUrls: string[] = [];
  const pushImg = (url?: string | null) => {
    if (typeof url === "string" && url.startsWith("https://")) {
      const clean = url.trim();
      if (clean && !galleryUrls.includes(clean)) galleryUrls.push(clean);
    }
  };
  pushImg(item.primaryImage);
  for (const img of item.images ?? []) {
    if (img?.isPrimary) pushImg(img.url);
  }
  for (const img of item.images ?? []) {
    pushImg(img?.url);
  }

  const enrich: ProductEnrich = {
    nameEn: name,
    keyword: "",
    featureLabels,
    orderUrl: item.orderLinks?.productPage,
    whatsapp: item.orderLinks?.hotline ?? undefined,
    warranty: item.deliveryInfo?.warranty ?? undefined,
    images: galleryUrls,
  };
  const keywordCandidate = name.match(/[A-Za-z][A-Za-z0-9-]{3,}/g) ?? [];
  const stop = new Set([
    "intelligence", "original", "premium", "quality", "warranty", "product", "genuine", "with", "for",
    "year", "years", "days", "edition", "wireless", "electric", "digital", "support", "brand", "store",
  ]);
  const meaningful = keywordCandidate.filter((word) => !stop.has(word.toLowerCase()));
  if (meaningful.length > 0) {
    enrich.keyword = meaningful.reduce((best, word) => (word.length > best.length ? word : best));
  }

  const sourceId = (item.sku?.trim() || item.id).trim();
  const baseForPercent = compareAt ?? price;
  const computedPercent =
    item.discountPercent ?? (baseForPercent > 0 ? Math.round((discount / baseForPercent) * 100) : 0);

  return {
    pageId,
    sourceId,
    nameBn: name,
    category: item.category?.name?.trim() || "অন্যান্য",
    priceBdt: price,
    compareAtPriceBdt: compareAt,
    stock: (item.inStock ?? item.availability === "in_stock") ? 120 : 0,
    offerText: discount > 0 ? `Save ৳${discount} (${computedPercent}% OFF)` : "ক্যাশ অন ডেলিভারি",
    features,
    problemBn: firstBanglaSentence(item.shortDescription ?? item.description),
    solutionBn: firstBanglaSentence(item.description),
    material: null,
    targetAudience: null,
    tags: [item.category?.name?.trim() ?? "অন্যান্য"],
    imageUrl: galleryUrls[0] ?? null,
    artSeed: item.slug || item.id,
    enrich,
    isActive: 1,
    sourceUpdatedAt: item.updatedAt ?? null,
  };
}

export interface SyncOutcome {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  deactivated: number;
  error?: string;
}

type ServiceFetcher = { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };

async function resolveStoreFetcher(url: string, customFetch?: typeof fetch): Promise<typeof fetch> {
  if (customFetch) return customFetch;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "uniquestorebd.top" || parsed.hostname === "www.uniquestorebd.top") {
      const cfMod = (await import("cloudflare:workers").catch(() => null)) as {
        env?: Record<string, unknown>;
      } | null;
      const service = cfMod?.env?.STORE_WORKER as ServiceFetcher | undefined;
      if (service && typeof service.fetch === "function") {
        return async (input, init) => {
          try {
            const res = await service.fetch(input, init);
            if (res.ok) return res;
          } catch {
            // fall back to public fetch
          }
          return fetch(input, init);
        };
      }
    }
  } catch {
    // fall back to global fetch
  }
  return fetch;
}

function buildPageUrl(baseUrl: string, pageNum: number): string {
  try {
    const parsed = new URL(baseUrl);
    if (!parsed.searchParams.has("limit")) {
      parsed.searchParams.set("limit", "100");
    }
    if (pageNum > 1) {
      parsed.searchParams.set("page", String(pageNum));
    }
    return parsed.toString();
  } catch {
    return baseUrl;
  }
}

export async function syncUniStoreCatalog(options: {
  pageId: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): Promise<SyncOutcome> {
  const baseUrl = options.url ?? UNISTORE_SYNC_URL;
  const fetchJson = await resolveStoreFetcher(baseUrl, options.fetchImpl);
  const started = Date.now();
  try {
    const headers = {
      accept: "application/json",
      "user-agent": "CaptionEngine/1.0 (+https://c.uniquestorebd.top)",
    };

    const fetchPage = async (pageNum: number): Promise<{ ok: true; payload: UniStoreResponse } | { ok: false; error: string }> => {
      const response = await fetchJson(buildPageUrl(baseUrl, pageNum), {
        headers,
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }
      const text = await response.text();
      try {
        return { ok: true, payload: JSON.parse(text) as UniStoreResponse };
      } catch {
        return { ok: false, error: `JSON parse error: ${text.slice(0, 100)}` };
      }
    };

    const first = await fetchPage(1);
    if (!first.ok) {
      return { ok: false, created: 0, updated: 0, skipped: 0, deactivated: 0, error: first.error };
    }

    const firstItems = first.payload.products ?? first.payload.data ?? [];
    if (!Array.isArray(firstItems) || firstItems.length === 0) {
      return {
        ok: false,
        created: 0,
        updated: 0,
        skipped: 0,
        deactivated: 0,
        error: "স্টোর API থেকে কোনো অ্যাক্টিভ প্রোডাক্ট পাওয়া যায়নি (total: 0)",
      };
    }

    const allItems: UniStoreProduct[] = [...firstItems];
    const totalPages = Math.min(20, Math.max(1, Number(first.payload.pagination?.totalPages ?? 1)));
    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      const next = await fetchPage(pageNum);
      if (!next.ok) break;
      const nextItems = next.payload.products ?? next.payload.data ?? [];
      if (!Array.isArray(nextItems) || nextItems.length === 0) break;
      allItems.push(...nextItems);
    }

    const db = await readyDb();
    const existing = await db
      .prepare("SELECT id, source_id, source_updated_at, is_active, enrich_json FROM products WHERE page_id = ?")
      .bind(options.pageId)
      .all<{ id: string; source_id: string; source_updated_at: string | null; is_active: number; enrich_json: string | null }>();
    const bySource = new Map((existing.results ?? []).map((row) => [row.source_id, row]));

    const incomingIds = new Set<string>();
    const statements: D1PreparedStatement[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    for (const item of allItems) {
      const mapped = mapUniStoreProduct(item, options.pageId);
      if (incomingIds.has(mapped.sourceId)) continue;
      incomingIds.add(mapped.sourceId);
      const current = bySource.get(mapped.sourceId);
      const updatedAt = mapped.sourceUpdatedAt ?? now;
      const needsGalleryBackfill =
        Boolean(mapped.enrich.images?.length) && (!current?.enrich_json || !current.enrich_json.includes('"images"'));

      if (
        current &&
        current.is_active === 1 &&
        !needsGalleryBackfill &&
        current.source_updated_at &&
        current.source_updated_at >= updatedAt
      ) {
        skipped++;
        continue;
      }

      if (current) {
        statements.push(
          db
            .prepare(
              `UPDATE products SET name_bn = ?, category = ?, price_bdt = ?, compare_at_price_bdt = ?, stock = ?,
               offer_text = ?, features_json = ?, problem_bn = ?, solution_bn = ?, tags_json = ?, image_url = ?,
               enrich_json = ?, is_active = ?, source_updated_at = ? WHERE id = ?`,
            )
            .bind(
              mapped.nameBn,
              mapped.category,
              mapped.priceBdt,
              mapped.compareAtPriceBdt,
              mapped.stock,
              mapped.offerText,
              JSON.stringify(mapped.features),
              mapped.problemBn,
              mapped.solutionBn,
              JSON.stringify(mapped.tags),
              mapped.imageUrl,
              JSON.stringify(mapped.enrich),
              mapped.isActive,
              updatedAt,
              current.id,
            ),
        );
        updated++;
      } else {
        statements.push(
          db
            .prepare(
              `INSERT INTO products (id, page_id, source_id, name_bn, category, price_bdt, compare_at_price_bdt, stock,
               offer_text, features_json, problem_bn, solution_bn, material, target_audience, tags_json, image_url,
               art_seed, enrich_json, is_active, source_updated_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              `prod_${crypto.randomUUID().slice(0, 12)}`,
              mapped.pageId,
              mapped.sourceId,
              mapped.nameBn,
              mapped.category,
              mapped.priceBdt,
              mapped.compareAtPriceBdt,
              mapped.stock,
              mapped.offerText,
              JSON.stringify(mapped.features),
              mapped.problemBn,
              mapped.solutionBn,
              mapped.material,
              mapped.targetAudience,
              JSON.stringify(mapped.tags),
              mapped.imageUrl,
              mapped.artSeed,
              JSON.stringify(mapped.enrich),
              mapped.isActive,
              updatedAt,
              now,
            ),
        );
        created++;
      }
    }

    // Products no longer in the catalog get soft-deleted.
    let deactivated = 0;
    for (const [sourceId, row] of bySource) {
      if (!incomingIds.has(sourceId) && row.is_active !== 0) {
        statements.push(db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").bind(row.id));
        deactivated++;
      }
    }

    // Execute D1 writes in clean batches of 25 statements.
    for (let i = 0; i < statements.length; i += 25) {
      await db.batch(statements.slice(i, i + 25));
    }

    await db
      .prepare("INSERT INTO generation_logs (id, page_id, stage, status, latency_ms, created_at) VALUES (?, ?, 'sync', 'ok', ?, ?)")
      .bind(`log_${crypto.randomUUID().slice(0, 12)}`, options.pageId, Date.now() - started, now)
      .run();

    return { ok: true, created, updated, skipped, deactivated };
  } catch (error) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      deactivated: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function syncDate(): string {
  return dhakaDate();
}
