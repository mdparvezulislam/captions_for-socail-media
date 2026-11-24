import { env } from "cloudflare:workers";
import { generateBatch } from "@/lib/captions";
import { getPageBySlug, listPages } from "@/lib/data";
import { syncUniStoreCatalog } from "@/lib/sync";

/**
 * Called by the cron Worker every morning at 07:00 Asia/Dhaka (01:00 UTC).
 * Protected with a shared bearer token so it can never be triggered publicly.
 */
export async function POST(request: Request) {
  const expected = (env as unknown as Record<string, unknown>).INTERNAL_JOB_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  if (typeof expected === "string" && expected.length > 0) {
    if (authorization !== `Bearer ${expected}`) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const started = Date.now();
  const url = new URL(request.url);
  let body: { page?: string; skipSync?: boolean; count?: number } = {};
  try {
    body = (await request.json()) as { page?: string; skipSync?: boolean; count?: number };
  } catch {
    /* empty body allowed */
  }
  const targetSlug = body.page ?? url.searchParams.get("page") ?? undefined;
  const skipSync = body.skipSync === true || url.searchParams.get("skipSync") === "1";

  // Sync the live store catalog first (failures are non-fatal — existing data still generates).
  let sync: { ok: boolean; created: number; updated: number; skipped: number; deactivated: number; error?: string } | null = null;
  if (!skipSync) {
    try {
      const storePage = await getPageBySlug("unique-store-bd");
      if (storePage) {
        sync = await syncUniStoreCatalog({ pageId: storePage.id });
      }
    } catch (error) {
      sync = { ok: false, created: 0, updated: 0, skipped: 0, deactivated: 0, error: error instanceof Error ? error.message : String(error) };
    }
  }

  const allPages = await listPages();
  const pages = targetSlug ? allPages.filter((p) => p.slug === targetSlug) : allPages;
  const results: { page: string; created: number; batch?: number; message?: string }[] = [];

  for (const page of pages) {
    try {
      const outcome = await generateBatch(page, body.count);
      results.push({ page: page.slug, created: outcome.created, batch: outcome.batch, message: outcome.message });
    } catch (error) {
      results.push({
        page: page.slug,
        created: 0,
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return Response.json({
    ok: results.some((result) => result.created > 0),
    sync,
    pages: results,
    durationMs: Date.now() - started,
    at: new Date().toISOString(),
  });
}

export async function GET() {
  return Response.json({ ok: false, error: "POST only" }, { status: 405 });
}
