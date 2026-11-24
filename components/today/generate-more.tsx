"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconSpark } from "@/components/ui/icons";
import { showToast } from "@/components/ui/toast";
import { bn } from "@/lib/format";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface PickedItem {
  id: string;
  nameBn: string;
  score: number;
}

interface PickResponse {
  ok: boolean;
  batch?: number;
  runId?: string;
  relaxed?: boolean;
  products?: PickedItem[];
  message?: string;
  error?: string;
}

interface ProductGenResponse {
  ok: boolean;
  created?: number;
  model?: string;
  error?: string;
}

async function generateOneJson(payload: {
  productId: string;
  batch?: number;
  position: number;
  runId?: string;
  score: number;
}): Promise<ProductGenResponse> {
  try {
    const res = await fetch("/api/batch/product", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as ProductGenResponse;
    if (res.ok && data.ok) return data;
    return { ok: false, error: data.error ?? `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network error" };
  }
}

export function GenerateMore({
  pageSlug,
  count,
  label,
  size = "md",
  variant = "accent",
}: {
  pageSlug: string;
  count: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "accent" | "quiet";
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    index: number;
    total: number;
    succeeded: number;
    currentName?: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    if (running) return;
    setRunning(true);
    setMessage(null);
    setProgress(null);

    try {
      // Step 1: Fast D1-only priority pick (<100ms)
      const pickRes = await fetch("/api/batch/pick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageSlug, count }),
      });
      const picked = (await pickRes.json().catch(() => ({ ok: false }))) as PickResponse;

      if (!pickRes.ok || !picked.ok || !picked.products || picked.products.length === 0) {
        const err = picked.message ?? picked.error ?? "নতুন কোনো প্রোডাক্ট পাওয়া যায়নি";
        setMessage(err);
        showToast(err, "error", 4000);
        return;
      }

      const items = picked.products;
      const total = items.length;
      let succeeded = 0;
      let failed = 0;
      let lastError = "";

      // Step 2: Generate each product cleanly via lightweight JSON POST (no RSC race, zero Worker timeout).
      // Each product is isolated in its own error handling so 1 transient spike never aborts the rest.
      for (let i = 0; i < total; i++) {
        const item = items[i];
        setProgress({ index: i + 1, total, succeeded, currentName: item.nameBn });

        let res = await generateOneJson({
          productId: item.id,
          batch: picked.batch,
          position: i,
          runId: picked.runId,
          score: item.score,
        });

        // Retry once after a short breather if a single product hits a transient 503/network spike
        if (!res.ok) {
          await pause(1200);
          res = await generateOneJson({
            productId: item.id,
            batch: picked.batch,
            position: i,
            runId: picked.runId,
            score: item.score,
          });
        }

        if (res.ok) {
          succeeded++;
          setProgress({ index: i + 1, total, succeeded, currentName: item.nameBn });
        } else {
          failed++;
          lastError = res.error ?? "জেনারেশন ব্যর্থ";
        }

        if (i + 1 < total) {
          await pause(350);
        }
      }

      // Single clean refresh after all 5 items finish (no RSC flight collision!)
      if (succeeded > 0) {
        router.refresh();
        const createdCaptions = succeeded * 3;
        const summary =
          failed > 0
            ? `${bn(succeeded)}/${bn(total)}টি প্রোডাক্টের (${bn(createdCaptions)}টি) AI ক্যাপশন তৈরি সম্পন্ন`
            : `${bn(succeeded)}টি প্রোডাক্টের ${bn(createdCaptions)}টি AI ক্যাপশন তৈরি সম্পন্ন!`;
        setMessage(summary);
        showToast(summary, "success", 3600);
      } else {
        const quotaHit = /429|quota/i.test(lastError);
        const summary = quotaHit
          ? "Gemini API ফ্রি কোটা শেষ হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন"
          : "Gemini সার্ভারে সাময়িক চাপ বেশি — কয়েক সেকেন্ড পর আবার ক্লিক করুন";
        setMessage(summary);
        showToast(summary, "error", 4800);
      }
    } catch {
      const err = "নেটওয়ার্ক সমস্যা হয়েছে, আবার চেষ্টা করুন";
      setMessage(err);
      showToast(err, "error", 4000);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  const buttonText = running
    ? progress
      ? `লিখছে (${bn(progress.index)}/${bn(progress.total)})…`
      : "প্রোডাক্ট বাছছে…"
    : (label ?? `আরও ${bn(count)}টা প্রোডাক্ট`);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant={variant}
        size={size}
        onClick={run}
        disabled={running}
        icon={<IconSpark size={16} className={running ? "animate-pulse" : ""} />}
      >
        {buttonText}
      </Button>
      {running && progress?.currentName ? (
        <span className="max-w-[34ch] truncate text-[11.5px] text-accent-deep">
          AI লিখছে ({bn(progress.succeeded)}/{bn(progress.total)} রেডি): {progress.currentName}
        </span>
      ) : message ? (
        <span className="text-[11.5px] text-ink-soft">{message}</span>
      ) : null}
    </div>
  );
}
