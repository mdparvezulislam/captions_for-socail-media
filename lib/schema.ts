/**
 * D1 schema. Applied idempotently on first request (see lib/db.ts).
 * Keep statements additive — never drop columns in production.
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    brand_name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    voice TEXT NOT NULL DEFAULT '',
    cta_text TEXT NOT NULL DEFAULT 'অর্ডার করতে ইনবক্স করুন',
    hashtags_json TEXT NOT NULL DEFAULT '[]',
    daily_count INTEGER NOT NULL DEFAULT 5,
    repeat_gap_days INTEGER NOT NULL DEFAULT 14,
    brand_json TEXT NOT NULL DEFAULT '{}',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    category TEXT NOT NULL,
    price_bdt INTEGER NOT NULL,
    compare_at_price_bdt INTEGER,
    stock INTEGER NOT NULL DEFAULT 0,
    offer_text TEXT,
    features_json TEXT NOT NULL DEFAULT '[]',
    problem_bn TEXT NOT NULL DEFAULT '',
    solution_bn TEXT NOT NULL DEFAULT '',
    material TEXT,
    target_audience TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    art_seed TEXT NOT NULL DEFAULT '',
    enrich_json TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    source_updated_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(page_id, source_id)
  )`,

  `CREATE TABLE IF NOT EXISTS captions (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    run_date TEXT NOT NULL,
    batch INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    body TEXT NOT NULL,
    hashtags_json TEXT NOT NULL DEFAULT '[]',
    meta_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'ready',
    model TEXT NOT NULL DEFAULT 'demo',
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    similarity REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    posted_at TEXT,
    posted_by TEXT,
    UNIQUE(page_id, product_id, run_date, type)
  )`,

  // প্রতিটি প্রোডাক্টের রেডি ক্যাপশন পুল — খালি ফিড এড়াতে
  `CREATE TABLE IF NOT EXISTS caption_library (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL,
    body TEXT NOT NULL,
    hashtags_json TEXT NOT NULL DEFAULT '[]',
    meta_json TEXT NOT NULL DEFAULT '{}',
    model TEXT NOT NULL DEFAULT 'gemini',
    created_at TEXT NOT NULL,
    UNIQUE(page_id, product_id, type)
  )`,

  // গ্রাহকের ইনবক্স/কমেন্টের উত্তর — WhatsApp রিপ্লাই
  `CREATE TABLE IF NOT EXISTS product_messages (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'whatsapp',
    body TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'gemini',
    created_at TEXT NOT NULL,
    UNIQUE(page_id, product_id, kind)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_library_product ON caption_library(page_id, product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_product ON product_messages(page_id, product_id)`,

  `CREATE TABLE IF NOT EXISTS selection_runs (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    run_date TEXT NOT NULL,
    batch INTEGER NOT NULL DEFAULT 1,
    seed TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(page_id, run_date, batch)
  )`,

  `CREATE TABLE IF NOT EXISTS daily_selections (
    run_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    score REAL NOT NULL DEFAULT 0,
    pinned INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(run_id, product_id)
  )`,

  `CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'moderator',
    page_ids_json TEXT NOT NULL DEFAULT '[]',
    last_active_at TEXT,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS generation_logs (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    product_id TEXT,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    model TEXT,
    tokens INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    meta_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_products_page ON products(page_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_captions_page_date ON captions(page_id, run_date)`,
  `CREATE INDEX IF NOT EXISTS idx_captions_product ON captions(page_id, product_id, run_date)`,
  `CREATE INDEX IF NOT EXISTS idx_runs_page_date ON selection_runs(page_id, run_date)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_created ON generation_logs(created_at)`,
];
