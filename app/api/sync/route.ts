import { env } from "cloudflare:workers";
import { getPageBySlug } from "@/lib/data";
import { syncUniStoreCatalog, UNISTORE_SYNC_URL } from "@/lib/sync";

/**
 * Manual/cron trigger: pull the live catalog from uniquestorebd.top into D1.
 * Body: { page: "unique-store-bd", url?: string }
 */
export async function POST(request: Request) {
  const expected = (env as unknown as Record<string, unknown>).INTERNAL_JOB_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  if (typeof expected === "string" && expected.length > 0 && authorization !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { page?: string; url?: string } = {};
  try {
    body = (await request.json()) as { page?: string; url?: string };
  } catch {
    /* empty body allowed */
  }

  const page = await getPageBySlug(body.page ?? "unique-store-bd");
  if (!page) return Response.json({ ok: false, error: "page not found" }, { status: 404 });

  const result = await syncUniStoreCatalog({ pageId: page.id, url: body.url ?? UNISTORE_SYNC_URL });
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
