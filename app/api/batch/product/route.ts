import { getPageById, getProduct } from "@/lib/data";
import { ensureProductCaptions } from "@/lib/captions";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Single-product Gemini AI caption generator endpoint returning lightweight JSON
 * (avoids heavy RSC Server Action page re-renders during 5-product progressive batching).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "লগইন প্রয়োজন" }, { status: 401 });
  }

  let body: {
    productId?: string;
    force?: boolean;
    batch?: number;
    position?: number;
    runId?: string;
    score?: number;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "অবৈধ রিকোয়েস্ট" }, { status: 400 });
  }

  if (!body.productId) {
    return Response.json({ ok: false, error: "productId প্রয়োজন" }, { status: 400 });
  }

  const product = await getProduct(body.productId);
  if (!product) {
    return Response.json({ ok: false, error: "প্রোডাক্ট পাওয়া যায়নি" }, { status: 404 });
  }

  const page = await getPageById(product.pageId);
  if (!page) {
    return Response.json({ ok: false, error: "পেজ পাওয়া যায়নি" }, { status: 404 });
  }

  try {
    const captions = await ensureProductCaptions(page, product, {
      force: Boolean(body.force),
      batch: body.batch,
      position: body.position,
      runId: body.runId,
      score: body.score,
    });
    return Response.json({
      ok: true,
      created: captions.length,
      model: captions[0]?.model ?? "gemini",
      productId: product.id,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "জেনারেশন ব্যর্থ",
        productId: product.id,
      },
      { status: 502 },
    );
  }
}
