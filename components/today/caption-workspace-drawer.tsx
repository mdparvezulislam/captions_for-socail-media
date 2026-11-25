"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/ui/product-gallery";
import { PosterStudio } from "@/components/poster/poster-studio";
import { CaptionCardStack } from "@/components/today/caption-card-stack";
import { WhatsappCard } from "@/components/today/whatsapp-card";
import {
  IconArrowUpRight,
  IconCheck,
  IconImage,
  IconPin,
  IconRefresh,
  IconSpark,
  IconX,
} from "@/components/ui/icons";
import {
  generateForProductAction,
  markPostedAction,
  regenerateAction,
  saveCaptionAction,
} from "@/app/actions";
import { showToast } from "@/components/ui/toast";
import { formatForFacebook, groupOrderBlock, imageSrcFor, productGallerySources } from "@/lib/facebook-text";
import { bn, bnNumber, bnRelative, discountPercent, taka } from "@/lib/format";

import { cn } from "@/lib/cn";
import type { Caption } from "@/lib/types";
import type { StudioData } from "@/lib/data";

function useStoredIds(scope: string, kind: "pinned" | "favorite"): [Set<string>, (id: string) => void] {
  const key = `captions-studio:${kind}:${scope}`;
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore corrupt storage */
    }
  }, [key]);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
        } catch {
          /* storage full — ignore */
        }
        window.dispatchEvent(new CustomEvent("task-list-changed"));
        return next;
      });
    },
    [key],
  );

  return [ids, toggle];
}

function useCountdown(): { label: string; remaining: string } {
  const [state, setState] = useState(() => compute());
  useEffect(() => {
    const timer = setInterval(() => setState(compute()), 1000);
    return () => clearInterval(timer);
  }, []);
  return state;
}

function compute(): { label: string; remaining: string } {
  const now = new Date();
  // রাত ০৮:০০ ঢাকা = ১৪:০০ UTC
  const target = new Date(now);
  target.setUTCHours(14, 0, 0, 0);
  let label = "আজ রাত ০৮:০০";
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
    label = "কাল রাত ০৮:০০";
  }
  const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const pad = (value: number) => bn(String(value).padStart(2, "0"));
  return { label, remaining: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

export function CaptionWorkspaceDrawer({
  productId,
  onClose,
  onNavigate,
}: {
  productId: string;
  onClose: () => void;
  onNavigate: (productId: string) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<StudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [facebookBold, setFacebookBold] = useState(true);
  const [groupMode, setGroupMode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pinnedIds, togglePinned] = useStoredIds(data?.page.slug ?? "x", "pinned");
  const [favoriteIds, toggleFavorite] = useStoredIds(data?.page.slug ?? "x", "favorite");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/${id}`, { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean } & StudioData;
      if (json.ok) {
        setData(json);
        setCaptions(json.captions);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(productId);
  }, [load, productId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        const isTextInput =
          tag === "TEXTAREA" ||
          (tag === "INPUT" && !["checkbox", "radio", "button"].includes((event.target as HTMLInputElement).type));
        if (isTextInput) return;
      }
      if (event.key === "ArrowLeft" && data?.prevId) onNavigate(data.prevId);
      if (event.key === "ArrowRight" && data?.nextId) onNavigate(data.nextId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data?.prevId, data?.nextId, onClose, onNavigate]);

  function copyText(body: string): string {
    const page = data?.page;
    const tags = includeHashtags && page && page.hashtags.length > 0 ? page.hashtags : [];
    let raw = tags.length > 0 ? `${body}\n\n${tags.join(" ")}` : body;
    if (groupMode && data?.product) {
      const block = groupOrderBlock({
        orderUrl: data.product.enrich?.orderUrl,
        whatsapp: data.product.enrich?.whatsapp,
        warranty: data.product.enrich?.warranty,
      });
      raw = `${raw}\n\n${block}`;
    }
    return formatForFacebook(raw, { bold: facebookBold });
  }

  function regenerate(caption: Caption, instruction?: string) {
    startTransition(async () => {
      const result = await regenerateAction(caption.id, instruction);
      if (result.ok && result.body) {
        setCaptions((prev) => prev.map((item) => (item.id === caption.id ? { ...item, body: result.body! } : item)));
        setNotice("নতুন করে লেখা হয়েছে");
        showToast("নতুন করে লেখা সম্পন্ন!");
      } else {
        setNotice(result.message ?? "রিরাইট করা যায়নি");
        showToast(result.message ?? "রিরাইট করা যায়নি", "error");
      }
      setTimeout(() => setNotice(null), 2200);
    });
  }

  function save(caption: Caption, body: string) {
    startTransition(async () => {
      const result = await saveCaptionAction(caption.id, body);
      if (result.ok) {
        setCaptions((prev) => prev.map((item) => (item.id === caption.id ? { ...item, body, status: "edited" } : item)));
        setNotice("সেভ হয়েছে");
        showToast("এডিট করা ক্যাপশন সেভ হয়েছে");
      }
      setTimeout(() => setNotice(null), 1800);
    });
  }

  function markPosted(caption: Caption, posted: boolean) {
    startTransition(async () => {
      const result = await markPostedAction(caption.id, posted);
      if (result.ok) {
        setCaptions((prev) =>
          prev.map((item) => (item.id === caption.id ? { ...item, status: posted ? "posted" : "ready" } : item)),
        );
        showToast(posted ? "পোস্ট হিসেবে চিহ্নিত করা হয়েছে" : "পোস্টের চিহ্ন সরানো হয়েছে");
        router.refresh();
      }
    });
  }

  function generateAll() {
    if (!data) return;
    const isRegenerateAll = captions.length >= 3;
    startTransition(async () => {
      const result = await generateForProductAction(data.product.id, isRegenerateAll);
      if (result.ok) {
        await load(data.product.id);
        showToast(isRegenerateAll ? "৩টি ক্যাপশন নতুন করে তৈরি সম্পন্ন!" : "৩টি ক্যাপশন তৈরি সম্পন্ন!");
        router.refresh();
      } else {
        setNotice(result.message ?? "তৈরি করা যায়নি");
        showToast(result.message ?? "তৈরি করা যায়নি", "error", 4000);
        setTimeout(() => setNotice(null), 2600);
      }
    });
  }

  const product = data?.product;
  const page = data?.page;
  const readyCount = captions.length;
  const imageCaption = captions.find((caption) => caption.type === "image") ?? captions[0] ?? null;
  const imageCaptionId = imageCaption?.id ?? null;
  const gallerySources = product ? productGallerySources(product) : [];
  const inlinePosterData =
    product && page
      ? {
          brandName: page.brandName,
          logoMark: page.brand.logoMark,
          watermark: page.brand.watermark,
          tagline: page.tagline,
          headline: imageCaption?.meta.poster?.headline || product.nameBn.slice(0, 32),
          subline: imageCaption?.meta.poster?.subline || product.solutionBn.slice(0, 46) || page.tagline,
          badge:
            imageCaption?.meta.poster?.badge ||
            (discountPercent(product.priceBdt, product.compareAtPriceBdt) > 0
              ? `${bn(discountPercent(product.priceBdt, product.compareAtPriceBdt))}% OFF`
              : "হট অফার"),
          cta: imageCaption?.meta.poster?.cta || "অর্ডার করতে ইনবক্স করুন",
          price: taka(product.priceBdt),
          comparePrice: product.compareAtPriceBdt ? taka(product.compareAtPriceBdt) : "",
          offer: product.offerText ?? "",
          productName: product.nameBn,
          highlights: product.features.slice(0, 3),
          hotline: product.enrich?.whatsapp ?? undefined,
          colors: {
            primary: page.brand.primary,
            accent: page.brand.accent,
            surface: page.brand.surface,
            ink: page.brand.ink,
          },
          template: "viral" as const,
          ratio: "4:5" as const,
        }
      : null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ইনস্ট্যান্ট ক্যাপশন স্টুডিও">
      <button
        type="button"
        aria-label="বন্ধ করুন"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] animate-fade"
      />
      <div
        ref={panelRef}
        data-testid="studio-drawer"
        className={cn(
          "absolute inset-x-0 bottom-0 top-auto flex max-h-[94dvh] flex-col rounded-t-[24px] border-t border-line bg-paper shadow-[0_-24px_60px_-24px_rgba(23,19,15,0.5)]",
          "animate-rise sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-[min(560px,94vw)] sm:rounded-none sm:rounded-l-[24px] sm:border-l sm:border-t-0",
        )}
      >
        {loading && !data ? (
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-24 w-full rounded-[16px]" />
            <div className="skeleton h-40 w-full rounded-[16px]" />
            <div className="skeleton h-40 w-full rounded-[16px]" />
          </div>
        ) : !data || !product || !page ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[14px] font-[600]">প্রোডাক্ট পাওয়া যায়নি</p>
            <Button variant="quiet" onClick={onClose}>
              ফিরে যান
            </Button>
          </div>
        ) : (
          <>
            {/* টপ বার */}
            <div className="sticky top-0 z-10 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 text-[13px] font-[560] text-ink-soft hover:text-ink"
                >
                  <span aria-hidden>‹</span> ক্যাপশন
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="num rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-ink-soft">
                    পণ্য {bn(data.position)} / {bn(data.total)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-[560]",
                      data.source === "library"
                        ? "border-line bg-card-soft text-ink-soft"
                        : "border-accent/30 bg-accent-soft text-accent-deep",
                    )}
                  >
                    {data.source === "library" ? "সংরক্ষিত" : "আজকের"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="বন্ধ"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card text-ink-soft hover:text-ink"
                >
                  <IconX size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4">
              {/* প্রোডাক্ট হেডার */}
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrcFor(product)}
                  alt={product.nameBn}
                  width={120}
                  height={120}
                  className="h-16 w-16 shrink-0 rounded-[14px] bg-paper-deep object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16.5px] font-[650] leading-[1.4]">{product.nameBn}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                    <span className="num font-[640] text-accent-deep">{taka(product.priceBdt)}</span>
                    {product.compareAtPriceBdt ? (
                      <span className="num text-[11px] text-ink-faint line-through">{taka(product.compareAtPriceBdt)}</span>
                    ) : null}
                    <span className="num text-ink-faint">{product.sourceId}</span>
                    <Badge tone={readyCount >= 3 ? "moss" : "berry"}>
                      {readyCount >= 3 ? <IconCheck size={11} /> : null}
                      {readyCount >= 3 ? "ক্যাপশন রেডি" : `ক্যাপশন বাকি (${bn(readyCount)}/৩)`}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => togglePinned(product.id)}
                      aria-pressed={pinnedIds.has(product.id)}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-[560] transition-colors",
                        pinnedIds.has(product.id)
                          ? "border-accent bg-accent-soft text-accent-deep"
                          : "border-line bg-card text-ink-soft hover:border-ink/25",
                      )}
                    >
                      📌 পিন
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      aria-pressed={favoriteIds.has(product.id)}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-[560] transition-colors",
                        favoriteIds.has(product.id)
                          ? "border-accent bg-accent-soft text-accent-deep"
                          : "border-line bg-card text-ink-soft hover:border-ink/25",
                      )}
                    >
                      ⭐ ফেভারিট
                    </button>
                    <span className="num text-[11px] text-ink-faint">স্কোর {bn(data.percent)}%</span>
                    {data.lastUsedDate ? (
                      <span className="text-[11px] text-ink-faint">· শেষ {bnRelative(`${data.lastUsedDate}T00:00:00Z`)}</span>
                    ) : (
                      <span className="text-[11px] text-moss">· নতুন</span>
                    )}
                  </div>
                </div>
              </div>

              {/* প্রোডাক্টের সব গ্যালারি ছবি — ক্লিক করলেই ডাউনলোড */}
              <div className="mt-3">
                <ProductGallery
                  sources={gallerySources}
                  productName={product.nameBn}
                  sourceId={product.sourceId}
                  compact
                />
              </div>

              {/* হ্যাশট্যাগ টগল + রিজেনারেট */}
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[14px] border border-line bg-card/70 px-3.5 py-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={includeHashtags}
                    onChange={(event) => setIncludeHashtags(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative h-5 w-9 rounded-full border border-line bg-paper-deep transition-colors peer-checked:border-moss peer-checked:bg-moss">
                    <span className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-[14px]" />
                  </span>
                  কপিতে হ্যাশট্যাগ যুক্ত করুন
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={facebookBold}
                    onChange={(event) => setFacebookBold(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative h-5 w-9 rounded-full border border-line bg-paper-deep transition-colors peer-checked:border-accent peer-checked:bg-accent">
                    <span className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-[14px]" />
                  </span>
                  𝗙acebook বোল্ড
                </label>
                <div className="flex overflow-hidden rounded-full border border-line" role="group" aria-label="কপি মোড">
                  {(["page", "group"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGroupMode(mode === "group")}
                      className={cn(
                        "px-3 py-1 text-[11.5px] font-[560] transition-colors",
                        (mode === "group") === groupMode ? "bg-ink text-[#FFFDF8]" : "bg-card text-ink-soft",
                      )}
                    >
                      {mode === "page" ? "পেজ" : "গ্রুপ"}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="quiet"
                  className="ml-auto"
                  icon={<IconRefresh size={14} className={pending ? "animate-spin" : ""} />}
                  disabled={pending}
                  onClick={generateAll}
                >
                  {readyCount > 0 ? "সব নতুন করে তৈরি" : "ক্যাপশন তৈরি করুন"}
                </Button>
              </div>

              {/* জরুরী উইন্ডো */}
              <UrgencyBanner />

              {notice ? <p className="mt-2 text-[12px] text-moss">{notice}</p> : null}

              {/* ক্যাপশন কার্ড */}
              <div className="mt-3">
                <CaptionCardStack
                  captions={captions}
                  hashtags={page.hashtags}
                  includeHashtags={includeHashtags}
                  formatBody={facebookBold ? (body) => formatForFacebook(body) : undefined}
                  onCopyText={copyText}
                  onRegenerate={regenerate}
                  onSave={save}
                  onMarkPosted={markPosted}
                  pending={pending}
                />
              </div>

              {/* WhatsApp রিপ্লাই */}
              <div className="mt-3">
                <WhatsappCard
                  productId={product.id}
                  initialMessage={data.whatsapp}
                  productName={product.nameBn}
                />
              </div>

              {/* অ্যাকর্ডিয়ন */}
              <div className="mt-4 flex flex-col gap-2">
                <Accordion title="ফেসবুক পোস্ট প্রিভিউ" icon={<IconImage size={14} className="text-ink-faint" />}>
                  <div className="rounded-[12px] border border-line bg-card-soft/70 p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-[650] text-white"
                        style={{ background: page.brand.primary }}
                      >
                        {page.brand.logoMark}
                      </span>
                      <div className="leading-tight">
                        <p className="text-[12px] font-[600]">{page.brandName}</p>
                        <p className="text-[10px] text-ink-faint">সম্প্রতি · 🌐</p>
                      </div>
                    </div>
                    <p className="caption-text mt-2 text-[12.5px]">
                      {captions[0]?.body
                        ? facebookBold
                          ? formatForFacebook(captions[0].body)
                          : captions[0].body
                        : "ক্যাপশন তৈরি হলে এখানে প্রিভিউ দেখা যাবে।"}
                    </p>
                    {includeHashtags ? (
                      <p className="mt-1.5 text-[11px] text-sky">{page.hashtags.join(" ")}</p>
                    ) : null}
                    <div className="mt-2 overflow-hidden rounded-[10px] bg-paper-deep">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gallerySources[0] ?? imageSrcFor(product)}
                        alt={product.nameBn}
                        className="max-h-56 w-full object-contain bg-white"
                      />
                    </div>
                  </div>
                </Accordion>

                <Accordion title="প্রোডাক্ট স্পেক্স">
                  <dl className="grid gap-2 text-[12px]">
                    <div>
                      <dt className="text-ink-faint">সমস্যা</dt>
                      <dd className="text-ink">{product.problemBn}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">সমাধান</dt>
                      <dd className="text-ink">{product.solutionBn}</dd>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {product.features.map((feature) => (
                        <span key={feature} className="rounded-full border border-line bg-card-soft px-2 py-0.5 text-[11px]">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-ink-faint">মেটেরিয়াল</dt>
                        <dd className="text-ink">{product.material ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">স্টক</dt>
                        <dd className="num text-ink">{bnNumber(product.stock)}</dd>
                      </div>
                    </div>
                  </dl>
                </Accordion>

                <Accordion title="🔥 AI ভাইরাল পোস্টার জেনারেটর" icon={<IconSpark size={14} className="text-accent-deep" />}>
                  {inlinePosterData ? (
                    <div className="flex flex-col gap-3">
                      <PosterStudio
                        data={inlinePosterData}
                        imageUrl={gallerySources[0] ?? null}
                        gallerySources={gallerySources}
                        compact
                      />
                      {imageCaptionId ? (
                        <a
                          href={`/poster/${imageCaptionId}`}
                          className="inline-flex h-9 w-fit items-center gap-1.5 rounded-[12px] border border-ink bg-ink px-4 text-[12px] font-[560] text-[#FFFDF8]"
                        >
                          <IconArrowUpRight size={14} /> ফুল পোস্টার স্টুডিও ও টেক্সট এডিট
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </Accordion>
              </div>
            </div>

            {/* স্টিকি বটম বার */}
            <div className="absolute inset-x-0 bottom-0 border-t border-line bg-card/95 px-3 py-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!data.prevId}
                  onClick={() => data.prevId && onNavigate(data.prevId)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1 rounded-[12px] border border-line bg-card px-3 text-[12.5px] font-[560]",
                    data.prevId ? "text-ink hover:border-ink/25" : "opacity-40",
                  )}
                >
                  <span aria-hidden>‹</span> আগের পণ্য
                </button>
                <span className="min-w-0 flex-1 truncate text-center text-[12px] font-[580] text-ink-soft">
                  {product.nameBn}
                </span>
                <button
                  type="button"
                  disabled={!data.nextId}
                  onClick={() => data.nextId && onNavigate(data.nextId)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1 rounded-[12px] border border-line bg-card px-3 text-[12.5px] font-[560]",
                    data.nextId ? "text-ink hover:border-ink/25" : "opacity-40",
                  )}
                >
                  পরবর্তী পণ্য <span aria-hidden>›</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UrgencyBanner() {
  const { label, remaining } = useCountdown();
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-[14px] border border-accent/25 bg-accent-soft/70 px-3.5 py-2.5">
      <span className="text-[16px]" aria-hidden>
        ⏰
      </span>
      <p className="flex-1 text-[11.5px] leading-[1.6] text-accent-deep">
        জরুরী পোস্টিং টাইম উইন্ডো: <strong>{label}</strong>
      </p>
      <span className="num rounded-full bg-accent px-2.5 py-1 text-[11px] font-[600] text-white">{remaining}</span>
    </div>
  );
}
