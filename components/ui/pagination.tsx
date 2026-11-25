"use client";

import { bn } from "@/lib/format";
import { cn } from "@/lib/cn";

function buildPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  className,
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0 || totalPages <= 1) {
    return totalItems > 0 ? (
      <div className={cn("flex items-center justify-center pt-1 text-[11.5px] text-ink-faint", className)}>
        মোট <span className="num mx-1 font-[600] text-ink-soft">{bn(totalItems)}</span>টি প্রোডাক্ট
      </div>
    ) : null;
  }

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
  const from = (safeCurrent - 1) * pageSize + 1;
  const to = Math.min(totalItems, safeCurrent * pageSize);
  const pages = buildPages(safeCurrent, totalPages);

  return (
    <nav
      aria-label="পৃষ্ঠা নেভিগেশন"
      data-testid="pagination-bar"
      className={cn(
        "flex flex-col items-center justify-between gap-2 rounded-[14px] border border-line/80 bg-card/80 px-3 py-2 sm:flex-row",
        className,
      )}
    >
      <p className="num text-[11.5px] text-ink-soft">
        দেখানো হচ্ছে <span className="font-[640] text-ink">{bn(from)}–{bn(to)}</span> · মোট{" "}
        <span className="font-[640] text-ink">{bn(totalItems)}</span>টি
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safeCurrent <= 1}
          onClick={() => onPageChange(safeCurrent - 1)}
          aria-label="আগের পৃষ্ঠা"
          className={cn(
            "inline-flex h-8 items-center gap-0.5 rounded-[10px] border px-2.5 text-[12px] font-[560] transition-colors",
            safeCurrent <= 1
              ? "cursor-not-allowed border-line/60 bg-card/50 text-ink-faint opacity-50"
              : "border-line bg-card text-ink hover:border-ink/30 hover:bg-card-soft active:scale-95",
          )}
        >
          <span aria-hidden>‹</span> আগে
        </button>

        <div className="flex items-center gap-1">
          {pages.map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`el-${idx}`} className="px-1 text-[12px] text-ink-faint">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === safeCurrent ? "page" : undefined}
                aria-label={`পৃষ্ঠা ${bn(item)}`}
                className={cn(
                  "num inline-flex h-8 min-w-[32px] items-center justify-center rounded-[10px] border px-2 text-[12px] font-[620] transition-colors active:scale-95",
                  item === safeCurrent
                    ? "border-accent bg-accent text-white shadow-[0_6px_14px_-8px_rgba(207,79,23,0.9)]"
                    : "border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink",
                )}
              >
                {bn(item)}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={safeCurrent >= totalPages}
          onClick={() => onPageChange(safeCurrent + 1)}
          aria-label="পরবর্তী পৃষ্ঠা"
          className={cn(
            "inline-flex h-8 items-center gap-0.5 rounded-[10px] border px-2.5 text-[12px] font-[560] transition-colors",
            safeCurrent >= totalPages
              ? "cursor-not-allowed border-line/60 bg-card/50 text-ink-faint opacity-50"
              : "border-line bg-card text-ink hover:border-ink/30 hover:bg-card-soft active:scale-95",
          )}
        >
          পরে <span aria-hidden>›</span>
        </button>
      </div>
    </nav>
  );
}
