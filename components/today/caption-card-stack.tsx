"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconCopy, IconPen, IconRefresh } from "@/components/ui/icons";
import { showToast } from "@/components/ui/toast";
import { bn, wordCount } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Caption, CaptionType } from "@/lib/types";

const CARD_META: Record<CaptionType, { label: string; badge: string; badgeTone: "accent" | "sky" | "moss" }> = {
  image: { label: "ক্যাপশন ১ — লম্বা ভার্সন", badge: "🔥 ভাইরাল হুক", badgeTone: "accent" },
  video: { label: "ক্যাপশন ২ — ছোট ভার্সন", badge: "🎯 অর্গানিক রিচ", badgeTone: "sky" },
  problem: { label: "ক্যাপশন ৩ — সমস্যা-সমাধান", badge: "💬 শর্ট পোস্ট", badgeTone: "moss" },
};

export function CaptionCardStack({
  captions,
  hashtags,
  includeHashtags,
  formatBody,
  onCopyText,
  onRegenerate,
  onSave,
  onMarkPosted,
  pending,
}: {
  captions: Caption[];
  hashtags: string[];
  includeHashtags: boolean;
  formatBody?: (body: string) => string;
  onCopyText: (body: string) => string;
  onRegenerate: (caption: Caption, instruction?: string) => void;
  onSave: (caption: Caption, body: string) => void;
  onMarkPosted: (caption: Caption, posted: boolean) => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {(["image", "video", "problem"] as CaptionType[]).map((type) => {
        const caption = captions.find((item) => item.type === type);
        const meta = CARD_META[type];
        return (
          <CaptionCard
            key={type}
            caption={caption ?? null}
            type={type}
            meta={meta}
            hashtags={hashtags}
            includeHashtags={includeHashtags}
            formatBody={formatBody}
            onCopyText={onCopyText}
            onRegenerate={onRegenerate}
            onSave={onSave}
            onMarkPosted={onMarkPosted}
            pending={pending}
          />
        );
      })}
    </div>
  );
}

function CaptionCard({
  caption,
  type,
  meta,
  hashtags,
  includeHashtags,
  formatBody,
  onCopyText,
  onRegenerate,
  onSave,
  onMarkPosted,
  pending,
}: {
  caption: Caption | null;
  type: CaptionType;
  meta: { label: string; badge: string; badgeTone: "accent" | "sky" | "moss" };
  hashtags: string[];
  includeHashtags: boolean;
  formatBody?: (body: string) => string;
  onCopyText: (body: string) => string;
  onRegenerate: (caption: Caption, instruction?: string) => void;
  onSave: (caption: Caption, body: string) => void;
  onMarkPosted: (caption: Caption, posted: boolean) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const body = caption?.body ?? "";
  const posted = caption?.status === "posted";

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  if (!caption) {
    return (
      <div className="rounded-[16px] border border-dashed border-line bg-card/40 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-[600] text-ink-soft">{meta.label}</span>
          <Badge tone="berry">বাকি</Badge>
        </div>
        <p className="mt-1 text-[11.5px] text-ink-faint">এই ধরনের ক্যাপশন এখনো তৈরি হয়নি।</p>
      </div>
    );
  }

  const copyText = onCopyText(body);

  async function handleCopy() {
    let success = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(copyText);
        success = true;
      }
    } catch {
      // fallback
    }

    if (!success && typeof document !== "undefined") {
      try {
        const area = document.createElement("textarea");
        area.value = copyText;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        success = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        success = false;
      }
    }

    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2200);

    showToast("ক্যাপশন কপি হয়েছে! Facebook-এ পেস্ট করুন");
  }

  return (
    <article
      className={cn(
        "rounded-[16px] border bg-card p-4 transition-shadow",
        posted ? "border-moss/30" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-[620] text-ink">{meta.label}</span>
          <Badge tone={meta.badgeTone}>{meta.badge}</Badge>
        </div>
        <span className="num text-[10.5px] text-ink-faint">
          {bn(wordCount(body))} শব্দ · {bn(body.length)} অক্ষর
        </span>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={8}
          className="caption-text mt-2.5 w-full resize-y rounded-[12px] border border-accent/40 bg-card-soft px-3.5 py-3 outline-none focus:border-accent"
          aria-label="ক্যাপশন এডিট করুন"
        />
      ) : (
        <p className="caption-text mt-2.5">{formatBody ? formatBody(body) : body}</p>
      )}

      {includeHashtags && hashtags.length > 0 ? (
        <p className="mt-2 flex flex-wrap gap-x-1.5 text-[11.5px] leading-[1.7] text-sky">{hashtags.join(" ")}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button
              size="sm"
              variant="primary"
              disabled={pending || draft.trim().length < 10}
              onClick={() => {
                onSave(caption, draft.trim());
                setEditing(false);
              }}
            >
              সেভ
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              বাতিল
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              icon={<IconPen size={14} />}
              onClick={() => {
                setDraft(body);
                setEditing(true);
              }}
            >
              এডিট
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<IconRefresh size={14} className={pending ? "animate-spin" : ""} />}
              disabled={pending}
              onClick={() => onRegenerate(caption)}
            >
              রিরাইট
            </Button>
            <button
              type="button"
              onClick={() => onMarkPosted(caption, !posted)}
              disabled={pending}
              className={cn(
                "ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-[560] transition-colors",
                posted
                  ? "border-moss bg-moss-soft text-moss"
                  : "border-line bg-card text-ink-soft hover:border-moss/40 hover:text-moss",
              )}
            >
              <IconCheck size={13} />
              {posted ? "পোস্ট হয়েছে" : "পোস্ট করেছি"}
            </button>
          </>
        )}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "ক্যাপশন কপি সম্পন্ন" : "ফেসবুক ক্যাপশন কপি করুন"}
          className={cn(
            "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border text-[14px] font-[600] transition-all duration-200 active:scale-[0.99]",
            copied
              ? "border-moss bg-moss text-white shadow-[0_10px_22px_-14px_rgba(46,125,50,0.85)]"
              : "border-accent-deep/25 bg-accent text-white shadow-[0_10px_22px_-14px_rgba(207,79,23,0.85)] hover:bg-accent-deep",
          )}
        >
          {copied ? (
            <>
              <IconCheck size={17} strokeWidth={2.4} />
              <span>কপি সম্পন্ন হয়েছে!</span>
            </>
          ) : (
            <>
              <IconCopy size={16} />
              <span>কপি করুন</span>
            </>
          )}
        </button>
      ) : null}
    </article>
  );
}
