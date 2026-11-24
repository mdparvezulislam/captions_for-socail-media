"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface ToastPayload {
  id?: string;
  message: string;
  type?: "success" | "info" | "error";
  duration?: number;
}

const TOAST_EVENT = "caption-engine:toast";

/**
 * Triggers a global smooth toast notification anywhere in the application.
 */
export function showToast(message: string, type: "success" | "info" | "error" = "success", duration = 2400): void {
  if (typeof window === "undefined") return;
  const detail: ToastPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    type,
    duration,
  };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
}

/**
 * Global Toast Host mounted in AppLayout.
 * Displays floating pill feedback with smooth spring animations.
 */
export function ToastHost() {
  const [current, setCurrent] = useState<ToastPayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<ToastPayload>;
      if (!customEvent.detail?.message) return;

      if (dismissTimer) clearTimeout(dismissTimer);
      if (hideTimer) clearTimeout(hideTimer);

      setCurrent(customEvent.detail);
      setVisible(true);

      const duration = customEvent.detail.duration ?? 2400;
      dismissTimer = setTimeout(() => {
        setVisible(false);
        hideTimer = setTimeout(() => {
          setCurrent(null);
        }, 300);
      }, duration);
    }

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      if (dismissTimer) clearTimeout(dismissTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!current) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 transition-all duration-300 ease-out lg:bottom-6",
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-3 opacity-0 scale-95",
      )}
    >
      <div
        className={cn(
          "flex max-w-[92vw] items-center gap-2.5 rounded-full px-4.5 py-2.5 sm:px-5 sm:py-3 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors",
          current.type === "error"
            ? "border border-berry/30 bg-[#241315]/95 text-[#FFFDF8]"
            : "border border-moss/30 bg-[#161B14]/95 text-[#FFFDF8]",
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white",
            current.type === "error" ? "bg-berry" : "bg-moss",
          )}
        >
          <IconCheck size={12} strokeWidth={2.6} />
        </span>
        <span className="truncate text-[12.5px] font-[560] tracking-[-0.01em] text-[#FFFDF8] sm:text-[13px]">
          {current.message}
        </span>
      </div>
    </div>
  );
}
