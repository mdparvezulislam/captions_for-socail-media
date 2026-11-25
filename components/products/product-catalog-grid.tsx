"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CaptionWorkspaceDrawer } from "@/components/today/caption-workspace-drawer";
import { Pagination } from "@/components/ui/pagination";
import { IconArrowUpRight, IconSearch, IconSpark, IconX } from "@/components/ui/icons";
import { bn, bnNumber, discountPercent, taka } from "@/lib/format";
import { imageSrcFor } from "@/lib/facebook-text";
import { cn } from "@/lib/cn";
import type { Page } from "@/lib/types";
import type { TaskProduct } from "@/lib/data";

type CatalogFilter = "all" | "ready" | "remaining" | "offer" | "instock";

const PAGE_SIZE = 20;

const FILTER_META: { key: CatalogFilter; label: string }[] = [
  { key: "all", label: "সকল" },
  { key: "ready", label: "✓ ক্যাপশন রেডি" },
  { key: "remaining", label: "⏰ বাকি" },
  { key: "offer", label: "🏷️ অফার" },
  { key: "instock", label: "📦 স্টকে আছে" },
];

export function ProductCatalogGrid({
  page,
  tasks,
  initialQuery = "",
  initialCategory = "all",
  initialPage = 1,
}: {
  page: Page;
  tasks: TaskProduct[];
  initialQuery?: string;
  initialCategory?: string;
  initialPage?: number;
}) {
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [category, setCategory] = useState<string>(initialCategory || "all");
  const [query, setQuery] = useState<string>(initialQuery || "");
  const [currentPage, setCurrentPage] = useState<number>(Math.max(1, initialPage));
  const [selected, setSelected] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Sync URL query params cleanly without full page reload when user switches page/search/cat
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, category, query, page.slug]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      const cat = t.product.category?.trim() || "অন্যান্য";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [tasks]);

  const counts: Record<CatalogFilter, number> = useMemo(() => {
    let ready = 0;
    let remaining = 0;
    let offer = 0;
    let instock = 0;
    for (const t of tasks) {
      if (t.hasCaptionsToday) ready++;
      else remaining++;
      if (discountPercent(t.product.priceBdt, t.product.compareAtPriceBdt) > 0) offer++;
      if (t.product.stock > 0) instock++;
    }
    return { all: tasks.length, ready, remaining, offer, instock };
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const p = task.product;
      if (filter === "ready" && !task.hasCaptionsToday) return false;
      if (filter === "remaining" && task.hasCaptionsToday) return false;
      if (filter === "offer" && discountPercent(p.priceBdt, p.compareAtPriceBdt) <= 0) return false;
      if (filter === "instock" && p.stock <= 0) return false;

      if (category !== "all" && (p.category?.trim() || "অন্যান্য") !== category) {
        return false;
      }

      if (q) {
        const hay = `${p.nameBn} ${p.sourceId} ${p.category} ${p.problemBn} ${p.solutionBn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, category, query, tasks]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const hasActiveFilter = filter !== "all" || category !== "all" || query.trim().length > 0;

  function goToPage(next: number) {
    setCurrentPage(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div ref={topRef} className="flex flex-col gap-2">
      {/* মিনিমাল কম্প্যাক্ট টপবার: সার্চ + সাইড-স্ক্রল স্ট্যাটাস ও ক্যাটাগরি */}
      <div className="flex flex-col gap-1.5 rounded-[14px] border border-line/80 bg-card/85 p-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
              <IconSearch size={14} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="নাম, SKU, ক্যাটাগরি বা সমস্যা দিয়ে খুঁজুন…"
              aria-label="প্রোডাক্ট খুঁজুন"
              className="h-9 w-full rounded-[10px] border border-line bg-paper/60 pl-8 pr-8 text-[12.5px] outline-none transition-colors focus:border-accent focus:bg-card"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="সার্চ মুছুন"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-paper-deep hover:text-ink"
              >
                <IconX size={13} />
              </button>
            ) : null}
          </div>
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setCategory("all");
                setQuery("");
              }}
              className="h-9 shrink-0 rounded-[10px] border border-line bg-card px-2.5 text-[11.5px] font-[560] text-ink-soft hover:border-ink/25 hover:text-ink"
            >
              রিসেট
            </button>
          ) : null}
        </div>

        {/* স্ট্যাটাস ফিল্টার — সাইড স্ক্রল */}
        <div className="scroll-x flex items-center gap-1" role="tablist" aria-label="প্রোডাক্ট ফিল্টার">
          {FILTER_META.map((item) => {
            const active = filter === item.key;
            const count = counts[item.key];
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-[560] transition-colors",
                  active
                    ? "border-ink bg-ink text-[#FFFDF8]"
                    : "border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "num rounded-full px-1.5 text-[10px]",
                    item.key === "remaining" && count > 0 && !active
                      ? "bg-berry text-white"
                      : item.key === "ready" && count > 0 && !active
                        ? "bg-moss-soft text-moss"
                        : active
                          ? "bg-white/20"
                          : "bg-paper-deep text-ink-soft",
                  )}
                >
                  {bn(count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* ক্যাটাগরি পিলস — সাইড স্ক্রল */}
        {categories.length > 1 ? (
          <div
            className="scroll-x flex items-center gap-1 border-t border-line/50 pt-1.5"
            role="tablist"
            aria-label="ক্যাটাগরি ফিল্টার"
            data-testid="products-category-bar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={category === "all"}
              onClick={() => setCategory("all")}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-[560] transition-colors",
                category === "all"
                  ? "border-accent bg-accent-soft text-accent-deep"
                  : "border-line/80 bg-paper/50 text-ink-soft hover:border-ink/20 hover:text-ink",
              )}
            >
              সব ক্যাটাগরি
              <span className="num text-[10px] opacity-75">{bn(tasks.length)}</span>
            </button>
            {categories.map(([cat, count]) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-[560] transition-colors",
                    active
                      ? "border-accent bg-accent-soft text-accent-deep"
                      : "border-line/80 bg-paper/50 text-ink-soft hover:border-ink/20 hover:text-ink",
                  )}
                >
                  {cat}
                  <span className="num text-[10px] opacity-75">{bn(count)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* প্রোডাক্ট কার্ড গ্রিড (প্রতি পৃষ্ঠায় ২০টি) */}
      {paged.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-2 px-6 py-10 text-center">
          <p className="text-[14px] font-[600]">এই ফিল্টারে কোনো প্রোডাক্ট পাওয়া যায়নি</p>
          <p className="text-[12px] text-ink-soft">অন্য কীওয়ার্ড বা ক্যাটাগরি দিয়ে খুঁজুন।</p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5"
          data-testid="products-grid"
        >
          {paged.map((task) => {
            const { product } = task;
            const disc = discountPercent(product.priceBdt, product.compareAtPriceBdt);
            const galleryCount = product.enrich?.images?.length ?? (product.imageUrl ? 1 : 0);
            const isSelected = selected === product.id;

            return (
              <li
                key={product.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-[14px] border bg-card transition-all duration-150",
                  isSelected
                    ? "border-accent ring-2 ring-accent shadow-[0_14px_30px_-20px_rgba(207,79,23,0.8)]"
                    : "border-line hover:border-ink/25 hover:shadow-[0_12px_26px_-18px_rgba(23,19,15,0.5)]",
                )}
              >
                {/* কার্ডে ক্লিক করলে সাথে সাথে ইনস্ট্যান্ট ক্যাপশন স্টুডিও খুলবে */}
                <button
                  type="button"
                  onClick={() => setSelected(product.id)}
                  className="flex flex-1 flex-col text-left active:scale-[0.99]"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-paper-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrcFor(product)}
                      alt={product.nameBn}
                      width={260}
                      height={260}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    {task.hasCaptionsToday ? (
                      <span className="absolute right-1.5 top-1.5 rounded-[7px] bg-moss px-1.5 py-0.5 text-[10px] font-[640] text-white shadow-sm">
                        ✓ রেডি
                      </span>
                    ) : (
                      <span className="absolute right-1.5 top-1.5 rounded-[7px] bg-berry px-1.5 py-0.5 text-[10px] font-[640] text-white shadow-sm">
                        বাকি
                      </span>
                    )}
                    {disc > 0 ? (
                      <span className="num absolute left-1.5 top-1.5 rounded-[7px] bg-accent px-1.5 py-0.5 text-[9.5px] font-[650] text-white shadow-sm">
                        -{bn(disc)}%
                      </span>
                    ) : null}
                    {galleryCount > 1 ? (
                      <span className="num absolute bottom-1.5 left-1.5 rounded-full bg-ink/75 px-1.5 py-0.5 text-[9.5px] font-[600] text-white backdrop-blur-xs">
                        {bn(galleryCount)} ছবি
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col px-2.5 pb-1.5 pt-2">
                    <p className="line-clamp-2 min-h-[2.3rem] text-[12px] font-[580] leading-[1.35] text-ink">
                      {product.nameBn}
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                      <span className="num text-[13px] font-[680] text-accent-deep">{taka(product.priceBdt)}</span>
                      {product.compareAtPriceBdt ? (
                        <span className="num text-[10.5px] text-ink-faint line-through">
                          {taka(product.compareAtPriceBdt)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-ink-faint">
                      <span className="truncate">{product.category}</span>
                      <span className={cn("num shrink-0", product.stock <= 5 ? "text-berry" : "")}>
                        স্টক {bnNumber(product.stock)}
                      </span>
                    </div>
                  </div>
                </button>

                {/* দ্রুত ক্যাপশন / বিস্তারিত ফুটার */}
                <div className="flex items-center justify-between gap-1 border-t border-line/60 bg-card-soft/60 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setSelected(product.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-[620] text-accent-deep hover:text-accent"
                  >
                    <IconSpark size={12} /> ক্যাপশন
                  </button>
                  <Link
                    href={`/products/${product.id}`}
                    className="inline-flex items-center gap-0.5 text-[10.5px] font-[540] text-ink-faint hover:text-ink"
                  >
                    বিস্তারিত
                    <IconArrowUpRight size={11} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* প্যাজিনেশন (প্রতি পৃষ্ঠায় ২০টি) */}
      <Pagination
        currentPage={safePage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={goToPage}
        className="mt-1"
      />

      {/* ইনস্ট্যান্ট ক্যাপশন স্টুডিও ড্রয়ার — /products থেকেই সরাসরি ক্যাপশন ও পোস্টার */}
      {selected ? (
        <CaptionWorkspaceDrawer
          productId={selected}
          onClose={() => setSelected(null)}
          onNavigate={(id) => setSelected(id)}
        />
      ) : null}
    </div>
  );
}
