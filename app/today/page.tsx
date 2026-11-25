import { PageTabs } from "@/components/shell/page-tabs";
import { GenerateMore } from "@/components/today/generate-more";
import { ModeratorTaskGrid } from "@/components/today/moderator-task-grid";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { IconAlert, IconClock, IconSpark } from "@/components/ui/icons";
import { isLiveAiAvailable } from "@/lib/captions";
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
  const demoMode = !isLiveAiAvailable();

  return (
    <div className="flex flex-col gap-2.5 sm:gap-4">
      <header className="animate-fade flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-[620] uppercase tracking-[0.14em] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {bnFullDate(date)}
              <span className="text-ink-faint/60">·</span>
              <span className="num text-moss">{bn(readyCount)} রেডি</span>
              <span className="text-ink-faint/60">·</span>
              <span className="num text-berry">{bn(remaining)} বাকি</span>
              {demoMode ? <Badge tone="sky">ডেমো</Badge> : null}
            </p>
            <h1 className="mt-0.5 text-[20px] leading-[1.25] sm:text-[26px]">
              🔥 আজ কী পোস্ট করবেন
            </h1>
            <p className="mt-0.5 hidden max-w-[58ch] text-[12.5px] leading-[1.6] text-ink-soft sm:block">
              প্রায়োরিটি: ক্যাপশন বাকি আগে ➜ স্কোর ➜ নতুন পণ্য। যেকোনো প্রোডাক্টে ক্লিক করলেই তাৎক্ষণিক ক্যাপশন স্টুডিও খুলবে।
            </p>
          </div>
          <GenerateMore
            pageSlug={active.slug}
            count={Math.min(active.dailyCount, remaining || active.dailyCount)}
            label={remaining > 0 ? `${bn(Math.min(remaining, active.dailyCount))}টার ক্যাপশন তৈরি করুন` : "আরেক ব্যাচ"}
            variant="accent"
            size="sm"
          />
        </div>

        <PageTabs pages={pages} activeSlug={active.slug} basePath="/today" className="py-0" />
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
