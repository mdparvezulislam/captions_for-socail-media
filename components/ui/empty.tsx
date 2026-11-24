import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-surface flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card-soft text-accent">
          {icon}
        </span>
      ) : null}
      <h3 className="text-[17px] font-[620]">{title}</h3>
      {description ? <p className="max-w-[42ch] text-[13.5px] leading-[1.8] text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line/80", className)} />;
}
