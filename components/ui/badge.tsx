import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "moss" | "berry" | "sky" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-deep text-ink-soft border-line",
  accent: "bg-accent-soft text-accent-deep border-accent/20",
  moss: "bg-moss-soft text-moss border-moss/20",
  berry: "bg-berry-soft text-berry border-berry/20",
  sky: "bg-sky-soft text-sky border-sky/20",
  ink: "bg-ink text-[#FFFDF8] border-ink",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-[560] leading-[1.6] tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

export function Dot({ tone = "accent" }: { tone?: Tone }) {
  const color: Record<Tone, string> = {
    neutral: "bg-ink-faint",
    accent: "bg-accent",
    moss: "bg-moss",
    berry: "bg-berry",
    sky: "bg-sky",
    ink: "bg-ink",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color[tone])} />;
}
