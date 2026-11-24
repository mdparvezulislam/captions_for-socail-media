# AI Agent Handoff Prompt — Caption Engine

> এই প্রম্পটটি কপি করে যেকোনো AI কোডিং এজেন্টকে (এই প্রজেক্ট ফোল্ডারে) দিলে সে পুরো কনটেক্সট পাবে।
> অবস্থা: Phase 0–6 সম্পন্ন, Gemini লাইভ, ক্যাটালগ সিঙ্ক লাইভ।

---

## প্রম্পট (কপি করে পাঠান)

আপনি একটি প্রোডাকশন-গ্রেড Bengali social-media caption engine-এর সিনিয়র ইঞ্জিনিয়ার। প্রজেক্ট রুট: `/Users/parvez/CODE/captions`।

**স্ট্যাক:** vinext 1.4.x (Next.js App Router API on Vite 8) + Cloudflare Workers + D1 + R2 + React 19 + Tailwind v4 + Gemini API (`gemini-3.8-flash`, fallback `gemini-3.5-flash`, `gemini-3.1-flash-lite`)। প্যাকেজ ম্যানেজার pnpm (লোকাল store: `.cache/pnpm-store`)। কোনো নতুন dependency না নিয়ে কাজ করুন।

**অবশ্যই আগে পড়ুন:** `PLAN.md` (২২ সেকশনের পূর্ণ ডিজাইন + Decision Log), `lib/types.ts`, `lib/schema.ts`, `lib/captions.ts`, `lib/ai/prompts.ts`, `lib/facebook-text.ts`, `lib/sync.ts`, `app/actions.ts`, `components/today/caption-workspace-drawer.tsx`, `.dev.vars.example`।

**এই সিস্টেম যা করে (বর্তমান অবস্থা):**
1. প্রতিদিন সকাল ৭টায় (ঢাকা) cron worker → `POST /api/jobs/daily` (Bearer `INTERNAL_JOB_TOKEN`) → প্রথমে `https://uniquestorebd.top/api/v1/products` থেকে লাইভ ক্যাটালগ সিঙ্ক (delta by `updatedAt`, missing → soft-delete) → তারপর প্রতি পেজে টপ ৫ প্রোডাক্ট নির্বাচন (score: freshness 30/offer 20/cooldown 20/stock 15/perf 10/boost 5; repeat-gap মানে; category cap 2)।
2. প্রতি প্রোডাক্টে **এক LLM কলে** structured JSON: `image_caption`, `video_caption{hook,body,cta}`, `problem_caption`, `comment_keyword`, `hashtags`, `poster{headline,subline,badge,cta}`। thinkingConfig budget 0 (JSON truncation এড়াতে)।
3. Validation pipeline: word-count, Bangla ratio ≥0.55, banned claims regex, price-mismatch (৳ + বাংলা অঙ্ক), trigram similarity ≥0.75 → fail হলে safe demo fallback।
4. Gold caption format (moderator-approved): সমস্যা-লাইন → `✅ English Label - বাংলা সুবিধা` বুলেট → `কমেন্টে 'Keyword' লিখুন। দাম আর অর্ডার লিংক ইনবক্সে দিয়ে দিচ্ছি।` — দাম বডিতে নয় (ইনবক্স কৌশল)।
5. Copy formatting: **Unicode Mathematical Sans-Serif Bold** (U+1D5EC range) — English রান বোল্ড হয়, বাংলা/ইমোজি/হ্যাশট্যাগ লাইন অস্পৃশ্য; গ্রুপ মোডে + 🛒 অর্ডার লিংক / 📞 হটলাইন / 🚚 ডেলিভারি / 🛡️ ওয়ারেন্টি ব্লক।
6. UI: মোবাইল-ফার্স্ট টাস্ক গ্রিড (`/today`) → ক্লিকে ইনস্ট্যান্ট ড্রয়ার (`/api/studio/[id]` JSON, রিলোড নেই) → ৩ ক্যাপশন কার্ড (কপি/এডিট/রিরাইট/পোস্ট-মার্ক) → পোস্টার স্টুডিও (`/poster/[id]`, Canvas PNG 1080px, বাংলা ফন্ট Anek Bangla, ব্র্যান্ড কিট পার-পেজ)। Ctrl+K সার্চ, ←/→ নেভিগেশন, Esc।
7. মাল্টি-পেজ + মাল্টি-মডারেটর (Cloudflare Access + `page_members` রোল), ব্র্যান্ড কিট এডিটর, লাইব্রেরি সার্চ, বাজেট গার্ড, audit logs।

**কঠিন নিয়ম (ভাঙবেন না):**
- Secrets শুধু `.dev.vars` (লোকাল) / `wrangler secret` (প্রোডাকশন) — কখনো কমিট নয়; `GEMINI_API_KEY`-এর মান কোনো ফাইলে হার্ডকোড নয়।
- `cloudflare.config.ts`-এ `bindings.secret()` ডিক্লেয়ার করা থাকতে হয় নাহলে dev-এ env পাওয়া যায় না।
- D1 schema additive — idempotent `ALTER TABLE ... ADD COLUMN` (try/catch) ব্যবহার করুন, কখনো DROP নয়।
- LLM ফেল-হলে ফলব্যাক চেইন → সব ফেল → demo generator (validator পাস করে) — ফিড কখনো খালি থাকবে না।
- ইউনিকোড বোল্ড শুধু Latin/digits; হ্যাশট্যাগ লাইন কখনো স্টাইল নয়।
- সব UI লেখা বাংলা; সংখ্যা `bn()` দিয়ে বাংলা অঙ্ক।

**চালানোর কমান্ড:** `pnpm dev` (localhost:5173) · `pnpm test` (vitest) · `pnpm typecheck` · `pnpm build` · Playwright অডিট: `PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/pw-browsers node scripts/section19-audit.mjs` (15 checks সব পাস করতে হবে)।

**পরবর্তী কাজের তালিকা (priority order):**
1. আলাদা cron worker deploy (`cf workers` / wrangler) — প্রতিদিন 01:00 UTC-এ `/api/jobs/daily` কল (ভাঙা হলে Telegram alert)।
2. Cloudflare প্রোডাকশন deploy: `wrangler secret put GEMINI_API_KEY` (আর `INTERNAL_JOB_TOKEN`) → `pnpm run deploy` → D1 remote migration + R2 bucket + Browser Run binding যাচাই।
3. Queue ফ্যান-আউট (PLAN §11): এখন দৈনিক জব inline concurrency-2 চলে; Cloudflare Queues-এ স্যুইচ করলে ১০০+ প্রোডাক্টে স্কেল হবে।
4. Gemini image (ন্যানো-বানানা/3.1-flash-image) দিয়ে টপ ১–২ প্রোডাক্টের পোস্টার ব্যাকগ্রাউন্ড (প্রোডাক্ট অপরিবর্তিত রেখে lifestyle scene) — বাজেট ক্যাপসহ।
5. Posted captions-এর reach feedback (manual tag আছে; ভবিষ্যতে FB insights) → selection score-এর performance weight লাইভ করা।
6. Pin/favorite localStorage → D1 persistence (admin-ভিত্তিক)।

**অ্যাকসেপ্টেন্স:** সব পরিবর্তনের পরে `pnpm typecheck && pnpm test && pnpm build` পাস + audit 15/15 + একটি লাইভ daily job (৩ পেজ × ৫ প্রোডাক্ট) নতুন ফরম্যাটে ক্যাপশন তৈরি করে + কোনো ক্যাপশনে ভুল দাম/নিষিদ্ধ দাবি নেই। কাজ শেষে পরিবর্তনের সারাংশ + Decision Log-এ নতুন সিদ্ধান্ত যোগ করুন।
