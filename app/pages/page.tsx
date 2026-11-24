import Link from "next/link";
import { BrandEditor } from "@/components/brand/brand-editor";
import { PageTabs } from "@/components/shell/page-tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { listPages } from "@/lib/data";
import { bn } from "@/lib/format";
import { cn } from "@/lib/cn";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PagesScreen({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const pages = await listPages();
  if (pages.length === 0) return <EmptyState title="কোনো পেজ নেই" description="প্রথম পেজ যোগ করে ব্র্যান্ড কিট সেট করুন।" />;

  const active = pages.find((page) => page.slug === params.page) ?? pages[0];

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <p className="text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">পেজ ও ব্র্যান্ড</p>
        <h1 className="mt-2 text-[26px] leading-tight sm:text-[30px]">প্রতিটি পেজের নিজের পরিচয়</h1>
        <p className="mt-1 max-w-[62ch] text-[13px] leading-[1.8] text-ink-soft">
          রঙ, লোগো, ভয়েস আর হ্যাশট্যাগ আলাদা রাখুন — ক্যাপশন ও পোস্টার দুইটাই সেই অনুযায়ী তৈরি হবে।
        </p>
        <div className="mt-4">
          <PageTabs pages={pages} activeSlug={active.slug} basePath="/pages" />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => {
          const selected = page.id === active.id;
          return (
            <Link
              key={page.id}
              href={`/pages?page=${page.slug}`}
              className={cn(
                "card-surface group relative overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5",
                selected && "ring-2 ring-accent/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[13px] font-[660] text-white"
                    style={{ background: page.brand.ink }}
                  >
                    {page.brand.logoMark}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-[620]">{page.name}</span>
                    <span className="block truncate text-[11px] text-ink-faint">{page.tagline}</span>
                  </span>
                </div>
                {selected ? <Badge tone="accent">সম্পাদিত হচ্ছে</Badge> : null}
              </div>

              <div className="mt-3 flex h-9 overflow-hidden rounded-[9px] border border-line/70">
                {[page.brand.primary, page.brand.accent, page.brand.surface, page.brand.ink].map((color, index) => (
                  <span key={`${color}-${index}`} className="flex-1" style={{ background: color }} />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-faint">
                <span>
                  দিনে <span className="num font-[600] text-ink-soft">{bn(page.dailyCount)}</span> ক্যাপশন
                </span>
                <span>
                  গ্যাপ <span className="num font-[600] text-ink-soft">{bn(page.repeatGapDays)}</span> দিন
                </span>
                <span className="num">{bn(page.hashtags.length)} ট্যাগ</span>
              </div>
            </Link>
          );
        })}
      </section>

      <BrandEditor page={active} />
    </div>
  );
}
