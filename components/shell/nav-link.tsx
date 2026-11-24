"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  icon,
  children,
  compact = false,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-[12px] text-[14px] transition-colors duration-150",
        compact ? "flex-col gap-1 px-1 py-2 text-[10.5px]" : "px-3 py-2.5",
        active ? "bg-ink text-[#FFFDF8]" : "text-ink-soft hover:bg-ink/[0.045] hover:text-ink",
      )}
    >
      <span className={cn("shrink-0", active ? "text-[#FFFDF8]" : "text-ink-faint group-hover:text-ink")}>{icon}</span>
      <span className={cn("font-[560]", compact && "leading-none")}>{children}</span>
    </Link>
  );
}
