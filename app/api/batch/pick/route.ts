import { getPageBySlug } from "@/lib/data";
import { pickBatchProducts } from "@/lib/captions";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Fast D1-only selection endpoint (<100ms) used by the Today page 5-product batch button.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, error: "লগইন প্রয়োজন" }, { status: 401 });
  }

  let body: { pageSlug?: string; count?: number } = {};
  try {
    body = (await request.json()) as { pageSlug?: string; count?: number };
  } catch {
    return Response.json({ ok: false, error: "অবৈধ রিকোয়েস্ট" }, { status: 400 });
  }

  const page = await getPageBySlug(body.pageSlug ?? "unique-store-bd");
  if (!page) {
    return Response.json({ ok: false, error: "পেজ পাওয়া যায়নি" }, { status: 404 });
  }

  try {
    const picked = await pickBatchProducts(page, body.count);
    return Response.json(picked, { status: picked.ok ? 200 : 200 });
  } catch (error) {
    return Response.json(
      { ok: false, products: [], message: error instanceof Error ? error.message : "প্রোডাক্ট বাছাই ব্যর্থ" },
      { status: 500 },
    );
  }
}
