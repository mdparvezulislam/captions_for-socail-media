import Link from "next/link";
import { PageTabs } from "@/components/shell/page-tabs";
import { GenerateMore } from "@/components/today/generate-more";
import { ProductCard } from "@/components/today/product-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, SectionLabel } from "@/components/ui/empty";
import { IconAlert, IconArrowUpRight, IconClock, IconSpark } from "@/components/ui/icons";
import { getPageStats, listBatches, listPages, getTodayCaptions } from "@/lib/data";
import { bn, bnFullDate, dhakaDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Caption, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

interface FeedGroup {
  product: Product;
  captions: Caption[];
  position: number;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; batch?: string }>;
}) {
  const params = await searchParams;
  const pages = await listPages();
  if (pages.length === 0) {
    return (
      <EmptyState
        title="কোনো পেজ সেটআপ করা নেই"
        description="প্রথমে একটি ফেসবুক পেজ যোগ করুন, তারপর প্রোডাক্ট সিঙ্ক করে ক্যাপশন তৈরি করুন।"
        action={<ButtonLink href="/pages">পেজ যোগ করুন</ButtonLink>}
      />
    );
  }

  const active = pages.find((page) => page.slug === params.page) ?? pages[0];
  const date = dhakaDate();
  const [{ captions, products }, batches, stats] = await Promise.all([
    getTodayCaptions(active.id, date),
    listBatches(active.id, date),
    getPageStats(active.id, date),
  ]);

  const productMap = new Map(products.map((product) => [product.id, product]));
  const filtered = params.batch && params.batch !== "all"
    ? captions.filter((caption) => String(caption.batch) === params.batch)
    : captions;

  const groups = new Map<string, FeedGroup>();
  for (const caption of filtered) {
    const product = productMap.get(caption.productId);
    if (!product) continue;
    const group = groups.get(caption.productId) ?? { product, captions: [], position: 0 };
    group.captions.push(caption);
    group.position = Math.min(group.position, caption.batch);
    groups.set(caption.productId, group);
  }
  const feed = Array.from(groups.values()).sort((a, b) => {
    const first = a.captions[0];
    const second = b.captions[0];
    if (first.batch !== second.batch) return first.batch - second.batch;
    return first.runDate.localeCompare(second.runDate);
  });

  const postedCount = captions.filter((caption) => caption.status === "posted").length;
  const demoMode = captions.every((caption) => caption.model === "demo");

  return (
    <div className="flex flex-col gap-6">
      <header className="animate-fade">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              আজকের ফিড · {bnFullDate(date)}
            </p>
            <h1 className="mt-2 text-[26px] leading-[1.25] sm:text-[32px]">আজ কী পোস্ট করবেন</h1>
            <p className="mt-1.5 max-w-[56ch] text-[13.5px] leading-[1.8] text-ink-soft">
              নিচের ক্যাপশনগুলো কপি করে ফেসবুকে পোস্ট করুন। একই প্রোডাক্ট আবার আসবে না —
              শেষ পোস্ট থেকে {bn(active.repeatGapDays)} দিন পর ফিরে আসবে।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/products?page=${active.slug}`} variant="quiet" size="md" icon={<IconArrowUpRight size={15} />}>
              সব প্রোডাক্ট
            </ButtonLink>
            <GenerateMore
              pageSlug={active.slug}
              count={active.dailyCount}
              label={captions.length === 0 ? `${bn(active.dailyCount)}টা ক্যাপশন তৈরি করুন` : "আরেক ব্যাচ তৈরি করুন"}
              variant="accent"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PageTabs pages={pages} activeSlug={active.slug} basePath="/today" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line/70 py-2.5 text-[12px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="num font-[620] text-ink">{bn(stats.captionsToday)}</span> ক্যাপশন আজ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="num font-[620] text-ink">{bn(postedCount)}</span> পোস্ট হয়েছে
          </span>
          <span className="flex items-center gap-1.5">
            <span className="num font-[620] text-ink">{bn(stats.fresh)}</span> প্রোডাক্ট অপেক্ষায়
          </span>
          {batches.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="num font-[620] text-ink">{bn(batches.length)}</span> ব্যাচ
            </span>
          ) : null}
          {demoMode && captions.length > 0 ? <Badge tone="sky">ডেমো ক্যাপশন</Badge> : null}
        </div>

        {batches.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Link
              href={`/today?page=${active.slug}`}
              className={cn(
                "rounded-full border px-3 py-1 text-[11.5px] transition-colors",
                !params.batch
                  ? "border-ink bg-ink text-[#FFFDF8]"
                  : "border-line bg-card text-ink-soft hover:border-ink/25",
              )}
            >
              সব ব্যাচ
            </Link>
            {batches.map((batch) => {
              const activeBatch = String(batch.batch) === params.batch;
              return (
                <Link
                  key={batch.id}
                  href={`/today?page=${active.slug}&batch=${batch.batch}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11.5px] transition-colors",
                    activeBatch
                      ? "border-ink bg-ink text-[#FFFDF8]"
                      : "border-line bg-card text-ink-soft hover:border-ink/25",
                  )}
                >
                  {batch.batch === 0 ? "একক" : `ব্যাচ ${bn(batch.batch)}`}
                  <span className="num ml-1.5 opacity-60">{bn(Math.round(batch.count / 3))}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </header>

      {feed.length === 0 ? (
        <section className="animate-rise">
          <div className="card-surface relative overflow-hidden p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative max-w-[54ch]">
              <SectionLabel>শুরু করুন</SectionLabel>
              <h2 className="mt-2 text-[22px] leading-snug sm:text-[26px]">
                আজকের ক্যাপশন এখনো তৈরি হয়নি।
              </h2>
              <p className="mt-2 text-[13.5px] leading-[1.85] text-ink-soft">
                এক ক্লিকে {active.name}-এর জন্য {bn(active.dailyCount)}টি প্রোডাক্ট বেছে নিয়ে ইমেজ,
                ভিডিও আর সমস্যা-সমাধান — তিন ধরনের ক্যাপশন তৈরি হবে। প্রতিটি পোস্টারের জন্য আলাদা
                প্রিভিউও পাবেন।
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <GenerateMore
                  pageSlug={active.slug}
                  count={active.dailyCount}
                  label={`${bn(active.dailyCount)}টা ক্যাপশন তৈরি করুন`}
                  size="lg"
                />
                <span className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                  <IconClock size={14} /> সাধারণত ৩০ সেকেন্ডের মধ্যে রেডি
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { title: "৩ ধরনের ক্যাপশন", text: "ইমেজ, ভিডিও-হুক আর সমস্যা-সমাধান — প্রতিটি আলাদা কাজের জন্য।" },
              { title: "নো-রিপিট", text: "একই প্রোডাক্ট নির্দিষ্ট দিন পর্যন্ত ফিডে ফিরে আসবে না।" },
              { title: "ব্র্যান্ড কিট", text: "পেজের টোন, হ্যাশট্যাগ আর পোস্টার রঙ আলাদা থাকে।" },
            ].map((item) => (
              <div key={item.title} className="rounded-[16px] border border-line/80 bg-card/60 p-4">
                <p className="flex items-center gap-1.5 text-[12.5px] font-[600]">
                  <IconSpark size={14} className="text-accent" /> {item.title}
                </p>
                <p className="mt-1 text-[12px] leading-[1.75] text-ink-soft">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            {feed.map((group, index) => (
              <ProductCard
                key={group.product.id}
                page={active}
                product={group.product}
                captions={group.captions}
                index={index}
                demoMode={demoMode}
              />
            ))}
          </section>

          <footer className="flex flex-col items-start gap-3 rounded-[18px] border border-dashed border-line bg-card/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-ink-soft">
              সব পোস্ট শেষ? আরেক ব্যাচ নিন — আজকের বাকি প্রোডাক্ট থেকে স্বয়ংক্রিয়ভাবে বেছে নেওয়া হবে।
            </p>
            <GenerateMore pageSlug={active.slug} count={active.dailyCount} label="আরেক ব্যাচ" variant="primary" size="sm" />
          </footer>
        </>
      )}

      {stats.fresh === 0 ? (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-sky/20 bg-sky-soft/60 px-4 py-3 text-[12.5px] leading-[1.75] text-sky">
          <IconAlert size={16} className="mt-0.5 shrink-0" />
          <p>
            এই পেজের সব প্রোডাক্ট ইতিমধ্যে ব্যবহৃত। নতুন প্রোডাক্ট সিঙ্ক করুন, নয়তো রিপিট গ্যাপ কমিয়ে
            ({bn(active.repeatGapDays)} দিন) পুরনো প্রোডাক্ট আবার চালু করুন।
          </p>
        </div>
      ) : null}
    </div>
  );
}
