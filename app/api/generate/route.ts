import { env } from "cloudflare:workers";
import { ensureProductCaptions } from "@/lib/captions";
import { getPageById, getProduct, listProducts } from "@/lib/data";

/**
 * অ্যাডমিন/অপারেশনাল জেনারেশন:
 *   { "productId": "prod_x" }            → একটা প্রোডাক্ট
 *   { "page": "unique-store-bd", "limit": 5, "onlyNew": true } → ব্যাচ
 */
export async function POST(request: Request) {
  const expected = (env as unknown as Record<string, unknown>).INTERNAL_JOB_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  if (typeof expected === "string" && expected.length > 0 && authorization !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { productId?: string; page?: string; limit?: number; onlyNew?: boolean; force?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const started = Date.now();

  if (body.productId) {
    const product = await getProduct(body.productId);
    if (!product) return Response.json({ ok: false, error: "product not found" }, { status: 404 });
    const page = await getPageById(product.pageId);
    if (!page) return Response.json({ ok: false, error: "page not found" }, { status: 404 });
    const captions = await ensureProductCaptions(page, product, { force: body.force === true });
    return Response.json({
      ok: true,
      product: product.nameBn,
      captions: captions.map((caption) => ({
        type: caption.type,
        body: caption.body,
        model: caption.model,
        hashtags: caption.hashtags,
        keyword: caption.meta.keyword,
      })),
      durationMs: Date.now() - started,
    });
  }

  const pageSlug = body.page ?? "unique-store-bd";
  const { getPageBySlug } = await import("@/lib/data");
  const page = await getPageBySlug(pageSlug);
  if (!page) return Response.json({ ok: false, error: "page not found" }, { status: 404 });

  const limit = Math.max(1, Math.min(body.limit ?? 3, 10));
  const products = await listProducts(page.id);
  const target = products.slice(0, limit);
  const results: { product: string; types: string[]; models: string[] }[] = [];

  for (const product of target) {
    const captions = await ensureProductCaptions(page, product, { force: body.force === true });
    results.push({
      product: product.nameBn,
      types: captions.map((caption) => caption.type),
      models: Array.from(new Set(captions.map((caption) => caption.model))),
    });
  }

  return Response.json({ ok: true, page: page.slug, generated: results, durationMs: Date.now() - started });
}
