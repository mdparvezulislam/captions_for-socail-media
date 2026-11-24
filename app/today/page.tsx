import { PageTabs } from "@/components/shell/page-tabs";
import { GenerateMore } from "@/components/today/generate-more";
import { ModeratorTaskGrid } from "@/components/today/moderator-task-grid";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { IconAlert, IconClock, IconSpark } from "@/components/ui/icons";
import { getPageStats, listPages, listTaskProducts } from "@/lib/data";
import { bn, bnFullDate, dhakaDate } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; product?: string; batch?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const pages = await listPages();
  if (pages.length === 0) {
    return (
      <EmptyState
        title="কোনো পেজ সেটআপ করা নেই"
        description="প্রথমে একটি ফেসবুক পেজ যোগ করুন, তারপর প্রোডাক্ট সিঙ্ক করে ক্যাপশন তৈরি করুন।"
      />
    );
  }

  const active = pages.find((page) => page.slug === params.page) ?? pages[0];
  const date = dhakaDate();
  const [tasks, stats] = await Promise.all([listTaskProducts(active.id, date), getPageStats(active.id, date)]);
  const readyCount = tasks.filter((task) => task.hasCaptionsToday).length;
  const remaining = tasks.length - readyCount;
  const demoMode = tasks.every((task) => !task.hasCaptionsToday);

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              ডেইলি মডারেটর টাস্ক লিস্ট · {bnFullDate(date)}
            </p>
            <h1 className="mt-2 text-[24px] leading-[1.25] sm:text-[30px]">
              🔥 আজ কী পোস্ট করবেন
            </h1>
            <p className="mt-1.5 max-w-[58ch] text-[13px] leading-[1.8] text-ink-soft">
              প্রায়োরিটি: ক্যাপশন বাকি আগে ➜ স্কোর ➜ নতুন পণ্য। যেকোনো প্রোডাক্টে ক্লিক করলেই
              তাৎক্ষণিক ক্যাপশন স্টুডিও খুলবে — পেজ রিলোড ছাড়াই।
            </p>
          </div>
          <GenerateMore
            pageSlug={active.slug}
            count={Math.min(active.dailyCount, remaining || active.dailyCount)}
            label={remaining > 0 ? `${bn(Math.min(remaining, active.dailyCount))}টার ক্যাপশন তৈরি করুন` : "আরেক ব্যাচ"}
            variant="accent"
          />
        </div>

        <div className="mt-4">
          <PageTabs pages={pages} activeSlug={active.slug} basePath="/today" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line/70 py-2.5 text-[12px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="num font-[640] text-ink">{bn(readyCount)}</span> রেডি
          </span>
          <span className="flex items-center gap-1.5">
            <span className="num font-[640] text-ink">{bn(remaining)}</span> ক্যাপশন বাকি
          </span>
          <span className="flex items-center gap-1.5">
            <span className="num font-[640] text-ink">{bn(stats.fresh)}</span> প্রোডাক্ট অপেক্ষায়
          </span>
          {demoMode ? <Badge tone="sky">ডেমো মোড</Badge> : null}
        </div>
      </header>

      {tasks.length === 0 ? (
        <section className="animate-rise">
          <div className="card-surface relative overflow-hidden p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative max-w-[54ch]">
              <h2 className="text-[22px] leading-snug sm:text-[26px]">আজকের ক্যাপশন এখনো তৈরি হয়নি।</h2>
              <p className="mt-2 text-[13.5px] leading-[1.85] text-ink-soft">
                এক ক্লিকে {active.name}-এর জন্য প্রোডাক্ট বেছে নিয়ে তিন ধরনের ক্যাপশন তৈরি হবে।
                অথবা নিচের গ্রিড থেকে যেকোনো প্রোডাক্টে ক্লিক করে এককভাবে তৈরি করুন।
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
              { title: "ইনস্ট্যান্ট স্টুডিও", text: "প্রোডাক্টে ক্লিক = সাথে সাথে ক্যাপশন ড্রয়ার — রিলোড নেই।" },
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
        <ModeratorTaskGrid page={active} tasks={tasks} initialProductId={params.product} />
      )}

      {remaining === 0 && tasks.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-moss/25 bg-moss-soft/60 px-4 py-3 text-[12.5px] leading-[1.75] text-moss">
          <IconAlert size={16} className="mt-0.5 shrink-0" />
          <p>আজকের সব ক্যাপশন রেডি! আরেক ব্যাচ নিতে চাইলে উপরের বাটনে চাপ দিন।</p>
        </div>
      ) : null}
    </div>
  );
}
