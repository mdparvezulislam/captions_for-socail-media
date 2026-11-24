import { env } from "cloudflare:workers";
import { db, id, readyDb } from "@/lib/db";
import { dhakaDate } from "@/lib/format";
import { getLastUsed, getUsedToday, listProducts, mapCaption } from "@/lib/data";
import { pickTopProducts } from "@/lib/selection";
import { generateCaptionDrafts, type CaptionDraft } from "@/lib/ai/generate";
import type { Caption, CaptionMeta, CaptionType, Page, Product } from "@/lib/types";

type Row = Record<string, unknown>;
const str = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

function apiKey(): string | undefined {
  const key = (env as unknown as Record<string, unknown>).GEMINI_API_KEY;
  return typeof key === "string" && key.trim().length > 10 ? key.trim() : undefined;
}

export function isLiveAiAvailable(): boolean {
  return Boolean(apiKey());
}

function modelName(): string {
  const model = (env as unknown as Record<string, unknown>).GEMINI_MODEL;
  return typeof model === "string" && model.trim() ? model.trim() : "gemini-3.8-flash";
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function logGeneration(input: {
  pageId: string;
  productId?: string;
  stage: string;
  status: string;
  error?: string;
  latencyMs?: number;
  model?: string;
  tokens?: number;
}): Promise<void> {
  const database = await readyDb();
  await database
    .prepare(
      `INSERT INTO generation_logs (id, page_id, product_id, stage, status, error, latency_ms, model, tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id("log"),
      input.pageId,
      input.productId ?? null,
      input.stage,
      input.status,
      input.error ?? null,
      input.latencyMs ?? 0,
      input.model ?? null,
      input.tokens ?? 0,
      new Date().toISOString(),
    )
    .run();
}

async function persistDrafts(input: {
  page: Page;
  product: Product;
  date: string;
  batch: number;
  position: number;
  drafts: CaptionDraft[];
  model: string;
  tokensIn: number;
  tokensOut: number;
}): Promise<Caption[]> {
  const database = await readyDb();
  const statements = input.drafts.map((draft) =>
    database
      .prepare(
        `INSERT INTO captions
         (id, page_id, product_id, run_date, batch, position, type, body, hashtags_json, meta_json, status, model,
          tokens_in, tokens_out, similarity, created_at, posted_at, posted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?, 0, ?, NULL, NULL)
         ON CONFLICT(page_id, product_id, run_date, type) DO UPDATE SET
           body = excluded.body,
           hashtags_json = excluded.hashtags_json,
           meta_json = excluded.meta_json,
           model = excluded.model,
           tokens_in = excluded.tokens_in,
           tokens_out = excluded.tokens_out,
           status = CASE WHEN captions.status = 'posted' THEN 'posted' ELSE 'ready' END`,
      )
      .bind(
        id("cap"),
        input.page.id,
        input.product.id,
        input.date,
        input.batch,
        input.position,
        draft.type,
        draft.body,
        JSON.stringify(draft.hashtags),
        JSON.stringify(draft.meta),
        input.model,
        input.tokensIn,
        input.tokensOut,
        new Date().toISOString(),
      ),
  );
  await database.batch(statements);

  const { results } = await database
    .prepare("SELECT * FROM captions WHERE page_id = ? AND product_id = ? AND run_date = ?")
    .bind(input.page.id, input.product.id, input.date)
    .all<Row>();
  return (results ?? []).map(mapCaption);
}

export interface BatchOutcome {
  ok: boolean;
  created: number;
  batch?: number;
  relaxed?: boolean;
  message?: string;
  productNames: string[];
}

export interface PickedBatch {
  ok: boolean;
  batch?: number;
  runId?: string;
  relaxed?: boolean;
  products: { id: string; nameBn: string; score: number }[];
  message?: string;
}

/**
 * Fast D1-only selection step (<100ms): picks today's top N priority products
 * without calling Gemini so the UI can generate them progressively 1-by-1
 * with live progress and zero Cloudflare Worker request timeout.
 */
export async function pickBatchProducts(page: Page, size?: number): Promise<PickedBatch> {
  const database = await readyDb();
  const date = dhakaDate();
  const count = Math.max(1, Math.min(size ?? page.dailyCount, 10));

  const [products, lastUsed, usedToday] = await Promise.all([
    listProducts(page.id),
    getLastUsed(page.id),
    getUsedToday(page.id, date),
  ]);

  if (products.length === 0) {
    return { ok: false, products: [], message: "এই পেজে কোনো প্রোডাক্ট নেই। আগে প্রোডাক্ট সিঙ্ক করুন।" };
  }

  const selection = pickTopProducts({
    products,
    lastUsed,
    usedToday,
    today: date,
    count,
    gapDays: page.repeatGapDays,
    seed: `${page.id}:${date}`,
  });

  if (selection.picked.length === 0) {
    return {
      ok: false,
      products: [],
      message: "আজ এই পেজের সব প্রোডাক্ট ব্যবহার হয়ে গেছে — নতুন প্রোডাক্ট যোগ করুন বা কাল আবার দেখুন।",
    };
  }

  const batchRow = await database
    .prepare("SELECT MAX(batch) AS max_batch FROM selection_runs WHERE page_id = ? AND run_date = ?")
    .bind(page.id, date)
    .first<{ max_batch: number | null }>();
  const batch = Math.max(0, Number(batchRow?.max_batch ?? 0)) + 1;
  const runId = id("run");

  await database
    .prepare("INSERT INTO selection_runs (id, page_id, run_date, batch, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(runId, page.id, date, batch, `${page.id}:${date}:${batch}`, new Date().toISOString())
    .run();

  return {
    ok: true,
    batch,
    runId,
    relaxed: selection.relaxed,
    products: selection.picked.map((item) => ({
      id: item.product.id,
      nameBn: item.product.nameBn,
      score: item.score,
    })),
  };
}

export async function generateBatch(page: Page, size?: number): Promise<BatchOutcome> {
  const database = await readyDb();
  const date = dhakaDate();
  const count = Math.max(1, Math.min(size ?? page.dailyCount, 10));

  const [products, lastUsed, usedToday] = await Promise.all([
    listProducts(page.id),
    getLastUsed(page.id),
    getUsedToday(page.id, date),
  ]);

  if (products.length === 0) {
    return { ok: false, created: 0, message: "এই পেজে কোনো প্রোডাক্ট নেই। আগে প্রোডাক্ট সিঙ্ক করুন।", productNames: [] };
  }

  const selection = pickTopProducts({
    products,
    lastUsed,
    usedToday,
    today: date,
    count,
    gapDays: page.repeatGapDays,
    seed: `${page.id}:${date}`,
  });

  if (selection.picked.length === 0) {
    return {
      ok: false,
      created: 0,
      message: "আজ এই পেজের সব প্রোডাক্ট ব্যবহার হয়ে গেছে — নতুন প্রোডাক্ট যোগ করুন বা কাল আবার দেখুন।",
      productNames: [],
    };
  }

  const batchRow = await database
    .prepare("SELECT MAX(batch) AS max_batch FROM selection_runs WHERE page_id = ? AND run_date = ?")
    .bind(page.id, date)
    .first<{ max_batch: number | null }>();
  const batch = Math.max(0, Number(batchRow?.max_batch ?? 0)) + 1;
  const runId = id("run");

  await database
    .prepare("INSERT INTO selection_runs (id, page_id, run_date, batch, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(runId, page.id, date, batch, `${page.id}:${date}:${batch}`, new Date().toISOString())
    .run();

  const avoid = await recentBodies(page.id);
  let created = 0;
  let lastErrorMsg = "";
  const failures: string[] = [];

  // Run sequentially (concurrency 1) to avoid Gemini free-tier burst 503 contention.
  await mapLimit(selection.picked, 1, async (item, index) => {
    const started = Date.now();
    try {
      const outcome = await generateCaptionDrafts({
        page,
        product: item.product,
        avoid,
        apiKey: apiKey(),
        model: modelName(),
      });
      await persistDrafts({
        page,
        product: item.product,
        date,
        batch,
        position: index,
        drafts: outcome.drafts,
        model: outcome.model,
        tokensIn: outcome.tokensIn,
        tokensOut: outcome.tokensOut,
      });
      await database
        .prepare("INSERT OR IGNORE INTO daily_selections (run_id, product_id, position, score, pinned) VALUES (?, ?, ?, ?, 0)")
        .bind(runId, item.product.id, index, item.score)
        .run();
      created += 3;
      await logGeneration({
        pageId: page.id,
        productId: item.product.id,
        stage: "batch",
        status: outcome.source === "demo" ? "demo" : "ok",
        latencyMs: outcome.latencyMs,
        model: outcome.model,
        tokens: outcome.tokensIn + outcome.tokensOut,
      });
    } catch (error) {
      const errText = error instanceof Error ? error.message : String(error);
      lastErrorMsg = errText;
      failures.push(item.product.nameBn);
      await logGeneration({
        pageId: page.id,
        productId: item.product.id,
        stage: "batch",
        status: "failed",
        error: errText,
        latencyMs: Date.now() - started,
      });
    }
  });

  const quotaHit = /429|quota/i.test(lastErrorMsg);
  const highDemand = /503|high demand|UNAVAILABLE/i.test(lastErrorMsg);

  return {
    ok: created > 0,
    created,
    batch,
    relaxed: selection.relaxed,
    productNames: selection.picked.map((item) => item.product.nameBn),
    message:
      created === 0
        ? quotaHit
          ? "Gemini API-র দৈনিক ফ্রি কোটা শেষ হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন বা AI Studio-তে বিলিং চালু করুন।"
          : highDemand
            ? "Gemini সার্ভারে সাময়িক চাপ বেশি (503) — কয়েক সেকেন্ড পর আবার ক্লিক করুন।"
            : "জেনারেশন ব্যর্থ হয়েছে, একটু পরে আবার চেষ্টা করুন।"
        : selection.relaxed
          ? "নতুন প্রোডাক্ট কম, তাই কিছু পুরনো প্রোডাক্ট আনা হয়েছে।"
          : failures.length > 0
            ? `${failures.length}টি প্রোডাক্টে সমস্যা হয়েছে, বাকিগুলো তৈরি সম্পন্ন।`
            : undefined,
  };
}

export async function ensureProductCaptions(
  page: Page,
  product: Product,
  options: { batch?: number; position?: number; runId?: string; score?: number; force?: boolean } = {},
): Promise<Caption[]> {
  const database = await readyDb();
  const date = dhakaDate();

  if (!options.force) {
    const existing = await database
      .prepare("SELECT * FROM captions WHERE page_id = ? AND product_id = ? AND run_date = ?")
      .bind(page.id, product.id, date)
      .all<Row>();

    if ((existing.results ?? []).length >= 3) {
      return (existing.results ?? []).map(mapCaption);
    }
  }

  const started = Date.now();
  const outcome = await generateCaptionDrafts({
    page,
    product,
    avoid: await recentBodies(page.id),
    apiKey: apiKey(),
    model: modelName(),
  });

  const captions = await persistDrafts({
    page,
    product,
    date,
    batch: options.batch ?? 0,
    position: options.position ?? 0,
    drafts: outcome.drafts,
    model: outcome.model,
    tokensIn: outcome.tokensIn,
    tokensOut: outcome.tokensOut,
  });

  if (options.runId) {
    await database
      .prepare("INSERT OR IGNORE INTO daily_selections (run_id, product_id, position, score, pinned) VALUES (?, ?, ?, ?, 0)")
      .bind(options.runId, product.id, options.position ?? 0, options.score ?? 0)
      .run();
  }

  await logGeneration({
    pageId: page.id,
    productId: product.id,
    stage: options.runId ? "batch" : "on-demand",
    status: outcome.source === "demo" ? "demo" : "ok",
    latencyMs: outcome.latencyMs ?? Date.now() - started,
    model: outcome.model,
    tokens: outcome.tokensIn + outcome.tokensOut,
  });

  return captions;
}

export async function regenerateOne(caption: Caption, instruction?: string): Promise<Caption | null> {
  const database = await readyDb();
  const pageRow = await database.prepare("SELECT * FROM pages WHERE id = ?").bind(caption.pageId).first<Row>();
  const productRow = await database.prepare("SELECT * FROM products WHERE id = ?").bind(caption.productId).first<Row>();
  if (!pageRow || !productRow) return null;

  const { mapPage, mapProduct } = await import("@/lib/data");
  const page = mapPage(pageRow);
  const product = mapProduct(productRow);

  const outcome = await generateCaptionDrafts({
    page,
    product,
    avoid: [...(await recentBodies(page.id, 12)), caption.body],
    apiKey: apiKey(),
    model: modelName(),
    instruction,
    type: caption.type,
  });

  const draft = outcome.drafts.find((item) => item.type === caption.type) ?? outcome.drafts[0];
  const meta: CaptionMeta = { ...draft.meta, poster: draft.meta.poster };

  await database
    .prepare(
      `UPDATE captions SET body = ?, hashtags_json = ?, meta_json = ?, model = ?, tokens_in = ?, tokens_out = ?,
       status = CASE WHEN status = 'posted' THEN 'posted' ELSE 'ready' END WHERE id = ?`,
    )
    .bind(
      draft.body,
      JSON.stringify(draft.hashtags),
      JSON.stringify(meta),
      outcome.model,
      outcome.tokensIn,
      outcome.tokensOut,
      caption.id,
    )
    .run();

  await logGeneration({
    pageId: page.id,
    productId: product.id,
    stage: "regenerate",
    status: outcome.source === "demo" ? "demo" : "ok",
    latencyMs: outcome.latencyMs,
    model: outcome.model,
    tokens: outcome.tokensIn + outcome.tokensOut,
  });

  const row = await database.prepare("SELECT * FROM captions WHERE id = ?").bind(caption.id).first<Row>();
  return row ? mapCaption(row) : null;
}

export async function recentBodies(pageId: string, limit = 8): Promise<string[]> {
  const database = await readyDb();
  const { results } = await database
    .prepare("SELECT body FROM captions WHERE page_id = ? ORDER BY created_at DESC LIMIT ?")
    .bind(pageId, limit)
    .all<{ body: string }>();
  return (results ?? []).map((row) => str(row.body)).filter(Boolean);
}

export async function markPosted(captionId: string, posted: boolean, actor: string): Promise<void> {
  const database = await readyDb();
  await database
    .prepare("UPDATE captions SET status = ?, posted_at = ?, posted_by = ? WHERE id = ?")
    .bind(posted ? "posted" : "ready", posted ? new Date().toISOString() : null, posted ? actor : null, captionId)
    .run();
}

export async function saveBody(captionId: string, body: string): Promise<void> {
  const database = await readyDb();
  await database
    .prepare("UPDATE captions SET body = ?, status = CASE WHEN status = 'posted' THEN 'posted' ELSE 'edited' END WHERE id = ?")
    .bind(body, captionId)
    .run();
}

export function captionTypeLabel(type: CaptionType): string {
  return type === "image" ? "ইমেজ" : type === "video" ? "ভিডিও" : "সমস্যা-সমাধান";
}

export function databaseHandle(): D1Database {
  return db();
}
