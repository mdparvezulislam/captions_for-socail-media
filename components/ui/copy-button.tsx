"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function CopyButton({
  text,
  label = "কপি করুন",
  copiedLabel = "কপি হয়েছে",
  variant = "primary",
  className,
  iconOnly = false,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: "primary" | "quiet" | "ghost";
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, [text]);

  const styles =
    variant === "primary"
      ? "bg-ink text-[#FFFDF8] hover:bg-[#2A241D] border-ink"
      : variant === "quiet"
        ? "bg-card text-ink border-line hover:border-ink/25"
        : "bg-transparent text-ink-soft border-transparent hover:bg-ink/5";

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? copiedLabel : label}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border px-4 text-[13.5px] font-[560] transition-all duration-150 active:translate-y-px",
        styles,
        copied && "!border-moss !bg-moss-soft !text-moss",
        iconOnly && "w-10 px-0",
        className,
      )}
    >
      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      {iconOnly ? null : <span>{copied ? copiedLabel : label}</span>}
    </button>
  );
}
