"use client";

import { useState, type ReactNode } from "react";
import { IconChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function Accordion({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-[13px] font-[600] text-ink transition-colors hover:bg-card-soft/60"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <IconChevronDown size={16} className={cn("text-ink-faint transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open ? <div className="animate-fade border-t border-line/70 px-4 py-3.5">{children}</div> : null}
    </div>
  );
}
