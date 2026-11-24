"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  IconAlert,
  IconCheck,
  IconImage,
  IconPen,
  IconPoster,
  IconRefresh,
  IconVideo,
} from "@/components/ui/icons";
import { markPostedAction, regenerateAction, saveCaptionAction } from "@/app/actions";
import { bn, bnNumber, discountPercent, taka } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CAPTION_TYPES, type Caption, type CaptionType, type Page, type Product } from "@/lib/types";

const ICONS: Record<CaptionType, React.ReactNode> = {
  image: <IconImage size={15} />,
  video: <IconVideo size={15} />,
  problem: <IconAlert size={15} />,
};

const REWRITE_HINTS = ["আরও ছোট করো", "হুক আরও শক্ত করো", "দামটা আরও প্রমিনেন্ট করো"];

export function ProductCard({
  page,
  product,
  captions,
  index,
  demoMode,
}: {
  page: Page;
  product: Product;
  captions: Caption[];
  index: number;
  demoMode: boolean;
}) {
  const initial = useMemo(() => {
    const map = new Map<CaptionType, Caption>();
    for (const caption of captions) map.set(caption.type, caption);
    return map;
  }, [captions]);

  const [type, setType] = useState<CaptionType>("image");
  const [bodies, setBodies] = useState<Record<string, string>>(() =>
    Object.fromEntries(captions.map((caption) => [caption.type, caption.body])),
  );
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(captions.map((caption) => [caption.type, caption.status])),
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const caption = initial.get(type);
  const body = bodies[type] ?? caption?.body ?? "";
  const hashtags = caption?.hashtags?.length ? caption.hashtags : page.hashtags;
  const status = statuses[type] ?? caption?.status ?? "ready";
  const posted = status === "posted";
  const discount = discountPercent(product.priceBdt, product.compareAtPriceBdt);

  const copyText = `${body}\n\n${hashtags.join(" ")}`;

  function regenerate(instruction?: string) {
    if (!caption) return;
    setNote(null);
    startTransition(async () => {
      const result = await regenerateAction(caption.id, instruction);
      if (result.ok && result.body) {
        setBodies((prev) => ({ ...prev, [type]: result.body! }));
        setStatuses((prev) => ({ ...prev, [type]: "ready" }));
        setNote("নতুন করে লেখা হয়েছে");
        setTimeout(() => setNote(null), 2200);
      } else {
        setNote(result.message ?? "রিজেনারেট করা যায়নি");
      }
    });
  }

  function save() {
    if (!caption) return;
    startTransition(async () => {
      const result = await saveCaptionAction(caption.id, draft);
      if (result.ok) {
        setBodies((prev) => ({ ...prev, [type]: draft.trim() }));
        setStatuses((prev) => ({ ...prev, [type]: "edited" }));
        setEditing(false);
        setNote("সেভ হয়েছে");
        setTimeout(() => setNote(null), 1800);
      } else {
        setNote("খুব ছোট — অন্তত ১০ অক্ষর লিখুন");
      }
    });
  }

  function togglePosted() {
    if (!caption) return;
    startTransition(async () => {
      const next = !posted;
      const result = await markPostedAction(caption.id, next);
      if (result.ok) {
        setStatuses((prev) => ({ ...prev, [type]: next ? "posted" : "ready" }));
      }
    });
  }

  return (
    <article
      className={cn(
        "card-surface animate-rise overflow-hidden transition-shadow duration-200 hover:shadow-[0_1px_0_#fff_inset,0_26px_50px_-36px_rgba(23,19,15,0.6)]",
        posted && "ring-1 ring-moss/25",
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div className="flex gap-3 border-b border-line/70 p-4 sm:gap-4 sm:p-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px] sm:h-[74px] sm:w-[74px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/art/${encodeURIComponent(product.artSeed || product.id)}`}
            alt=""
            width={148}
            height={148}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <span className="num absolute left-1.5 top-1.5 rounded-[6px] bg-ink/80 px-1.5 py-0.5 text-[10px] font-[600] text-white">
            {bn(index + 1).padStart(2, "০")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[16px] font-[650] leading-[1.4] sm:text-[17.5px]">{product.nameBn}</h3>
            {posted ? (
              <Badge tone="moss">
                <IconCheck size={11} /> পোস্ট হয়েছে
              </Badge>
            ) : (
              <Badge tone="neutral">{discount > 0 ? `${bn(discount)}% ছাড়` : product.category}</Badge>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-soft">
            <span className="num text-[13.5px] font-[620] text-ink">{taka(product.priceBdt)}</span>
            {product.compareAtPriceBdt ? (
              <span className="num text-[11.5px] text-ink-faint line-through">{taka(product.compareAtPriceBdt)}</span>
            ) : null}
            <span className="h-3 w-px bg-line" />
            <span className={cn("num", product.stock <= 5 ? "text-berry" : "")}>স্টক {bnNumber(product.stock)}</span>
            <span className="h-3 w-px bg-line" />
            <span>{product.category}</span>
            {product.offerText ? (
              <>
                <span className="h-3 w-px bg-line" />
                <span className="text-moss">{product.offerText}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3.5 sm:px-5">
        <div className="scroll-x flex items-center gap-1.5" role="tablist" aria-label="ক্যাপশনের ধরন">
          {CAPTION_TYPES.map((item) => {
            const active = item.type === type;
            const itemCaption = initial.get(item.type);
            return (
              <button
                key={item.type}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setType(item.type);
                  setEditing(false);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-[560] transition-colors duration-150",
                  active
                    ? "border-ink bg-ink text-[#FFFDF8]"
                    : "border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink",
                )}
              >
                {ICONS[item.type]}
                {item.short}
                {itemCaption?.status === "posted" ? <span className="h-1.5 w-1.5 rounded-full bg-moss" /> : null}
              </button>
            );
          })}
          <span className="ml-auto shrink-0 pr-1 text-[11px] text-ink-faint">
            {demoMode ? "ডেমো মোড" : caption?.model === "gemini" ? "Gemini" : ""}
          </span>
        </div>

        {editing ? (
          <div className="mt-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={7}
              className="caption-text w-full resize-y rounded-[14px] border border-accent/40 bg-card px-3.5 py-3 outline-none focus:border-accent"
              aria-label="ক্যাপশন এডিট"
            />
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={save} disabled={pending}>
                সেভ করুন
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                বাতিল
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative mt-3 rounded-[16px] border border-line-soft bg-card-soft/70 px-3.5 py-3">
            <p className="caption-text">{body || "ক্যাপশন তৈরি হচ্ছে…"}</p>
            <p className="mt-2.5 flex flex-wrap gap-x-1.5 gap-y-1 text-[11.5px] leading-[1.7] text-sky">
              {hashtags.join(" ")}
            </p>
          </div>
        )}

        {note ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-moss">
            <IconCheck size={13} /> {note}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
        <CopyButton text={copyText} label="ক্যাপশন কপি" copiedLabel="কপি হয়েছে" className="h-9" />

        <Button
          size="sm"
          variant="quiet"
          icon={<IconRefresh size={15} className={pending ? "animate-spin" : ""} />}
          onClick={() => regenerate()}
          disabled={pending || !caption}
        >
          রিজেনারেট
        </Button>

        <Button
          size="sm"
          variant="ghost"
          icon={<IconPen size={14} />}
          onClick={() => {
            setDraft(body);
            setEditing(true);
          }}
          disabled={!caption}
        >
          এডিট
        </Button>

        {caption ? (
          <Link
            href={`/poster/${caption.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-[520] text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            <IconPoster size={15} />
            পোস্টার
          </Link>
        ) : null}

        <Button
          size="sm"
          variant={posted ? "moss" : "ghost"}
          className="ml-auto"
          icon={posted ? <IconCheck size={15} /> : null}
          onClick={togglePosted}
          disabled={pending || !caption}
        >
          {posted ? "পোস্ট হয়েছে" : "পোস্ট করেছি"}
        </Button>
      </div>

      {!editing && caption ? (
        <div className="flex flex-wrap gap-1.5 border-t border-line/60 bg-card-soft/40 px-4 py-2 sm:px-5">
          {REWRITE_HINTS.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => regenerate(hint)}
              disabled={pending}
              className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:border-accent/40 hover:text-accent-deep disabled:opacity-50"
            >
              {hint}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
