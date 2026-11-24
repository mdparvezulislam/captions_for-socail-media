# Caption Engine — Design & Plan

> স্ট্যাটাস: **Draft — awaiting final sign-off**
> আপডেট: ২০২৬-১১-২৪
> স্কোপ: দিনে একবার অটো-জেনারেট হওয়া বাংলা প্রোডাক্ট ক্যাপশন + পোস্টার, মাল্টি-পেজ/মাল্টি-মডারেটর ড্যাশবোর্ড।

---

## ১. এক নজরে

| প্রশ্ন | উত্তর |
|---|---|
| কী বানাচ্ছি | প্রোডাক্ট API → দৈনিক টপ ৫ → প্রতি প্রোডাক্টে ৩ ক্যাপশন + পোস্টার → মডারেটর কপি করে পোস্ট |
| কারা ব্যবহার করবে | ২–৫ মডারেটর, ১–৩ ফেসবুক পেজ |
| স্কেল | ১০০–৫০০ প্রোডাক্ট, দিনে ~১৫টি জেনারেশন |
| প্ল্যাটফর্ম | Cloudflare Workers (vinext) + D1 + R2 + Queues + Browser Run |
| AI | Google Gemini (Flash = টেক্সট, image model = পোস্টার ব্যাকগ্রাউন্ড) |
| ভাষা | বাংলা (৭০%+) + স্বাভাবিক ইংরেজি শব্দ |
| v1-এ নেই | Facebook অটো-পাবলিশ, কমেন্ট/DM অটোমেশন, বিলিং, মোবাইল অ্যাপ |

**সাফল্যের মাপকাঠি**
1. সকাল ০৭:০০ (ঢাকা)-এ জব রান → ৪ মিনিটের মধ্যে ৩ পেজ × ৫ প্রোডাক্ট × ৩ ক্যাপশন + ৫ পোস্টার রেডি।
2. মডারেটর ৩০ সেকেন্ডে ১টি ক্যাপশন কপি করে ফেসবুকে পোস্ট করতে পারে।
3. কোনো ক্যাপশনে ভুল দাম/স্টক/অবৈধ দাবি থাকবে না (অটো-ভ্যালিডেশন blocker)।
4. মাসিক খরচ ≤ $১৫।
5. রিজেনারেশন ছাড়া ৯৫% ক্যাপশন "পোস্ট করার যোগ্য"।

---

## ২. নন-গোল (স্পষ্টভাবে বাদ)

- ❌ Facebook/Instagram অটো-পাবলিশ, scheduling, insights pull (v2)
- ❌ কমেন্ট/DM অটোমেশন, লিড স্ক্র্যাপিং
- ❌ সাবস্ক্রিপশন/বিলিং/মার্কেটপ্লেস
- ❌ নেটিভ মোবাইল অ্যাপ (PWA দিয়ে চালানো যাবে)
- ❌ ভিডিও এডিট/রেন্ডারিং (শুধু ভিডিওর জন্য ক্যাপশন টেক্সট)
- ❌ একাধিক ভাষা (v1 শুধু বাংলা; ইংরেজি ট্যাগ/শব্দ মিশ্রিত)

---

## ৩. ইউজার ও রোল

| রোল | পারমিশন |
|---|---|
| **Owner** | সব পেজ, ব্র্যান্ড কিট, API key, বাজেট, ইউজার ম্যানেজ |
| **Admin** | নির্দিষ্ট পেজ(গুলো)র সব কিছু + টিম ইনভাইট |
| **Moderator** | নিজের পেজের "আজ" ফিড, কপি/এডিট/রিজেনারেট/পোস্ট-মার্ক; সেটিংস নয় |

লগইন: **Cloudflare Access** (ইমেইল OTP, ইন্টারনাল টিমের জন্য ~৫০ ইউজার ফ্রি) → অ্যাপ-লেভেলে `page_members` দিয়ে পার-পেজ স্কোপিং।

---

## ৪. আর্কিটেকচার

```
                ┌──────────────────────── Cloudflare ────────────────────────┐
 Product API    │  vinext Worker (app)                                       │
 (REST/webhook) │   ├─ /dashboard  (RSC + Server Actions)                    │
      │         │   ├─ /api/products (sync target, HMAC)                    │
      └────────>│   ├─ /api/jobs/daily (internal token)  <── cron Worker      │
                │   └─ /api/captions, /api/posters, /api/copy                │
                │                                                            │
                │  Queue "generation" ──> consumer (1 msg = 1 product)       │
                │      ├─ Gemini Flash  → 3 captions (structured JSON)       │
                │      ├─ Validator     → price/claims/length/dedupe         │
                │      ├─ Browser Run   → poster PNG @1080×1350              │
                │      └─ D1 + R2                                            │
                └────────────────────────────────────────────────────────────┘
```

### বাইন্ডিং

| বাইন্ডিং | ব্যবহার |
|---|---|
| `D1` | সব relational ডেটা (প্রোডাক্ট, ক্যাপশন, সিলেকশন, লগ) |
| `R2` | প্রোডাক্ট ইমেজ ক্যাশ + জেনারেটেড পোস্টার |
| `QUEUE` (producer+consumer) | প্রোডাক্টপ্রতি জেনারেশন টাস্ক, রিট্রাই |
| `BROWSER` (Browser Run) | পোস্টার HTML → PNG |
| `AI`? | **না** — শুধু Gemini HTTP API |
| Secrets | `GEMINI_API_KEY`, `PRODUCT_API_TOKEN`, `INTERNAL_JOB_TOKEN`, `R2_*` |

### কেন আলাদা cron Worker
vinext এখন `0.1.x`; Worker entrypoint-এ `scheduled()` হুকের গ্যারান্টি নেই। তাই:
`Cron Trigger (0 1 * * * UTC = 07:00 Asia/Dhaka)` → ছোট worker → `POST /api/jobs/daily` (Bearer `INTERNAL_JOB_TOKEN`)।
ফল: ফ্রেমওয়ার্ক আপডেটে cron ভাঙে না, আর লোকালি `curl` দিয়েও জব টেস্ট করা যায়।

> ঢাকা UTC+6, DST নেই — তাই fixed `0 1 * * *` নিরাপদ।

---

## ৫. ডেটা মডেল (D1)

```sql
-- পেজ / ব্র্যান্ড
pages(id TEXT PK, name TEXT, slug TEXT UNIQUE, fb_url TEXT,
      daily_count INTEGER DEFAULT 5, tone TEXT, cta_style TEXT,
      brand_json TEXT, hashtags_json TEXT, is_active INT, created_at TEXT);

users(id TEXT PK, email TEXT UNIQUE, name TEXT, global_role TEXT, created_at TEXT);
page_members(page_id TEXT, user_id TEXT, role TEXT, PRIMARY KEY(page_id, user_id));

-- প্রোডাক্ট
products(id TEXT PK, page_id TEXT, source_product_id TEXT,
         name_bn TEXT, category TEXT, price_bdt INT, compare_at_price_bdt INT,
         stock INT, offer_text TEXT, features_json TEXT, problem_bn TEXT,
         solution_bn TEXT, material TEXT, target_audience TEXT, tags_json TEXT,
         is_active INT, deleted_at TEXT, source_updated_at TEXT, synced_at TEXT,
         raw_json TEXT,
         UNIQUE(page_id, source_product_id));

product_images(id TEXT PK, product_id TEXT, url TEXT, alt_bn TEXT,
               is_primary INT, sort INT, r2_key TEXT, fetched_at TEXT);

-- দৈনিক সিলেকশন
selection_runs(id TEXT PK, page_id TEXT, run_date TEXT, seed TEXT, created_at TEXT,
               UNIQUE(page_id, run_date));
daily_selections(run_id TEXT, product_id TEXT, rank INT, score REAL, pinned INT,
                 PRIMARY KEY(run_id, product_id));

-- ক্যাপশন (idempotent core)
captions(id TEXT PK, page_id TEXT, product_id TEXT, run_date TEXT, type TEXT,
         body TEXT, hashtags_json TEXT, meta_json TEXT,
         prompt_version TEXT, model TEXT, tokens_in INT, tokens_out INT,
         status TEXT, similarity REAL, created_at TEXT, posted_at TEXT,
         posted_by TEXT,
         UNIQUE(page_id, product_id, run_date, type));   -- double-run safety

posters(id TEXT PK, page_id TEXT, product_id TEXT, run_date TEXT, ratio TEXT,
        template TEXT, r2_key TEXT, status TEXT, created_at TEXT,
        UNIQUE(page_id, product_id, run_date, ratio));

-- অপারেশন
prompt_versions(id TEXT PK, page_id TEXT, version TEXT, system_prompt TEXT,
                is_active INT, created_at TEXT);
generation_logs(id TEXT PK, page_id TEXT, stage TEXT, status TEXT, error TEXT,
                latency_ms INT, model TEXT, tokens INT, cost_usd REAL, created_at TEXT);
budget_counters(page_id TEXT, period TEXT, tokens INT, cost_usd REAL, cap_usd REAL,
                PRIMARY KEY(page_id, period));
audit_logs(id TEXT PK, actor_id TEXT, action TEXT, entity TEXT, entity_id TEXT,
           meta_json TEXT, created_at TEXT);
```

> D1 নোট: single-threaded, প্রতি ডাটাবেস ১০GB; আমাদের ডেটা ~১০MB-এর কম হবে। `batch()` ব্যবহার করব যেখানে একাধিক write লাগে। পড়ার জন্য index: `captions(page_id, run_date)`, `products(page_id, is_active)`, `generation_logs(created_at)`।

**Status enum:** `ready | edited | posted | rejected | failed`

---

## ৬. Product API কনট্রাক্ট

সিঙ্ক দুইভাবে:
1. **Pull:** `GET {base}/products?since=<ISO>&page=<n>&limit=100`, হেডার `Authorization: Bearer <token>` → আমাদের worker ম্যাপ করে।
2. **Push (webhook):** `POST {our}/api/products` + `X-Signature: hmac_sha256(body, secret)` → ডেল্টা প্রসেস।

পেলোড (বাধ্যতামূলক ফিল্ড **bold**):

```json
{
  "source_product_id": "SKU-1023",
  "updated_at": "2026-11-24T05:00:00Z",
  "deleted": false,
  "is_active": true,
  "name_bn": "রিচার্জেবল মিনি ফ্যান",
  "category": "fan",
  "price_bdt": 1290,
  "compare_at_price_bdt": 1690,
  "stock": 40,
  "offer_text": "ডেলিভারি ফ্রি",
  "features_bn": ["ফুল চার্জে ৬–৮ ঘণ্টা", "USB-C চার্জিং", "৩ স্পিড", "৭২০ গ্রাম"],
  "problem_bn": "লোডশেডিং-এ গরমে ঘুম হয় না",
  "solution_bn": "চার্জ দিলেই ৬–৮ ঘণ্টা ব্যাকআপ",
  "material": "ABS + ব্রাশলেস মোটর",
  "target_audience": "ছাত্র, চাকরিজীবী",
  "tags": ["লোডশেডিং", "গরম", "ট্রাভেল"],
  "images": [{"url": "https://cdn.example.com/fan-1.jpg", "alt_bn": "মিনি ফ্যান", "is_primary": true}]
}
```

**নিয়ম:** `source_product_id` অপরিবর্তনীয় · দাম integer BDT · HTML নয় · ছবি সরাসরি URL (≤২MB, jpg/png/webp) · একই `updated_at` এলে স্কিপ · `deleted:true` = সফট-ডিলিট।

---

## ৭. দৈনিক সিলেকশন

```
score = 0.30·freshness + 0.20·offer + 0.20·cooldown
      + 0.15·stock_health + 0.10·performance + 0.05·manual_boost
```

| ফ্যাক্টর | হিসাব |
|---|---|
| freshness | `clamp(1 - age_days/30, 0, 1)` (`source_updated_at` থেকে) |
| offer | ডিসকাউন্ট% ≥২০ → ১.০; ৫–২০% → ০.৬; শুধু `offer_text` → ০.৪; নাহলে ০ |
| cooldown | শেষ পোস্টからの দিন/৭ (≥৭ দিন → ১.০) |
| stock_health | ৫–২০০ → ১.০; ২০১–৫০০ → ০.৬; ১–৪ → ০.৩; ০ → বাদ |
| performance | পোস্ট হয়েছে (৭ দিনে) → ১.০, কখনো হয়নি → ০.৫ (v2-তে রিচ দিয়ে) |
| manual_boost | পিন করা → ১.০ |

**হার্ড ফিল্টার:** `is_active=0`, `deleted`, `stock=0` বাদ · একই ক্যাটাগরিতে সর্বোচ্চ ২ · কমপক্ষে ১ নতুন (৩০ দিনের ভিতরে যোগ হওয়া)।
**টাই-ব্রেক:** `hash(page_id + run_date + product_id)` — ডিটারমিনিস্টিক।
**পিন:** অ্যাডমিন নির্দিষ্ট প্রোডাক্ট পিন করলে সেটা rank 1, বাকি ৪ স্বাভাবিক।
**Reroll:** ৬ষ্ঠ+ প্রোডাক্ট কিউ থেকে একটা স্লট বদল, `daily_selections`-এ লগ।

---

## ৮. ক্যাপশন ইঞ্জিন

### ৮.১ আউটপুট শেপ (এক LLM কল)

```json
{
  "image_caption": "৪–৫ লাইন, ৪০–৭০ শব্দ",
  "video_caption": { "hook": "১ লাইন", "body": "২ লাইন", "cta": "১ লাইন" },
  "problem_caption": "সমস্যা → সমাধান → কেন এটাই → CTA",
  "hashtags": ["#রিচার্জেবলফ্যান", "#লোডশেডিং"],
  "poster": { "headline": "≤২৮ অক্ষর", "subline": "≤৪০ অক্ষর", "badge": "≤১০ অক্ষর", "cta": "≤২০ অক্ষর" }
}
```

### ৮.২ প্রম্পট স্তর
1. **Global rules** — বাংলা, দৈর্ঘ্য, ইমোজি ≤৫, ফ্যাক্ট বানানো নিষেধ, নিষিদ্ধ দাবি তালিকা
2. **Page brand profile** — টোন ("আপনি"), CTA স্টাইল, অডিয়েন্স, হ্যাশট্যাগ বেস, ব্র্যান্ড নাম
3. **Product facts** — শুধু structured JSON (কোনো ফ্রি টেক্সট নয়)
4. **Schema** — `responseMimeType: application/json` + `responseSchema`
5. **Few-shot** — ২–৩টি গোল্ড উদাহরণ (পেজ-ভিত্তিক, DB থেকে লোড)
6. **Variation** — প্রতিদিন এলোমেলো `angle` (emotional / benefit-first / urgency) প্রম্পটে ইনজেক্ট

### ৮.৩ ভ্যালিডেশন (blocking)
| চেক | ফেল হলে |
|---|---|
| JSON স্কিমা | ১ retry, তারপর `failed` |
| দাম/অফার স্ট্রিং DB-এর সাথে মিল | retry |
| নিষিদ্ধ ক্লেইম (`রোগ সারায়`, `১০০% গ্যারান্টি`, `সরকারি`, `ডাক্তার`) | retry |
| বাংলা অক্ষর ≥৭০%, ইমোজি ≤৫ | retry |
| পুরনো ৩০ দিনের সাথে trigram similarity ≥০.৭৫ | regenerate |
| `image_caption` ৪০–৭০ শব্দ, `video.hook` ≤৯০ অক্ষর | retry |

সর্বোচ্চ ২ retry → `status=failed` + `generation_logs`-এ কারণ; ড্যাশবোর্ডে "আবার চেষ্টা" বাটন।

### ৮.৪ মডেল ও খরচ
- `gemini-2.5-flash` (structured output) — ক্যাপশন
- `gemini-2.5-flash-image` — পোস্টার ব্যাকগ্রাউন্ড (শুধু টপ ১–২ প্রোডাক্ট/দিন; বাকিগুলো টেমপ্লেট-ব্যাকগ্রাউন্ড)
- প্রতি প্রোডাক্টে ইনপুট ~৮০০–১২০০ টোকেন, আউটপুট ~৫০০
- রিজেনারেট: মডারেটরপ্রতি ঘণ্টায় ১০ কল
- বাজেট গার্ড: `budget_counters` পেরোলে জব থামাবে + অ্যালার্ট

---

## ৯. পোস্টার পাইপলাইন

```
product image → (opz.) Gemini edit: লাইফস্টাইল ব্যাকগ্রাউন্ড (প্রোডাক্ট অপরিবর্তিত)
              → HTML টেমপ্লেট (brand_json + বাংলা ফন্ট) 
              → Browser Run POST /screenshot (1080×1350, deviceScaleFactor 2)
              → PNG → R2 → signed URL / download
```

**টেমপ্লেট (৫):** `offer`, `new-arrival`, `problem-solution`, `price-drop`, `testimonial`
**রেশিও:** 1:1 (1080×1080), 4:5 (1080×1350, ডিফল্ট), 9:16 (1080×1920)
**ব্র্যান্ড কিট (`brand_json`):** `logo_url`, `primary`, `secondary`, `accent`, `font_bn` (Hind Siliguri / Baloo Da 2 / Li Ador Noirrit), `watermark`, `cta_text`
**সেফ জোন:** নিচে ১২% ফাঁকা (FB-এর UI ওভারল্যাপ এড়াতে), মূল টেক্সট উপরের ৭৫%-এ
**প্রিভিউ:** ব্রাউজারে CSS দিয়ে ইনস্ট্যান্ট; PNG শুধু ডাউনলোড/কনফার্মে তৈরি হয় → ব্রাউজার-টাইম বাঁচে।

> ব্রাউজার-টাইম বাজেট: ৫ পোস্টার/দিন ≈ ১০–১৫ সেকেন্ড → মাসে <১০ মিনিট (Paid টিয়ারে ১০ ঘণ্টা ফ্রি)।

---

## ১০. ড্যাশবোর্ড (মোবাইল-ফার্স্ট)

| রুট | স্ক্রিন | মূল উপাদান |
|---|---|---|
| `/today` | আজকের ফিড | ৫ কার্ড; ৩ ট্যাব; কপি (বড় বাটন); এডিট; রিজেনারেট; পোস্টার; "পোস্ট হয়েছে" |
| `/poster/[id]` | পোস্টার প্রিভিউ | রেশিও সুইচ, টেমপ্লেট বদল, ডাউনলোড, শেয়ার |
| `/library` | লাইব্রেরি | FTS সার্চ, ফিল্টার (পেজ/টাইপ/তারিখ), রিইউজ, "ভালো চলেছে" ট্যাগ |
| `/products` | প্রোডাক্ট | সিঙ্ক স্ট্যাটাস, সার্চ, ম্যানুয়াল এডিট, স্কিপ/আনস্কিপ |
| `/pages` | পেজ ও ব্র্যান্ড | টোন, হ্যাশট্যাগ, লোগো/কালার/ফন্ট, দৈনিক সংখ্যা |
| `/team` | টিম | ইনভাইট, রোল |
| `/settings` | সেটিংস | API key, cron সময়, বাজেট ক্যাপ |

**ডেইলি ফ্লো:** `/today` → "কপি" → FB অ্যাপে পেস্ট → "পোস্ট হয়েছে" (কুলডাউন আপডেট)।
**টাইপোগ্রাফি:** বাংলা UI-তে `Hind Siliguri`; নাম্বার/ইংরেজিতে `Inter`। টাচ টার্গেট ≥৪৪px। লাইট থিম ডিফল্ট, ডার্ক v1.5।

---

## ১১. জব ও নির্ভরযোগ্যতা

```
07:00  cron Worker → POST /api/jobs/daily
       ├─ selection_runs upsert (unique page_id+run_date)  ← idempotent
       ├─ ৫টা প্রোডাক্ট বাছাই → daily_selections
       └─ প্রতি প্রোডাক্টে QUEUE.send({page_id, product_id, run_date})
08:00  পর্যন্ত: consumer → captions + posters (unique constraint এ ডুপ্লিকেট আটকায়)
```

- **রিট্রাই:** queue `max_retries=2`, ব্যাকঅফ; ২ বার ফেল → `failed` + অ্যালার্ট
- **Race:** একই দিনে দুইবার জব → unique constraint ⇒ দ্বিতীয়টা no-op
- **কোটা:** Gemini 429 হলে exponential backoff (১s, ৪s, ৯s)
- **সুস্থতা:** `/api/health` → D1 ping + queue backlog; cron শেষে সারাংশ ইমেইল/Telegram
- **DLQ:** queue-এর dead-letter → `generation_logs` + ড্যাশবোর্ডে "ব্যর্থ" সেকশন

---

## ১২. খরচ (আনুমানিক, মাসিক)

| আইটেম | খরচ |
|---|---|
| Workers Paid | $5 |
| D1 / R2 / Queues | ~$0 |
| Browser Run | $0 (১০ ঘণ্টার ভিতরে) |
| Gemini Flash (১৫০০ ক্যাপশন সেট) | $2–4 |
| Gemini image (৬০টি ব্যাকগ্রাউন্ড) | $2–3 |
| **মোট** | **$9–12** |

---

## ১৩. সিকিউরিটি

- সব secret `wrangler secret put`; রিপোতে কিছু নেই
- ড্যাশবোর্ড: Cloudflare Access (OTP) + `page_members` স্কোপ
- Product webhook: HMAC-SHA256 + timestamp (±৫ মিনিট) রিপ্লে প্রতিরোধ
- Internal job endpoint: Bearer টোকেন + শুধু cron worker থেকে কল
- R2: প্রাইভেট বাকেট, signed URL (১ ঘণ্টা)
- অডিট লগ: কে ক্যাপশন এডিট/পোস্ট-মার্ক করল
- PII: শুধু টিমের ইমেইল; কাস্টমার ডেটা নেই

---

## ১৪. টেস্টিং

| স্তর | কী |
|---|---|
| Unit (Vitest) | স্কোরিং, ভ্যালিডেটর, দাম ফরম্যাট, ট্রাইগ্রাম similarity, প্রম্পট বিল্ডার |
| Integration | Gemini mock (fixture JSON) দিয়ে পুরো consumer flow; D1 local (`wrangler dev --local`) |
| E2E (Playwright) | লগইন → /today → কপি → "পোস্ট হয়েছে" → লাইব্রেরিতে দেখা |
| Golden set | ১০টি বাস্তব প্রোডাক্টের প্রত্যাশিত আউটপুট — প্রম্পট বদলালে ম্যানুয়াল রিভিউ + স্কোর |
| Visual | পোস্টার টেমপ্লেটের screenshot diff (৩ রেশিও) |

---

## ১৫. ফেজ ও অ্যাকসেপ্টেন্স

| ফেজ | ডেলিভারেবল | দিন | Done মানে |
|---|---|---|---|
| ০ | vinext + D1 + Access + লেআউট, `wrangler.jsonc` | ২–৩ | `wrangler dev` চলে, লগইন হয়, `/today` খালি অবস্থায় দেখায় |
| ১ | সিঙ্ক (pull+webhook), প্রোডাক্ট লিস্ট, সিলেকশন | ৩ | ৫০টি ডেমো প্রোডাক্ট সিঙ্ক হয়; দৈনিক ৫টা বাছাই ডিটারমিনিস্টিক |
| ২ | ক্যাপশন ইঞ্জিন + ভ্যালিডেটর + প্রম্পট | ৪–৫ | ১০টি প্রোডাক্টে ৩×৩ ক্যাপশন; ভুল দাম/ক্লেইম ০ |
| ৩ | `/today`, কপি ফ্লো, লাইব্রেরি | ৩ | ফোনে ৩০ সেকেন্ডে কপি-পোস্ট ফ্লো; Lighthouse mobile ≥৯০ |
| ৪ | পোস্টার (টেমপ্লেট + Browser Run + R2) | ৪ | ৩ রেশিওতে বাংলা লেখা নিখুঁত, ডাউনলোড কাজ করে |
| ৫ | cron Worker + Queues + লগ + বাজেট গার্ড | ২ | ভোর ৭টায় অটো জব, ডুপ্লিকেট নেই, ফেল হলে অ্যালার্ট |
| ৬ | হার্ডেনিং, বাংলা টিউনিং, ডিপ্লয় | ২–৩ | ৭ দিনের ড্রাই রান; ৯৫% ক্যাপশন রিজেনারেট ছাড়া ব্যবহৃত |

**মোট ≈ ১৮–২২ কর্মদিবস।** ডিফল্ট পরামর্শ: ফেজ ০–৩ আগে (ক্যাপশন সিস্টেম দৈনিক ব্যবহারে), পোস্টার পরে।

---

## ১৬. ঝুঁকি

| ঝুঁকি | প্রভাব | প্রশমন |
|---|---|---|
| vinext 0.1.x-এ API গ্যাপ | মাঝারি | শুধু core RSC/Actions/Route Handlers; ফলব্যাক SPA+Hono (একই D1/R2) |
| বাংলা ক্যাপশন "রোবটিক" শোনা | **উচ্চ** | গোল্ড few-shot, পেজ-ভয়েস, সাপ্তাহিক প্রম্পট রিভিউ, মডারেটর এডিট ডেটা সংগ্রহ |
| Gemini quota/429 | মাঝারি | queue backoff, বাজেট গার্ড, রিজেনারেট rate limit |
| AI-উদ্ভাবিত ফ্যাক্ট | **উচ্চ** | ফ্যাক্ট-লক ("শুধু JSON-এর তথ্য"), price/claim ভ্যালিডেটর, ২ retry |
| বাংলা টেক্সট রেন্ডারিং ভাঙা | মাঝারি | Chromium (Browser Run) + এমবেডেড বাংলা ফন্ট + ভিজ্যুয়াল টেস্ট |
| ব্রাউজার-টাইম খরচ বাড়া | কম | প্রিভিউ CSS-এ, PNG শুধু দরকারে; মাসিক ব্যবহার মনিটর |
| ফেসবুক পলিসি (ভবিষ্যতে অটো-পোস্ট) | মাঝারি | v1-এ অটো-পোস্ট নেই; ক্লেইম ফিল্টার এখনই |

---

## ১৭. খোলা প্রশ্ন

1. ব্র্যান্ড কিট (লোগো, কালার, ফন্ট) আপনি দেবেন নাকি আমি ৩টি ডিফল্ট থিম বানাব?
2. প্রোডাক্ট API এখন লাইভ আছে? নাহলে প্রথমে CSV/সিড ডেটা দিয়ে ডেমো করব।
3. Cloudflare অ্যাকাউন্ট + ডোমেইন আছে? (Workers Paid লাগবে — Browser Run/Queues)
4. একই প্রোডাক্ট একাধিক পেজে গেলে ক্যাপশন কি আলাদা হবে? (ডিফল্ট: পেজ-ভয়েস অনুযায়ী আলাদা)
5. "পোস্ট হয়েছে" মার্ক না করলে কুলডাউন কীভাবে চলবে? (ডিফল্ট: শুধু মার্ক করা পোস্ট ধরা হবে)

---

## ১৮. Decision Log

| # | সিদ্ধান্ত | বাদ দেওয়া বিকল্প | কারণ |
|---|---|---|---|
| 1 | শুধু জেনারেশন, অটো-পাবলিশ নেই | Graph API অটো-পোস্ট | টোকেন/রিভিউ/রেস্ট্রিক ঝুঁকি শূন্য, দ্রুত লঞ্চ |
| 2 | কাস্টম REST API + অ্যাডাপ্টার | WooCommerce / Shopify / Sheet-only | নমনীয়; সোর্স বদলালেও মূল কোড অপরিবর্তিত |
| 3 | ১–৩ পেজ, ২–৫ মডারেটর, ১০০–৫০০ প্রোডাক্ট | মাল্টি-টেন্যান্ট SaaS | YAGNI; স্কোপিং থাকবে, বিলিং/org বাদ |
| 4 | পোস্টার = টেমপ্লেট কম্পোজিট | পুরো AI-ডিজাইন / Sharp / Satori | বাংলা লেখা নিখুঁত, ব্র্যান্ড কনসিস্টেন্ট, খরচ কম |
| 5 | Cloudflare Workers + vinext + D1 + R2 | Vercel + Postgres + Sharp | ব্যবহারকারীর পছন্দ; এক প্ল্যাটফর্মে cron/queue/storage |
| 6 | পোস্টার রেন্ডার = Browser Run | Sharp (চলে না), Satori (শেপিং ভাঙে), client canvas | Chromium বাংলা shaping নিখুঁত; ১০ ঘণ্টা ফ্রি |
| 7 | Cron আলাদা Worker → HTTP | vinext-এ `scheduled()` | ফ্রেমওয়ার্ক আপডেটে ভাঙবে না, curl দিয়ে টেস্ট |
| 8 | ১ LLM কল = ৩ ক্যাপশন | প্রতি ক্যাপশনে আলাদা কল | খরচ/লেটেন্সি ৩× কম |
| 9 | টোন: হুক + মাঝারি লম্বা + অফার প্রমিনেন্ট | ছোট/পাঞ্চি, স্টোরিটেলিং | নমুনা দেখে ব্যবহারকারী অ্যাপ্রুভ |
| 10 | Cron + Queue ফ্যান-আউট | inline worker, lazy generation | টাইমআউট-মুক্ত, সকালে রেডি, একটার ফেল বাকিকে থামায় না |
| 11 | ডিটারমিনিস্টিক সিড + unique constraint | র‍্যান্ডম সিলেকশন | একই দিনে দুইবার রানেও ডুপ্লিকেট নেই |
| 12 | Cloudflare Access + অ্যাপ রোল | নিজস্ব পাসওয়ার্ড auth, Clerk | কম কোড, ইন্টারনাল টিমের জন্য যথেষ্ট |
