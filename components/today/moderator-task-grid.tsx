"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaptionWorkspaceDrawer } from "@/components/today/caption-workspace-drawer";
import { Pagination } from "@/components/ui/pagination";
import { IconSearch, IconX } from "@/components/ui/icons";
import { bn, discountPercent, taka } from "@/lib/format";
import { imageSrcFor } from "@/lib/facebook-text";
import { cn } from "@/lib/cn";
import type { Page } from "@/lib/types";
import type { TaskProduct } from "@/lib/data";

type Filter = "all" | "remaining" | "ready" | "pinned" | "favorite" | "recent";

const PAGE_SIZE = 20;

const FILTER_META: { key: Filter; label: string }[] = [
  { key: "all", label: "সকল" },
  { key: "remaining", label: "⏰ ক্যাপশন বাকি" },
  { key: "ready", label: "✓ রেডি" },
  { key: "pinned", label: "📌 পিন করা" },
  { key: "favorite", label: "⭐ ফেভারিট" },
  { key: "recent", label: "🕒 সাম্প্রতিক" },
];

function useStoredIds(scope: string, kind: "pinned" | "favorite"): [Set<string>, () => void] {
  const key = `captions-studio:${kind}:${scope}`;
  const [ids, setIds] = useState<Set<string>>(new Set());

  const refresh = () => {
    try {
      const raw = window.localStorage.getItem(key);
      setIds(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refresh();
    window.addEventListener("task-list-changed", refresh);
    return () => window.removeEventListener("task-list-changed", refresh);
  }, [key]);

  return [ids, refresh];
}

export function ModeratorTaskGrid({
  page,
  tasks,
  initialProductId,
}: {
  page: Page;
  tasks: TaskProduct[];
  initialProductId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(initialProductId ?? null);
  const [pinnedIds] = useStoredIds(page.slug, "pinned");
  const [favoriteIds] = useStoredIds(page.slug, "favorite");
  const topRef = useRef<HTMLDivElement>(null);

  // Deep-link (?product=id) বারবার এলেও ড্রয়ার সিঙ্ক হয়
  useEffect(() => {
    if (initialProductId) setSelected(initialProductId);
  }, [initialProductId]);

  // Reset to page 1 when filters/search/category change
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

  const counts: Record<Filter, number> = useMemo(() => {
    let remaining = 0;
    let ready = 0;
    let pinned = 0;
    let favorite = 0;
    let recent = 0;
    for (const task of tasks) {
      if (task.hasCaptionsToday) ready++;
      else remaining++;
      if (pinnedIds.has(task.product.id)) pinned++;
      if (favoriteIds.has(task.product.id)) favorite++;
      if (task.recent) recent++;
    }
    return { all: tasks.length, remaining, ready, pinned, favorite, recent };
  }, [tasks, pinnedIds, favoriteIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filter === "pinned" && !pinnedIds.has(task.product.id)) return false;
      if (filter === "favorite" && !favoriteIds.has(task.product.id)) return false;
      if (filter === "remaining" && task.hasCaptionsToday) return false;
      if (filter === "ready" && !task.hasCaptionsToday) return false;
      if (filter === "recent" && !task.recent) return false;

      if (category !== "all" && (task.product.category?.trim() || "অন্যান্য") !== category) {
        return false;
      }

      if (q) {
        const p = task.product;
        const hay = `${p.nameBn} ${p.sourceId} ${p.category} ${p.problemBn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, category, query, tasks, pinnedIds, favoriteIds]);

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
      <div className="flex flex-col gap-1.5 rounded-[14px] border border-line/80 bg-card/80 p-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
              <IconSearch size={14} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="প্রোডাক্ট, SKU বা ক্যাটাগরি খুঁজুন…"
              aria-label="প্রোডাক্ট খুঁজুন"
              className="h-8.5 w-full rounded-[10px] border border-line bg-paper/60 pl-8 pr-8 text-[12.5px] outline-none transition-colors focus:border-accent focus:bg-card"
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
              className="h-8.5 shrink-0 rounded-[10px] border border-line bg-card px-2.5 text-[11.5px] font-[560] text-ink-soft hover:border-ink/25 hover:text-ink"
            >
              রিসেট
            </button>
          ) : null}
        </div>

        {/* স্ট্যাটাস ফিল্টার — সাইড স্ক্রল */}
        <div className="scroll-x flex items-center gap-1" role="tablist" aria-label="স্ট্যাটাস ফিল্টার">
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
                  "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-[560] transition-colors duration-150",
                  active
                    ? "border-ink bg-ink text-[#FFFDF8]"
                    : "border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "num rounded-full px-1.5 text-[10px]",
                    item.key === "remaining" && count > 0
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

        {/* ক্যাটাগরি ফিল্টার — সাইড স্ক্রল */}
        {categories.length > 1 ? (
          <div
            className="scroll-x flex items-center gap-1 border-t border-line/50 pt-1.5"
            role="tablist"
            aria-label="ক্যাটাগরি ফিল্টার"
            data-testid="category-bar"
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
          <p className="text-[14px] font-[600]">
            {filter === "remaining" && !query && category === "all"
              ? "সব ক্যাপশন রেডি — দুর্দান্ত! 🎉"
              : "এই ফিল্টারে কোনো প্রোডাক্ট নেই"}
          </p>
          <p className="text-[12px] text-ink-soft">অন্য ক্যাটাগরি বা কীওয়ার্ড দিয়ে চেষ্টা করুন।</p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-6"
          data-testid="task-grid"
        >
          {paged.map((task) => {
            const { product } = task;
            const isSelected = selected === product.id;
            const disc = discountPercent(product.priceBdt, product.compareAtPriceBdt);
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setSelected(product.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "group w-full overflow-hidden rounded-[14px] border bg-card text-left transition-all duration-150 active:scale-[0.98]",
                    isSelected
                      ? "border-accent ring-2 ring-accent shadow-[0_14px_30px_-20px_rgba(207,79,23,0.8)]"
                      : "border-line hover:border-ink/20 hover:shadow-[0_10px_24px_-18px_rgba(23,19,15,0.5)]",
                  )}
                >
                  <div className="relative aspect-square overflow-hidden bg-paper-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrcFor(product)}
                      alt=""
                      width={240}
                      height={240}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    {task.hasCaptionsToday ? (
                      <span className="num absolute right-1.5 top-1.5 rounded-[7px] bg-moss px-1.5 py-0.5 text-[10px] font-[640] text-white shadow-sm">
                        ✓ {bn(task.percent)}%
                      </span>
                    ) : (
                      <span className="absolute right-1.5 top-1.5 rounded-[7px] bg-berry px-1.5 py-0.5 text-[10px] font-[640] text-white shadow-sm">
                        বাকি
                      </span>
                    )}
                    {pinnedIds.has(product.id) || favoriteIds.has(product.id) ? (
                      <span className="absolute left-1.5 top-1.5 rounded-[7px] bg-white/90 px-1 py-0.5 text-[10px]">
                        {pinnedIds.has(product.id) ? "📌" : "⭐"}
                      </span>
                    ) : disc > 0 ? (
                      <span className="num absolute left-1.5 top-1.5 rounded-[7px] bg-accent px-1.5 py-0.5 text-[9.5px] font-[650] text-white">
                        -{bn(disc)}%
                      </span>
                    ) : null}
                  </div>
                  <div className="px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2.5 sm:pt-2">
                    <p className="line-clamp-2 min-h-[2.25rem] text-[11.5px] font-[560] leading-[1.35] text-ink sm:text-[12px]">
                      {product.nameBn}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-1">
                      <span className="num text-[12.5px] font-[660] text-accent-deep sm:text-[13px]">
                        {taka(product.priceBdt)}
                      </span>
                      <span className="truncate text-[9.5px] text-ink-faint">{product.category}</span>
                    </div>
                  </div>
                </button>
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

      {/* ইনস্ট্যান্ট ক্যাপশন স্টুডিও ড্রয়ার */}
      {selected ? (
        <CaptionWorkspaceDrawer
          productId={selected}
          onClose={() => {
            setSelected(null);
            if (initialProductId) {
              window.history.replaceState({}, "", `/today?page=${page.slug}`);
            }
          }}
          onNavigate={(id) => setSelected(id)}
        />
      ) : null}
    </div>
  );
}
