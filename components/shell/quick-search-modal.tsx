"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconSearch, IconX } from "@/components/ui/icons";
import { taka } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SearchResult } from "@/lib/data";

export function QuickSearch({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery("");
      setItems([]);
    }
  }, [open]);

  const search = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, { cache: "no-store" });
        const json = (await response.json()) as { ok: boolean; items: SearchResult[] };
        setItems(json.ok ? json.items : []);
        setActiveIndex(0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 220);
  }, []);

  function go(item: SearchResult) {
    setOpen(false);
    router.push(`/today?page=${item.pageSlug}&product=${item.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-[10px] border border-line bg-card/80 text-[12px] text-ink-faint transition-colors hover:border-ink/25 hover:text-ink",
          children ? "" : "h-9 w-9 justify-center lg:w-auto lg:px-3",
        )}
        aria-label="সার্চ (Ctrl+K)"
      >
        <IconSearch size={15} />
        <span className="hidden lg:inline">প্রোডাক্ট খুঁজুন…</span>
        <kbd className="num hidden rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] lg:inline">Ctrl K</kbd>
        {children}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="সার্চ">
          <button type="button" aria-label="বন্ধ" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="animate-rise relative w-full max-w-[520px] overflow-hidden rounded-[18px] border border-line bg-card shadow-[0_30px_80px_-30px_rgba(23,19,15,0.7)]">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <IconSearch size={16} className="text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  search(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((index) => Math.min(index + 1, items.length - 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((index) => Math.max(0, index - 1));
                  }
                  if (event.key === "Enter" && items[activeIndex]) go(items[activeIndex]);
                }}
                placeholder="প্রোডাক্টের নাম, ক্যাটাগরি বা SKU…"
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
              />
              {loading ? <span className="num text-[10.5px] text-ink-faint">…</span> : null}
              <button type="button" onClick={() => setOpen(false)} aria-label="বন্ধ" className="text-ink-faint hover:text-ink">
                <IconX size={15} />
              </button>
            </div>

            <ul className="max-h-[46vh] overflow-y-auto py-1.5">
              {items.length === 0 ? (
                <li className="px-4 py-5 text-center text-[12px] text-ink-faint">
                  {query.trim().length < 2 ? "কমপক্ষে ২ অক্ষর লিখুন" : "কিছু পাওয়া যায়নি"}
                </li>
              ) : (
                items.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        index === activeIndex ? "bg-paper-deep/60" : "hover:bg-card-soft",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-[560] text-ink">{item.name}</span>
                        <span className="block truncate text-[11px] text-ink-faint">
                          {item.pageName} · {item.category}
                        </span>
                      </span>
                      <span className="num text-[12px] font-[600] text-accent-deep">{taka(item.price)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-line/70 px-4 py-2 text-[10.5px] text-ink-faint">
              ↑↓ নেভিগেট · Enter খুলুন · Esc বন্ধ
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}
