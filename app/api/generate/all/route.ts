import { generatePoolForProduct } from "@/lib/captions";
import { canRunOps } from "@/lib/ops-auth";
import { getPageBySlug, listProducts } from "@/lib/data";

/**
 * সব প্রোডাক্টের ক্যাপশন একে একে তৈরি করে লাইব্রেরিতে জমা রাখে।
 * প্রতি রিকোয়েস্টে `limit` টি প্রোডাক্ট — ক্লায়েন্ট/ক্রন cursor ধরে লুপ চালায়।
 *   { "page":"unique-store-bd", "cursor":0, "limit":2, "force":false }
 */
export async function POST(request: Request) {
  if (!(await canRunOps(request))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { page?: string; cursor?: number; limit?: number; force?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* empty body ok */
  }

  const page = await getPageBySlug(body.page ?? "unique-store-bd");
  if (!page) return Response.json({ ok: false, error: "page not found" }, { status: 404 });

  const products = await listProducts(page.id);
  const cursor = Math.max(0, Math.min(body.cursor ?? 0, products.length));
  const limit = Math.max(1, Math.min(body.limit ?? 2, 4));
  const slice = products.slice(cursor, cursor + limit);

  const started = Date.now();
  const processed: {
    productId: string;
    product: string;
    captions: number;
    whatsapp: boolean;
    generated: boolean;
    model?: string;
  }[] = [];

  for (const product of slice) {
    try {
      const result = await generatePoolForProduct(page, product, { force: body.force === true });
      processed.push({
        productId: product.id,
        product: product.nameBn,
        captions: result.captions.length,
        whatsapp: Boolean(result.whatsapp),
        generated: result.generated,
        model: result.captions[0]?.model,
      });
    } catch (error) {
      processed.push({
        productId: product.id,
        product: product.nameBn,
        captions: 0,
        whatsapp: false,
        generated: false,
        model: error instanceof Error ? error.message.slice(0, 80) : "error",
      });
    }
  }

  const nextCursor = cursor + slice.length;
  return Response.json({
    ok: true,
    page: page.slug,
    total: products.length,
    cursor,
    nextCursor: nextCursor < products.length ? nextCursor : null,
    remaining: Math.max(0, products.length - nextCursor),
    done: nextCursor >= products.length,
    processed,
    durationMs: Date.now() - started,
  });
}
