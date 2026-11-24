import { env } from "cloudflare:workers";
import { generateBatch } from "@/lib/captions";
import { listPages } from "@/lib/data";

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
  const pages = await listPages();
  const results: { page: string; created: number; batch?: number; message?: string }[] = [];

  for (const page of pages) {
    try {
      const outcome = await generateBatch(page);
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
    pages: results,
    durationMs: Date.now() - started,
    at: new Date().toISOString(),
  });
}

export async function GET() {
  return Response.json({ ok: false, error: "POST only" }, { status: 405 });
}
