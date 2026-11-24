# ক্যাপশন স্টুডিও — Caption Engine

প্রোডাক্ট API → দৈনিক টপ ৫ প্রোডাক্ট → প্রতি প্রোডাক্টে ৩টি বাংলা ক্যাপশন (ইমেজ / ভিডিও-হুক / সমস্যা-সমাধান) + ব্র্যান্ডেড পোস্টার → মাল্টি-পেজ/মাল্টি-মডারেটর ড্যাশবোর্ড।

**সম্পূর্ণ ডিজাইন ও Decision Log:** [PLAN.md](PLAN.md) · **AI এজেন্ট হ্যান্ডঅফ:** [AGENT-PROMPT.md](AGENT-PROMPT.md)

## স্ট্যাক

vinext (Next.js API on Vite) · Cloudflare Workers · D1 · R2 · Browser Run · Gemini 3.8 Flash · React 19 · Tailwind v4

## চালানো (লোকাল)

```bash
pnpm install
cp .dev.vars.example .dev.vars        # GEMINI_API_KEY বসান
pnpm dev                              # http://localhost:5173
```

- `pnpm test` — vitest (৪৩+ টেস্ট)
- `pnpm typecheck` — tsc strict
- `pnpm build` — production worker build
- `PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/pw-browsers node scripts/section19-audit.mjs` — UI audit (১৫ চেক)

## এন্ডপয়েন্ট

| রুট | কাজ |
|---|---|
| `POST /api/jobs/daily` | সিঙ্ক + দৈনিক জেনারেশন (Bearer `INTERNAL_JOB_TOKEN`) |
| `POST /api/sync` | ক্যাটালগ সিঙ্ক (`{"page":"unique-store-bd"}`) |
| `POST /api/products` | স্টোর ব্যাকএন্ড থেকে পুশ-সিঙ্ক (HMAC/Bearer) |
| `GET /api/studio/[productId]` | ড্রয়ারের ডেটা JSON |
| `GET /api/search?q=` | Ctrl+K সার্চ |
| `GET /api/art/[seed]` | জেনারেটেড প্রোডাক্ট আর্ট |
| `GET /api/health` | স্বাস্থ্য চেক |

## প্রোডাকশন ডিপ্লয়

```bash
cf auth login                       # বা CLOUDFLARE_API_TOKEN
npx wrangler d1 create caption-engine-db     # config-এ id বসান
npx wrangler r2 bucket create caption-engine-media
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put INTERNAL_JOB_TOKEN
pnpm run deploy                     # vinext-cloudflare deploy
```

- ক্রন: আলাদা worker বা CF cron trigger দিয়ে প্রতিদিন 01:00 UTC (ঢাকা ০৭:০০) → `POST /api/jobs/daily`
- ড্যাশবোর্ড অথ: Cloudflare Access (ইমেইল OTP) — `cf-access-authenticated-user-email` হেডার থেকে সেশন
- প্রথম রিকোয়েস্টে D1 schema + ডেমো সিড অটো বসে; সিঙ্ক চালু হলে লাইভ ক্যাটালগ ঢোকে

## দৈনিক ফ্লো

সকালে cron → ক্যাটালগ সিঙ্ক → টপ ৫ নির্বাচন → প্রতি প্রোডাক্টে ১ LLM কল (৩ ক্যাপশন + পোস্টার কপি) → ভ্যালিডেশন → ফিড রেডি। মডারেটর: গ্রিডে ক্লিক → ড্রয়ার → কপি (ফেসবুক বোল্ড ফরম্যাটেড) → পোস্ট → "পোস্ট করেছি"।
