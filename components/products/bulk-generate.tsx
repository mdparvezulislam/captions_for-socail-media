"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconRefresh, IconSpark } from "@/components/ui/icons";
import { bn } from "@/lib/format";

interface AllResponse {
  ok: boolean;
  total: number;
  nextCursor: number | null;
  remaining: number;
  done: boolean;
  processed: { product: string; captions: number; whatsapp: boolean; generated: boolean }[];
}

/**
 * সব প্রোডাক্টের ক্যাপশন একে একে তৈরি করে — প্রতি রিকোয়েস্টে ২টি প্রোডাক্ট।
 * progress localStorage-এ থাকে, তাই মাঝপথে বন্ধ হলেও আবার চালিয়ে যেতে পারে।
 */
export function BulkGenerate({ pageSlug }: { pageSlug: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(`bulk:${pageSlug}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { cursor: number; total: number };
        setDone(parsed.cursor);
        setTotal(parsed.total);
      } catch {
        /* ignore */
      }
    }
  }, [pageSlug]);

  const run = useCallback(
    async (force: boolean) => {
      abortRef.current = false;
      setRunning(true);
      setFinished(false);
      setMessage(null);
      let cursor = 0;
      let total = 0;

      try {
        while (!abortRef.current) {
          const response = await fetch("/api/generate/all", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ page: pageSlug, cursor, limit: 2, force }),
          });
          if (!response.ok) {
            setMessage(`সার্ভার সমস্যা (${response.status}) — আবার চেষ্টা করুন`);
            break;
          }
          const data = (await response.json()) as AllResponse;
          total = data.total;
          cursor = data.nextCursor ?? data.total;
          setTotal(total);
          setDone(cursor);
          window.localStorage.setItem(`bulk:${pageSlug}`, JSON.stringify({ cursor, total }));
          setMessage(`${bn(cursor)} / ${bn(total)} প্রোডাক্টের ক্যাপশন তৈরি হয়েছে`);

          if (data.done) {
            setFinished(true);
            window.localStorage.removeItem(`bulk:${pageSlug}`);
            setMessage(`✅ সব ${bn(total)}টি প্রোডাক্টের ক্যাপশন ও WhatsApp রিপ্লাই তৈরি`);
            break;
          }
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "নেটওয়ার্ক সমস্যা");
      } finally {
        setRunning(false);
        router.refresh();
      }
    },
    [pageSlug, router],
  );

  const percent = total && total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant={finished ? "moss" : "primary"}
          icon={<IconSpark size={15} className={running ? "animate-pulse" : ""} />}
          onClick={() => run(false)}
          disabled={running}
        >
          {running ? `তৈরি হচ্ছে… ${bn(done)}/${bn(total ?? 0)}` : "সব প্রোডাক্টের ক্যাপশন তৈরি করুন"}
        </Button>
        <Button
          variant="quiet"
          size="sm"
          icon={<IconRefresh size={14} className={running ? "animate-spin" : ""} />}
          onClick={() => run(true)}
          disabled={running}
        >
          নতুন করে সবার
        </Button>
      </div>

      {total ? (
        <div className="w-full max-w-[280px]">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
            <div
              className="h-full rounded-full bg-moss transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10.5px] text-ink-faint">
            {bn(done)}/{bn(total)} · {bn(percent)}%
          </p>
        </div>
      ) : null}

      {message ? <span className="max-w-[320px] text-right text-[11.5px] text-ink-soft">{message}</span> : null}
    </div>
  );
}
