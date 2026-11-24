import { env } from "cloudflare:workers";
import { db, id, readyDb } from "@/lib/db";
import { getPageBySlug, listProducts } from "@/lib/data";

interface IncomingProduct {
  source_product_id: string;
  name_bn: string;
  category?: string;
  price_bdt: number;
  compare_at_price_bdt?: number | null;
  stock?: number;
  offer_text?: string | null;
  features_bn?: string[];
  problem_bn?: string;
  solution_bn?: string;
  material?: string | null;
  target_audience?: string | null;
  tags?: string[];
  image_url?: string | null;
  is_active?: boolean;
  deleted?: boolean;
  updated_at?: string;
}

function authorized(request: Request): boolean {
  const expected = (env as unknown as Record<string, unknown>).PRODUCT_API_TOKEN;
  if (typeof expected !== "string" || expected.length === 0) return true; // dev mode
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const slug = url.searchParams.get("page");
  if (!slug) return Response.json({ ok: false, error: "page query param required" }, { status: 400 });
  const page = await getPageBySlug(slug);
  if (!page) return Response.json({ ok: false, error: "page not found" }, { status: 404 });
  const products = await listProducts(page.id, { search: url.searchParams.get("q") ?? undefined });
  return Response.json({ ok: true, page: page.slug, count: products.length, products });
}

/**
 * Bulk upsert used by the store backend (or a CSV importer).
 * Body: { page: "unique-store-bd", products: IncomingProduct[] }
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let payload: { page?: string; products?: IncomingProduct[] };
  try {
    payload = (await request.json()) as { page?: string; products?: IncomingProduct[] };
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (!payload.page || !Array.isArray(payload.products)) {
    return Response.json({ ok: false, error: "page and products[] required" }, { status: 400 });
  }

  const page = await getPageBySlug(payload.page);
  if (!page) return Response.json({ ok: false, error: "page not found" }, { status: 404 });

  await readyDb();
  const database = db();
  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const item of payload.products.slice(0, 500)) {
    if (!item.source_product_id || !item.name_bn || typeof item.price_bdt !== "number") continue;
    const existing = await database
      .prepare("SELECT id FROM products WHERE page_id = ? AND source_id = ?")
      .bind(page.id, item.source_product_id)
      .first<{ id: string }>();

    if (item.deleted) {
      if (existing) {
        await database
          .prepare("UPDATE products SET is_active = 0, deleted_at = ? WHERE id = ?")
          .bind(now, existing.id)
          .run();
        updated++;
      }
      continue;
    }

    const features = JSON.stringify(item.features_bn ?? []);
    const tags = JSON.stringify(item.tags ?? []);
    const artSeed = `${page.slug}-${item.source_product_id}`;

    if (existing) {
      await database
        .prepare(
          `UPDATE products SET name_bn = ?, category = ?, price_bdt = ?, compare_at_price_bdt = ?, stock = ?,
           offer_text = ?, features_json = ?, problem_bn = ?, solution_bn = ?, material = ?, target_audience = ?,
           tags_json = ?, image_url = ?, is_active = ?, source_updated_at = ?, synced_at = ? WHERE id = ?`,
        )
        .bind(
          item.name_bn,
          item.category ?? "অন্যান্য",
          item.price_bdt,
          item.compare_at_price_bdt ?? null,
          item.stock ?? 0,
          item.offer_text ?? null,
          features,
          item.problem_bn ?? "",
          item.solution_bn ?? "",
          item.material ?? null,
          item.target_audience ?? null,
          tags,
          item.image_url ?? null,
          item.is_active === false ? 0 : 1,
          item.updated_at ?? now,
          now,
          existing.id,
        )
        .run();
      updated++;
    } else {
      await database
        .prepare(
          `INSERT INTO products (id, page_id, source_id, name_bn, category, price_bdt, compare_at_price_bdt, stock,
           offer_text, features_json, problem_bn, solution_bn, material, target_audience, tags_json, image_url,
           art_seed, is_active, source_updated_at, synced_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id("prod"),
          page.id,
          item.source_product_id,
          item.name_bn,
          item.category ?? "অন্যান্য",
          item.price_bdt,
          item.compare_at_price_bdt ?? null,
          item.stock ?? 0,
          item.offer_text ?? null,
          features,
          item.problem_bn ?? "",
          item.solution_bn ?? "",
          item.material ?? null,
          item.target_audience ?? null,
          tags,
          item.image_url ?? null,
          artSeed,
          item.is_active === false ? 0 : 1,
          item.updated_at ?? now,
          now,
          now,
        )
        .run();
      created++;
    }
  }

  return Response.json({ ok: true, created, updated, page: page.slug });
}
