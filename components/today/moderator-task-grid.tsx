"use client";

import { useEffect, useMemo, useState } from "react";
import { CaptionWorkspaceDrawer } from "@/components/today/caption-workspace-drawer";
import { Badge } from "@/components/ui/badge";
import { IconAlert, IconPin, IconSpark } from "@/components/ui/icons";
import { bn, taka } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Page } from "@/lib/types";
import type { TaskProduct } from "@/lib/data";

type Filter = "all" | "pinned" | "remaining" | "favorite" | "recent";

const FILTER_META: { key: Filter; label: string }[] = [
  { key: "all", label: "সকল" },
  { key: "pinned", label: "📌 পিন করা" },
  { key: "remaining", label: "⏰ ক্যাপশন বাকি" },
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
  const [selected, setSelected] = useState<string | null>(initialProductId ?? null);
  const [pinnedIds] = useStoredIds(page.slug, "pinned");
  const [favoriteIds] = useStoredIds(page.slug, "favorite");

  const remainingCount = useMemo(() => tasks.filter((task) => !task.hasCaptionsToday).length, [tasks]);
  const recentCount = useMemo(() => tasks.filter((task) => task.recent).length, [tasks]);

  const counts: Record<Filter, number> = {
    all: tasks.length,
    pinned: tasks.filter((task) => pinnedIds.has(task.product.id)).length,
    remaining: remainingCount,
    favorite: tasks.filter((task) => favoriteIds.has(task.product.id)).length,
    recent: recentCount,
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "pinned":
        return tasks.filter((task) => pinnedIds.has(task.product.id));
      case "favorite":
        return tasks.filter((task) => favoriteIds.has(task.product.id));
      case "remaining":
        return tasks.filter((task) => !task.hasCaptionsToday);
      case "recent":
        return tasks.filter((task) => task.recent);
      default:
        return tasks;
    }
  }, [filter, tasks, pinnedIds, favoriteIds]);

  return (
    <div className="flex flex-col gap-3">
      {/* ফিল্টার পিলস */}
      <div className="scroll-x -mx-1 flex items-center gap-1.5 px-1 py-0.5" role="tablist" aria-label="ফিল্টার">
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
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-[560] transition-colors duration-150",
                active
                  ? "border-ink bg-ink text-[#FFFDF8]"
                  : "border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "num rounded-full px-1.5 text-[10.5px]",
                  item.key === "remaining" && count > 0
                    ? "bg-berry text-white"
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

      {/* গ্রিড */}
      {filtered.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-2 px-6 py-10 text-center">
          <p className="text-[14px] font-[600]">
            {filter === "remaining" ? "সব ক্যাপশন রেডি — দুর্দান্ত! 🎉" : "এই ফিল্টারে কিছু নেই"}
          </p>
          <p className="text-[12px] text-ink-soft">অন্য ফিল্টার দেখুন বা প্রোডাক্ট সিঙ্ক করুন।</p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          data-testid="task-grid"
        >
          {filtered.map((task) => {
            const { product } = task;
            const isSelected = selected === product.id;
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setSelected(product.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "group w-full overflow-hidden rounded-[16px] border bg-card text-left transition-all duration-150",
                    isSelected
                      ? "ring-2 ring-accent border-accent shadow-[0_14px_30px_-20px_rgba(207,79,23,0.8)]"
                      : "border-line hover:border-ink/20 hover:shadow-[0_10px_24px_-18px_rgba(23,19,15,0.5)]",
                  )}
                >
                  <div className="relative aspect-square overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/art/${encodeURIComponent(product.artSeed || product.id)}`}
                      alt=""
                      width={240}
                      height={240}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    {task.hasCaptionsToday ? (
                      <span className="num absolute right-1.5 top-1.5 rounded-[7px] bg-moss px-1.5 py-0.5 text-[10.5px] font-[640] text-white">
                        ✓ {bn(task.percent)}%
                      </span>
                    ) : (
                      <span className="absolute right-1.5 top-1.5 rounded-[7px] bg-berry px-1.5 py-0.5 text-[10.5px] font-[640] text-white">
                        বাকি
                      </span>
                    )}
                    {pinnedIds.has(product.id) || favoriteIds.has(product.id) ? (
                      <span className="absolute left-1.5 top-1.5 rounded-[7px] bg-white/90 px-1 py-0.5 text-[10px]">
                        {pinnedIds.has(product.id) ? "📌" : "⭐"}
                      </span>
                    ) : null}
                  </div>
                  <div className="px-2.5 pb-2.5 pt-2">
                    <p className="line-clamp-2 min-h-[2.5rem] text-[12px] font-[560] leading-[1.4] text-ink">
                      {product.nameBn}
                    </p>
                    <p className="num mt-1 text-[13px] font-[660] text-accent-deep">{taka(product.priceBdt)}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ড্রয়ার */}
      {selected ? (
        <CaptionWorkspaceDrawer
          productId={selected}
          onClose={() => {
            setSelected(null);
          }}
          onNavigate={(id) => setSelected(id)}
        />
      ) : null}
    </div>
  );
}
