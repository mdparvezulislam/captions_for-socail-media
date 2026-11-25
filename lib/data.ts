import { readyDb } from "@/lib/db";
import { scoreProduct } from "@/lib/selection";
import type {
  BatchInfo,
  BrandKit,
  Caption,
  CaptionMeta,
  CaptionStatus,
  CaptionType,
  Member,
  Page,
  Product,
  ProductEnrich,
} from "@/lib/types";

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const num = (value: unknown, fallback = 0): number => (typeof value === "number" ? value : Number(value ?? fallback) || fallback);
const nullableStr = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function mapPage(row: Row): Page {
  return {
    id: str(row.id),
    name: str(row.name),
    slug: str(row.slug),
    brandName: str(row.brand_name),
    tagline: str(row.tagline),
    voice: str(row.voice),
    ctaText: str(row.cta_text),
    hashtags: parseJson<string[]>(row.hashtags_json, []),
    dailyCount: num(row.daily_count, 5),
    repeatGapDays: num(row.repeat_gap_days, 14),
    brand: parseJson<BrandKit>(row.brand_json, {
      primary: "#1C1917",
      accent: "#E5632A",
      surface: "#FBF7F1",
      ink: "#191512",
      logoMark: "US",
      watermark: "",
      font: "anek",
      layout: "editorial",
    }),
    isActive: num(row.is_active, 1) === 1,
    createdAt: str(row.created_at),
  };
}

export function mapProduct(row: Row): Product {
  return {
    id: str(row.id),
    pageId: str(row.page_id),
    sourceId: str(row.source_id),
    nameBn: str(row.name_bn),
    category: str(row.category),
    priceBdt: num(row.price_bdt),
    compareAtPriceBdt: row.compare_at_price_bdt == null ? null : num(row.compare_at_price_bdt),
    stock: num(row.stock),
    offerText: nullableStr(row.offer_text),
    features: parseJson<string[]>(row.features_json, []),
    problemBn: str(row.problem_bn),
    solutionBn: str(row.solution_bn),
    material: nullableStr(row.material),
    targetAudience: nullableStr(row.target_audience),
    tags: parseJson<string[]>(row.tags_json, []),
    imageUrl: nullableStr(row.image_url),
    artSeed: str(row.art_seed),
    enrich: parseJson<ProductEnrich | null>(row.enrich_json, null),
    isActive: num(row.is_active, 1) === 1,
    sourceUpdatedAt: nullableStr(row.source_updated_at),
    createdAt: str(row.created_at),
  };
}

export function mapCaption(row: Row): Caption {
  return {
    id: str(row.id),
    pageId: str(row.page_id),
    productId: str(row.product_id),
    runDate: str(row.run_date),
    batch: num(row.batch, 1),
    type: str(row.type, "image") as CaptionType,
    body: str(row.body),
    hashtags: parseJson<string[]>(row.hashtags_json, []),
    meta: parseJson<CaptionMeta>(row.meta_json, {}),
    status: str(row.status, "ready") as CaptionStatus,
    model: str(row.model, "demo"),
    tokensIn: num(row.tokens_in),
    tokensOut: num(row.tokens_out),
    createdAt: str(row.created_at),
    postedAt: nullableStr(row.posted_at),
  };
}

export async function listPages(): Promise<Page[]> {
  const db = await readyDb();
  const { results } = await db
    .prepare("SELECT * FROM pages WHERE is_active = 1 ORDER BY created_at ASC, id ASC")
    .all<Row>();
  return (results ?? []).map(mapPage);
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const db = await readyDb();
  const row = await db.prepare("SELECT * FROM pages WHERE slug = ?").bind(slug).first<Row>();
  return row ? mapPage(row) : null;
}

export async function getPageById(pageId: string): Promise<Page | null> {
  const db = await readyDb();
  const row = await db.prepare("SELECT * FROM pages WHERE id = ?").bind(pageId).first<Row>();
  return row ? mapPage(row) : null;
}

export async function listProducts(
  pageId: string,
  options: { search?: string; category?: string } = {},
): Promise<Product[]> {
  const db = await readyDb();
  const clauses = ["page_id = ?", "is_active = 1"];
  const params: unknown[] = [pageId];
  if (options.search?.trim()) {
    clauses.push("(name_bn LIKE ? OR category LIKE ? OR problem_bn LIKE ?)");
    const like = `%${options.search.trim()}%`;
    params.push(like, like, like);
  }
  if (options.category && options.category !== "all") {
    clauses.push("category = ?");
    params.push(options.category);
  }
  const { results } = await db
    .prepare(`SELECT * FROM products WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC`)
    .bind(...params)
    .all<Row>();
  return (results ?? []).map(mapProduct);
}

export async function getProduct(productId: string): Promise<Product | null> {
  const db = await readyDb();
  const row = await db.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first<Row>();
  return row ? mapProduct(row) : null;
}

export async function listCategories(pageId: string): Promise<string[]> {
  const db = await readyDb();
  const { results } = await db
    .prepare("SELECT DISTINCT category FROM products WHERE page_id = ? AND is_active = 1 ORDER BY category")
    .bind(pageId)
    .all<{ category: string }>();
  return (results ?? []).map((row) => row.category);
}

/** productId -> most recent run_date it was used */
export async function getLastUsed(pageId: string): Promise<Map<string, string>> {
  const db = await readyDb();
  const { results } = await db
    .prepare("SELECT product_id, MAX(run_date) AS last_date FROM captions WHERE page_id = ? GROUP BY product_id")
    .bind(pageId)
    .all<{ product_id: string; last_date: string }>();
  const map = new Map<string, string>();
  for (const row of results ?? []) {
    if (row.last_date) map.set(row.product_id, row.last_date);
  }
  return map;
}

export async function getUsedToday(pageId: string, date: string): Promise<Set<string>> {
  const db = await readyDb();
  const { results } = await db
    .prepare("SELECT DISTINCT product_id FROM captions WHERE page_id = ? AND run_date = ?")
    .bind(pageId, date)
    .all<{ product_id: string }>();
  return new Set((results ?? []).map((row) => row.product_id));
}

export async function getTodayCaptions(pageId: string, date: string): Promise<{ captions: Caption[]; products: Product[] }> {
  const db = await readyDb();
  const [{ results: captionRows }, { results: productRows }] = await Promise.all([
    db
      .prepare(
        `SELECT * FROM captions WHERE page_id = ? AND run_date = ?
         ORDER BY batch ASC, position ASC,
         CASE type WHEN 'image' THEN 1 WHEN 'video' THEN 2 ELSE 3 END ASC`,
      )
      .bind(pageId, date)
      .all<Row>(),
    db.prepare("SELECT * FROM products WHERE page_id = ?").bind(pageId).all<Row>(),
  ]);
  return {
    captions: (captionRows ?? []).map(mapCaption),
    products: (productRows ?? []).map(mapProduct),
  };
}

export async function listBatches(pageId: string, date: string): Promise<BatchInfo[]> {
  const db = await readyDb();
  const { results } = await db
    .prepare(
      `SELECT batch, MIN(created_at) AS created_at, COUNT(*) AS count,
              SUM(CASE WHEN status IN ('posted','edited','ready') THEN 1 ELSE 0 END) AS ready
       FROM captions WHERE page_id = ? AND run_date = ?
       GROUP BY batch ORDER BY batch ASC`,
    )
    .bind(pageId, date)
    .all<{ batch: number; created_at: string; count: number; ready: number }>();
  return (results ?? []).map((row) => ({
    id: `${pageId}-${date}-${row.batch}`,
    batch: row.batch,
    createdAt: row.created_at,
    count: num(row.count),
    ready: num(row.ready),
  }));
}

export async function getCaption(captionId: string): Promise<Caption | null> {
  const db = await readyDb();
  const row = await db.prepare("SELECT * FROM captions WHERE id = ?").bind(captionId).first<Row>();
  return row ? mapCaption(row) : null;
}

export async function listCaptions(options: {
  pageId?: string;
  search?: string;
  type?: CaptionType | "all";
  status?: CaptionStatus | "all";
  limit?: number;
  offset?: number;
}): Promise<{ items: Caption[]; products: Map<string, Product> }> {
  const db = await readyDb();
  const clauses: string[] = ["1 = 1"];
  const params: unknown[] = [];
  if (options.pageId && options.pageId !== "all") {
    clauses.push("c.page_id = ?");
    params.push(options.pageId);
  }
  if (options.type && options.type !== "all") {
    clauses.push("c.type = ?");
    params.push(options.type);
  }
  if (options.status && options.status !== "all") {
    clauses.push("c.status = ?");
    params.push(options.status);
  }
  if (options.search?.trim()) {
    clauses.push("(c.body LIKE ? OR p.name_bn LIKE ?)");
    const like = `%${options.search.trim()}%`;
    params.push(like, like);
  }
  const limit = Math.min(options.limit ?? 40, 100);
  const offset = options.offset ?? 0;
  const { results } = await db
    .prepare(
      `SELECT c.* FROM captions c JOIN products p ON p.id = c.product_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY c.run_date DESC, c.batch DESC, c.created_at DESC LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all<Row>();
  const items = (results ?? []).map(mapCaption);
  const productIds = Array.from(new Set(items.map((caption) => caption.productId)));
  const products = new Map<string, Product>();
  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const { results: productRows } = await db
      .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
      .bind(...productIds)
      .all<Row>();
    for (const row of productRows ?? []) {
      const product = mapProduct(row);
      products.set(product.id, product);
    }
  }
  return { items, products };
}

export async function listMembers(): Promise<Member[]> {
  const db = await readyDb();
  const { results } = await db
    .prepare("SELECT * FROM members ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, name")
    .all<Row>();
  return (results ?? []).map((row) => ({
    id: str(row.id),
    name: str(row.name),
    email: str(row.email),
    role: str(row.role, "moderator") as Member["role"],
    pageIds: parseJson<string[]>(row.page_ids_json, []),
    lastActiveAt: nullableStr(row.last_active_at),
  }));
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const db = await readyDb();
  const row = await db.prepare("SELECT * FROM members WHERE email = ?").bind(email).first<Row>();
  if (!row) return null;
  return {
    id: str(row.id),
    name: str(row.name),
    email: str(row.email),
    role: str(row.role, "moderator") as Member["role"],
    pageIds: parseJson<string[]>(row.page_ids_json, []),
    lastActiveAt: nullableStr(row.last_active_at),
  };
}

export interface PageStats {
  products: number;
  captionsToday: number;
  postedToday: number;
  fresh: number;
}

export async function getPageStats(pageId: string, date: string): Promise<PageStats> {
  const db = await readyDb();
  const [products, today, fresh] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM products WHERE page_id = ? AND is_active = 1").bind(pageId).first<{ n: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS n, SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) AS posted
         FROM captions WHERE page_id = ? AND run_date = ?`,
      )
      .bind(pageId, date)
      .first<{ n: number; posted: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM products p WHERE p.page_id = ? AND p.is_active = 1 AND p.stock > 0
         AND NOT EXISTS (SELECT 1 FROM captions c WHERE c.page_id = p.page_id AND c.product_id = p.id
                         AND c.run_date > date(?, '-14 day'))`,
      )
      .bind(pageId, date)
      .first<{ n: number }>(),
  ]);
  return {
    products: num(products?.n),
    captionsToday: num(today?.n),
    postedToday: num(today?.posted),
    fresh: num(fresh?.n),
  };
}

export async function getGeneratingState(pageId: string, date: string): Promise<number> {
  const db = await readyDb();
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM generation_logs WHERE page_id = ? AND status = 'running' AND created_at > ?")
    .bind(pageId, new Date(Date.now() - 3 * 60_000).toISOString())
    .first<{ n: number }>();
  return num(row?.n);
}

export interface TaskProduct {
  product: Product;
  percent: number;
  hasCaptionsToday: boolean;
  types: CaptionType[];
  lastUsedDate: string | null;
  recent: boolean;
}

/** Full catalogue with persistent caption status + selection score — the moderator task grid. */
export async function listTaskProducts(pageId: string, date: string): Promise<TaskProduct[]> {
  const db = await readyDb();
  const [productResponse, savedResponse, lastResponse] = await Promise.all([
    db
      .prepare("SELECT * FROM products WHERE page_id = ? AND is_active = 1")
      .bind(pageId)
      .all<Row>(),
    // Always load saved caption types across dates so generated captions never vanish after midnight or across devices.
    db
      .prepare("SELECT DISTINCT product_id, type FROM captions WHERE page_id = ?")
      .bind(pageId)
      .all<{ product_id: string; type: string }>(),
    db
      .prepare("SELECT product_id, MAX(run_date) AS last_date FROM captions WHERE page_id = ? GROUP BY product_id")
      .bind(pageId)
      .all<{ product_id: string; last_date: string }>(),
  ]);

  const typesByProduct = new Map<string, CaptionType[]>();
  for (const row of savedResponse.results ?? []) {
    const list = typesByProduct.get(row.product_id) ?? [];
    if (
      (row.type === "image" || row.type === "video" || row.type === "problem") &&
      !list.includes(row.type)
    ) {
      list.push(row.type);
    }
    typesByProduct.set(row.product_id, list);
  }
  const lastUsed = new Map<string, string>();
  for (const row of lastResponse.results ?? []) {
    if (row.last_date) lastUsed.set(row.product_id, row.last_date);
  }

  const products = (productResponse.results ?? []).map(mapProduct);
  const tasks: TaskProduct[] = products.map((product) => {
    const scored = scoreProduct(product, lastUsed.get(product.id) ?? null, date);
    const lastUsedDate = lastUsed.get(product.id) ?? null;
    const recent = lastUsedDate
      ? (new Date(`${date}T00:00:00Z`).getTime() - new Date(`${lastUsedDate}T00:00:00Z`).getTime()) / 864e5 <= 7
      : false;
    const savedTypes = typesByProduct.get(product.id) ?? [];
    return {
      product,
      percent: Math.round(scored.score * 100),
      hasCaptionsToday: savedTypes.length > 0,
      types: savedTypes,
      lastUsedDate,
      recent,
    };
  });

  // বাকি আগে → স্কোর desc → ডিটারমিনিস্টিক টাই-ব্রেক
  tasks.sort((a, b) => {
    if (a.hasCaptionsToday !== b.hasCaptionsToday) return a.hasCaptionsToday ? 1 : -1;
    if (b.percent !== a.percent) return b.percent - a.percent;
    return a.product.id.localeCompare(b.product.id);
  });
  return tasks;
}

export interface StudioData {
  product: Product;
  page: Page;
  captions: Caption[];
  whatsapp: string | null;
  /** captions কোথা থেকে এসেছে: আজকের ব্যাচ নাকি রেডি লাইব্রেরি */
  source: "daily" | "library";
  position: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
  percent: number;
  lastUsedDate: string | null;
}

/**
 * Everything the instant caption studio drawer needs, in one read.
 * Always returns the latest saved caption per type (image, video, problem) from D1
 * so generated captions persist across midnight, page reloads, and other devices.
 */
export async function getStudioData(productId: string, date: string): Promise<StudioData | null> {
  const product = await getProduct(productId);
  if (!product) return null;
  const [page, tasks, captionRows] = await Promise.all([
    getPageById(product.pageId),
    listTaskProducts(product.pageId, date),
    (async () => {
      const db = await readyDb();
      const { results } = await db
        .prepare(
          `SELECT * FROM captions WHERE product_id = ?
           ORDER BY created_at DESC, run_date DESC, batch DESC`,
        )
        .bind(productId)
        .all<Row>();
      const latestByType = new Map<CaptionType, Caption>();
      for (const row of results ?? []) {
        const mapped = mapCaption(row);
        if (!latestByType.has(mapped.type)) {
          latestByType.set(mapped.type, mapped);
        }
      }
      return (["image", "video", "problem"] as CaptionType[])
        .map((type) => latestByType.get(type))
        .filter((item): item is Caption => Boolean(item));
    })(),
  ]);
  if (!page) return null;

  let captions = captionRows;
  let source: "daily" | "library" = "daily";
  if (captions.length === 0) {
    const { results: libraryRows } = await (async () => {
      const database = await readyDb();
      return database
        .prepare("SELECT * FROM caption_library WHERE page_id = ? AND product_id = ?")
        .bind(page.id, productId)
        .all<Row>();
    })();
    if ((libraryRows ?? []).length > 0) {
      captions = (libraryRows ?? []).map((row) =>
        mapCaption({ ...row, run_date: date, batch: 0, status: "ready" }),
      );
      source = "library";
    }
  }

  let whatsapp: string | null = null;
  try {
    const database = await readyDb();
    const message = await database
      .prepare("SELECT body FROM product_messages WHERE page_id = ? AND product_id = ? AND kind = 'whatsapp'")
      .bind(page.id, productId)
      .first<{ body: string }>();
    whatsapp = message?.body ?? null;
  } catch {
    whatsapp = null;
  }

  const index = tasks.findIndex((task) => task.product.id === productId);
  const prevTask = index > 0 ? tasks[index - 1] : null;
  const nextTask = index >= 0 && index < tasks.length - 1 ? tasks[index + 1] : null;
  const task = tasks[index];
  return {
    product,
    page,
    captions,
    whatsapp,
    source,
    position: index + 1,
    total: tasks.length,
    prevId: prevTask?.product.id ?? null,
    nextId: nextTask?.product.id ?? null,
    percent: task?.percent ?? 0,
    lastUsedDate: task?.lastUsedDate ?? null,
  };
}

export interface SearchResult {
  id: string;
  name: string;
  price: number;
  pageName: string;
  pageSlug: string;
  category: string;
}

export async function searchProducts(query: string, limit = 8): Promise<SearchResult[]> {
  const db = await readyDb();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const like = `%${trimmed}%`;
  const { results } = await db
    .prepare(
      `SELECT p.id, p.name_bn, p.price_bdt, p.category, pg.name AS page_name, pg.slug AS page_slug
       FROM products p JOIN pages pg ON pg.id = p.page_id
       WHERE p.is_active = 1 AND (p.name_bn LIKE ? OR p.category LIKE ? OR p.problem_bn LIKE ? OR p.source_id LIKE ?)
       ORDER BY p.name_bn LIMIT ?`,
    )
    .bind(like, like, like, like, limit)
    .all<Row>();
  return (results ?? []).map((row) => ({
    id: str(row.id),
    name: str(row.name_bn),
    price: num(row.price_bdt),
    pageName: str(row.page_name),
    pageSlug: str(row.page_slug),
    category: str(row.category),
  }));
}

export async function listProductCaptions(productId: string, limit = 30): Promise<Caption[]> {
  const db = await readyDb();
  const { results } = await db
    .prepare("SELECT * FROM captions WHERE product_id = ? ORDER BY run_date DESC, created_at DESC LIMIT ?")
    .bind(productId, limit)
    .all<Row>();
  return (results ?? []).map(mapCaption);
}

export async function getProductLastUsed(productId: string): Promise<string | null> {
  const db = await readyDb();
  const row = await db
    .prepare("SELECT MAX(run_date) AS last_date FROM captions WHERE product_id = ?")
    .bind(productId)
    .first<{ last_date: string | null }>();
  return row?.last_date ?? null;
}

export async function getCaptionCounts(pageId: string): Promise<{ total: number; posted: number; month: number }> {
  const db = await readyDb();
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) AS posted,
              SUM(CASE WHEN run_date >= ? THEN 1 ELSE 0 END) AS month
       FROM captions WHERE page_id = ?`,
    )
    .bind(new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), pageId)
    .first<{ total: number; posted: number; month: number }>();
  return { total: num(row?.total), posted: num(row?.posted), month: num(row?.month) };
}
