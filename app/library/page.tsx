import Link from "next/link";
import { PageTabs } from "@/components/shell/page-tabs";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty";
import { IconPoster, IconSearch } from "@/components/ui/icons";
import { listCaptions, listPages } from "@/lib/data";
import { captionCopyText } from "@/lib/facebook-text";
import { bn, bnDate, excerpt } from "@/lib/format";
import { CAPTION_TYPES, type CaptionStatus, type CaptionType } from "@/lib/types";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<CaptionType, string> = {
  image: "ইমেজ",
  video: "ভিডিও",
  problem: "সমস্যা",
};

const STATUS_TONE: Record<CaptionStatus, "moss" | "accent" | "neutral" | "sky" | "berry"> = {
  posted: "moss",
  ready: "accent",
  edited: "sky",
  draft: "neutral",
  rejected: "berry",
  failed: "berry",
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const pages = await listPages();
  const active = pages.find((page) => page.slug === params.page);
  const [{ items, products }] = await Promise.all([
    listCaptions({
      pageId: active?.id,
      search: params.q,
      type: (params.type as CaptionType) ?? "all",
      status: (params.status as CaptionStatus) ?? "all",
      limit: 60,
    }),
  ]);

  const grouped = new Map<string, typeof items>();
  for (const caption of items) {
    const list = grouped.get(caption.runDate) ?? [];
    list.push(caption);
    grouped.set(caption.runDate, list);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <p className="text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">ক্যাপশন লাইব্রেরি</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] leading-tight sm:text-[30px]">আগের সব ক্যাপশন</h1>
            <p className="mt-1 max-w-[60ch] text-[13px] text-ink-soft">
              সার্চ করুন, পুনরায় ব্যবহার করুন — অথবা দেখুন কোন ক্যাপশন পোস্ট হয়েছে।
            </p>
          </div>
          <Badge tone="neutral">{bn(items.length)}টি ফলাফল</Badge>
        </div>
        <div className="mt-4">
          <PageTabs pages={pages} activeSlug={active?.slug} basePath="/library" showAll />
        </div>
      </header>

      <form action="/library" method="get" className="flex flex-wrap items-center gap-2">
        {active ? <input type="hidden" name="page" value={active.slug} /> : null}
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <IconSearch size={16} />
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="ক্যাপশন বা প্রোডাক্টের লেখা খুঁজুন…"
            className="h-10 w-full rounded-[12px] border border-line bg-card pl-9 pr-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <select
          name="type"
          defaultValue={params.type ?? "all"}
          className="h-10 rounded-[12px] border border-line bg-card px-3 text-[13px] text-ink-soft outline-none focus:border-accent"
        >
          <option value="all">সব ধরন</option>
          {CAPTION_TYPES.map((type) => (
            <option key={type.type} value={type.type}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? "all"}
          className="h-10 rounded-[12px] border border-line bg-card px-3 text-[13px] text-ink-soft outline-none focus:border-accent"
        >
          <option value="all">সব স্ট্যাটাস</option>
          <option value="posted">পোস্ট হয়েছে</option>
          <option value="ready">রেডি</option>
          <option value="edited">এডিটেড</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-[12px] border border-ink bg-ink px-4 text-[13px] font-[560] text-[#FFFDF8]"
        >
          খুঁজুন
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="কিছু পাওয়া যায়নি"
          description="ফিল্টার বদলে দেখুন, অথবা আজকের ফিডে গিয়ে নতুন ক্যাপশন তৈরি করুন।"
        />
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grouped.entries()).map(([date, captions]) => (
            <section key={date}>
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-[12.5px] font-[640] text-ink-soft">{bnDate(date)}</h2>
                <span className="h-px flex-1 bg-line/70" />
                <span className="num text-[11px] text-ink-faint">{bn(captions.length)}</span>
              </div>
              <ul className="overflow-hidden rounded-[18px] border border-line bg-card">
                {captions.map((caption) => {
                  const product = products.get(caption.productId);
                  return (
                    <li key={caption.id} className="border-b border-line/60 px-4 py-3 last:border-b-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <Badge tone={caption.type === "image" ? "neutral" : caption.type === "video" ? "sky" : "accent"}>
                            {TYPE_LABEL[caption.type]}
                          </Badge>
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-[580]">{product?.nameBn ?? "প্রোডাক্ট"}</p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.75] text-ink-soft">
                              {excerpt(caption.body, 170)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge tone={STATUS_TONE[caption.status]}>{caption.status === "posted" ? "পোস্ট" : "রেডি"}</Badge>
                          <Link
                            href={`/poster/${caption.id}`}
                            aria-label="পোস্টার"
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-line text-ink-soft",
                              "transition-colors hover:border-ink/25 hover:text-ink",
                            )}
                          >
                            <IconPoster size={14} />
                          </Link>
                          <CopyButton
                            text={captionCopyText(caption.body, caption.hashtags)}
                            label="কপি"
                            variant="quiet"
                            className="h-8 px-2.5 text-[11.5px]"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
