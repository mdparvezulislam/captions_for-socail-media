import { env } from "cloudflare:workers";
import { readyDb } from "@/lib/db";

export async function GET() {
  const started = Date.now();
  let database = "down";
  let pages = 0;
  let error: string | undefined;
  try {
    const handle = await readyDb();
    const row = await handle.prepare("SELECT COUNT(*) AS n FROM pages").first<{ n: number }>();
    database = "up";
    pages = row?.n ?? 0;
  } catch (cause) {
    database = "down";
    error = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
  }
  const key = (env as unknown as Record<string, unknown>).GEMINI_API_KEY;
  return Response.json({
    ok: database === "up",
    service: "caption-engine",
    database,
    pages,
    mode: typeof key === "string" && key.length > 10 ? "live" : "demo",
    latencyMs: Date.now() - started,
    error,
    time: new Date().toISOString(),
  });
}
