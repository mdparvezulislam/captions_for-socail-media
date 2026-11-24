import Link from "next/link";
import type { Page } from "@/lib/types";
import { cn } from "@/lib/cn";

export function PageTabs({
  pages,
  activeSlug,
  basePath,
  showAll = false,
  allLabel = "সব পেজ",
  className,
}: {
  pages: Page[];
  activeSlug?: string;
  basePath: string;
  showAll?: boolean;
  allLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("scroll-x -mx-1 flex items-center gap-1.5 px-1 py-1", className)}>
      {showAll ? (
        <Link
          href={basePath}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors duration-150",
            !activeSlug
              ? "border-ink bg-ink text-[#FFFDF8]"
              : "border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink",
          )}
        >
          {allLabel}
        </Link>
      ) : null}
      {pages.map((page) => {
        const active = page.slug === activeSlug;
        return (
          <Link
            key={page.id}
            href={`${basePath}?page=${page.slug}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors duration-150",
              active
                ? "border-ink bg-ink text-[#FFFDF8]"
                : "border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink",
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: active ? page.brand.accent : page.brand.accent, opacity: active ? 1 : 0.75 }}
            />
            <span className="font-[560]">{page.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
