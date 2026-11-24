import { env } from "cloudflare:workers";
import { Badge } from "@/components/ui/badge";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { db, readyDb } from "@/lib/db";
import { bn, bnNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

function readEnv(key: string): string | undefined {
  const value = (env as unknown as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export default async function SettingsPage() {
  await readyDb();
  const database = db();
  const [pages, products, captions, tokens] = await Promise.all([
    database.prepare("SELECT COUNT(*) AS n FROM pages").first<{ n: number }>(),
    database.prepare("SELECT COUNT(*) AS n FROM products").first<{ n: number }>(),
    database.prepare("SELECT COUNT(*) AS n FROM captions").first<{ n: number }>(),
    database
      .prepare("SELECT SUM(tokens) AS n FROM generation_logs WHERE created_at >= ?")
      .bind(new Date(Date.now() - 30 * 864e5).toISOString())
      .first<{ n: number | null }>(),
  ]);

  const apiKey = readEnv("GEMINI_API_KEY");
  const model = readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";
  const demoMode = !apiKey;

  const rows: { label: string; value: string; ok?: boolean; note?: string }[] = [
    {
      label: "Gemini API",
      value: apiKey ? `সংযুক্ত · ${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` : "ডেমো মোড (কী নেই)",
      ok: Boolean(apiKey),
      note: apiKey ? undefined : "GEMINI_API_KEY সেট করলেই আসল ক্যাপশন তৈরি হবে",
    },
    { label: "মডেল", value: model, ok: true },
    { label: "ডেটাবেস", value: "Cloudflare D1", ok: true },
    { label: "স্টোরেজ", value: "R2 (প্রোডাক্ট ও পোস্টার)", ok: true },
    { label: "পোস্টার রেন্ডার", value: "ব্রাউজার ক্যানভাস · ১০৮০px", ok: true },
    { label: "দৈনিক সময়", value: "সকাল ০৭:০০ · ঢাকা (UTC+6)", ok: true },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <p className="text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">সেটিংস</p>
        <h1 className="mt-2 text-[26px] leading-tight sm:text-[30px]">সিস্টেম ও খরচ</h1>
        <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.8] text-ink-soft">
          কী কনফিগার করা আছে, ডেটা কোথায় আছে আর কীভাবে খরচ নিয়ন্ত্রণে রাখা হচ্ছে।
        </p>
        {demoMode ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-sky/25 bg-sky-soft/70 px-4 py-3 text-[12.5px] leading-[1.75] text-sky">
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              এখন <strong>ডেমো মোড</strong> চালু — ক্যাপশন টেমপ্লেট থেকে তৈরি হচ্ছে, Gemini কল হচ্ছে না। খরচ
              শূন্য, কিন্তু লেখা সীমিত। আসল আউটপুট পেতে{" "}
              <code className="num rounded bg-white/70 px-1">wrangler secret put GEMINI_API_KEY</code> চালান।
            </p>
          </div>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="text-[13.5px] font-[640]">সিস্টেম স্ট্যাটাস</h2>
          <dl className="mt-3 divide-y divide-line/60">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3 py-2">
                <dt className="text-[12px] text-ink-soft">{row.label}</dt>
                <dd className="flex min-w-0 flex-col items-end gap-0.5 text-right">
                  <span className="flex items-center gap-1.5 text-[12px] font-[540]">
                    {row.ok ? <IconCheck size={13} className="text-moss" /> : <IconAlert size={13} className="text-sky" />}
                    {row.value}
                  </span>
                  {row.note ? <span className="text-[10.5px] text-ink-faint">{row.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card-surface p-5">
          <h2 className="text-[13.5px] font-[640]">ডেটা</h2>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            {[
              ["পেজ", pages?.n ?? 0],
              ["প্রোডাক্ট", products?.n ?? 0],
              ["ক্যাপশন", captions?.n ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-[14px] border border-line/70 bg-card-soft/60 px-3 py-3">
                <dt className="text-[11px] text-ink-faint">{label}</dt>
                <dd className="num mt-0.5 text-[20px] font-[640]">{bnNumber(Number(value))}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-center justify-between rounded-[14px] border border-line/70 px-3 py-2.5">
            <span className="text-[11.5px] text-ink-soft">শেষ ৩০ দিনে টোকেন</span>
            <span className="num text-[12.5px] font-[600]">{tokens?.n ? bn(Number(tokens.n)) : "০"}</span>
          </div>
          <p className="mt-2 text-[11px] leading-[1.7] text-ink-faint">
            প্রতি প্রোডাক্টে একটি করে LLM কল হয় — তিনটি ক্যাপশন একসাথে। বাজেট শেষ হলে ব্যাচ থামিয়ে দেয়।
          </p>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="text-[13.5px] font-[640]">কীভাবে কাজ করে</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["১. নির্বাচন", "প্রতিদিন সকালে স্কোরিং করে টপ প্রোডাক্ট বেছে নেওয়া হয় — যেগুলো সম্প্রতি আসেনি।"],
            ["২. লেখা", "প্রতি প্রোডাক্টে এক কলে তিন ধরনের ক্যাপশন — ইমেজ, ভিডিও, সমস্যা-সমাধান।"],
            ["৩. ব্যবহার", "মডারেটর কপি করে পোস্ট করেন; পোস্ট মার্ক করলে সেটি হিস্ট্রিতে যায়।"],
          ].map(([title, text]) => (
            <li key={title} className="rounded-[14px] border border-line/70 bg-card-soft/50 p-3.5">
              <p className="text-[12.5px] font-[620]">{title}</p>
              <p className="mt-1 text-[11.5px] leading-[1.75] text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-[16px] border border-dashed border-line bg-card/40 px-4 py-3.5">
        <Badge tone={demoMode ? "sky" : "moss"}>{demoMode ? "ডেমো" : "লাইভ"}</Badge>
        <p className="text-[11.5px] text-ink-soft">
          কী বদলাতে চাইলে টার্মিনালে সিক্রেট আপডেট করে ওয়ার্কার রিডিপ্লয় করুন — কোডে কোনো কী রাখা নেই।
        </p>
      </section>
    </div>
  );
}
