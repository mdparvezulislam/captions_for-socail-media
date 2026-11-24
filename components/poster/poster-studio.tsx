"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconDownload, IconImage } from "@/components/ui/icons";
import { showToast } from "@/components/ui/toast";
import { drawPoster, loadImageElement, posterSize, type PosterData, type PosterRatio, type PosterTemplate } from "@/lib/poster";
import { bn } from "@/lib/format";
import { cn } from "@/lib/cn";

const RATIOS: { value: PosterRatio; label: string; hint: string }[] = [
  { value: "4:5", label: "৪:৫", hint: "ফিড" },
  { value: "1:1", label: "১:১", hint: "স্কয়ার" },
  { value: "9:16", label: "৯:১৬", hint: "স্টোরি" },
];

const TEMPLATES: { value: PosterTemplate; label: string }[] = [
  { value: "viral", label: "🔥 ভাইরাল অ্যাড" },
  { value: "editorial", label: "এডিটোরিয়াল" },
  { value: "bold", label: "বোল্ড" },
  { value: "minimal", label: "মিনিমাল" },
];

export function PosterStudio({
  data,
  imageUrl,
  gallerySources,
  compact = false,
}: {
  data: PosterData;
  imageUrl?: string | null;
  gallerySources?: string[];
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const allSources = useMemo(() => {
    const list: string[] = [];
    if (imageUrl) list.push(imageUrl);
    for (const s of gallerySources ?? []) {
      if (s && !list.includes(s)) list.push(s);
    }
    return list;
  }, [gallerySources, imageUrl]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [ratio, setRatio] = useState<PosterRatio>(data.ratio);
  const [template, setTemplate] = useState<PosterTemplate>(data.template);
  const [headline, setHeadline] = useState(data.headline);
  const [subline, setSubline] = useState(data.subline);
  const [badge, setBadge] = useState(data.badge);
  const [cta, setCta] = useState(data.cta);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<HTMLImageElement | null>(null);

  const activeImageUrl = allSources[selectedIdx] ?? null;

  const current: PosterData = useMemo(
    () => ({
      ...data,
      headline,
      subline,
      badge,
      cta,
      ratio,
      template,
    }),
    [badge, cta, data, headline, ratio, subline, template],
  );

  const paint = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await drawPoster(canvas, current, productImage);
    setReady(true);
  }, [current, productImage]);

  useEffect(() => {
    let cancelled = false;
    if (!activeImageUrl) {
      setProductImage(null);
      return;
    }
    void loadImageElement(activeImageUrl).then((image) => {
      if (!cancelled) setProductImage(image);
    });
    return () => {
      cancelled = true;
    };
  }, [activeImageUrl]);

  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (!cancelled) void paint();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [paint]);

  const size = posterSize(ratio);

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `poster-${template}-${ratio.replace(":", "x")}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNote("পোস্টার PNG ডাউনলোড হয়েছে");
      showToast("ভাইরাল পোস্টার PNG ডাউনলোড সম্পন্ন!");
      setTimeout(() => setNote(null), 2200);
    }, "image/png");
  }

  async function copyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setNote("ইমেজ কপি হয়েছে — ফেসবুকে পেস্ট করুন");
      showToast("পোস্টার ইমেজ ক্লিপবোর্ডে কপি সম্পন্ন!");
    } catch {
      setNote("ব্রাউজার কপি সাপোর্ট করছে না — ডাউনলোড করুন");
      showToast("ব্রাউজার ইমেজ কপি সাপোর্ট করছে না — ডাউনলোড করুন", "error");
    }
    setTimeout(() => setNote(null), 2600);
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTemplate(item.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-[560] transition-colors",
                template === item.value
                  ? "border-accent bg-accent-soft text-accent-deep"
                  : "border-line bg-card text-ink-soft hover:border-ink/25",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[16px] border border-line bg-paper-deep p-1.5">
          <canvas
            ref={canvasRef}
            aria-label="পোস্টার প্রিভিউ"
            className={cn("block h-auto w-full rounded-[12px] transition-opacity duration-200", ready ? "opacity-100" : "opacity-0")}
            style={{ aspectRatio: `${size.width} / ${size.height}` }}
          />
        </div>

        {allSources.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ink-faint">ছবি বদলান:</span>
            {allSources.map((src, idx) => (
              <button
                key={`mini-${idx}`}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={cn(
                  "h-9 w-9 overflow-hidden rounded-[8px] ring-2 transition-all",
                  idx === selectedIdx ? "ring-accent" : "opacity-65 ring-transparent hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`ছবি ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="accent" icon={<IconDownload size={14} />} onClick={download}>
            পোস্টার ডাউনলোড (PNG)
          </Button>
          <Button size="sm" variant="quiet" icon={<IconImage size={14} />} onClick={copyImage}>
            ইমেজ কপি
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-[22px] border border-line bg-paper-deep p-2 shadow-[0_20px_50px_-38px_rgba(23,19,15,0.7)]">
          <canvas
            ref={canvasRef}
            aria-label="পোস্টার প্রিভিউ"
            className={cn(
              "block h-auto w-full rounded-[16px] transition-opacity duration-300",
              ready ? "opacity-100" : "opacity-0",
            )}
            style={{ aspectRatio: `${size.width} / ${size.height}` }}
          />
          {!ready ? (
            <div className="absolute inset-2 flex items-center justify-center rounded-[16px] bg-card-soft">
              <span className="skeleton h-full w-full rounded-[16px]" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="accent" icon={<IconDownload size={16} />} onClick={download}>
            HD PNG ডাউনলোড
          </Button>
          <Button variant="quiet" icon={<IconImage size={16} />} onClick={copyImage}>
            ইমেজ কপি
          </Button>
          <span className="num text-[11px] text-ink-faint">
            {size.width} × {size.height}
          </span>
        </div>
        {note ? <p className="text-[12px] text-moss">{note}</p> : null}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] font-[620] uppercase tracking-[0.14em] text-ink-faint">টেমপ্লেট</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTemplate(item.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] font-[560] transition-colors",
                  template === item.value
                    ? "border-accent bg-accent-soft text-accent-deep"
                    : "border-line bg-card text-ink-soft hover:border-ink/25",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-[620] uppercase tracking-[0.14em] text-ink-faint">সাইজ</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RATIOS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRatio(item.value)}
                className={cn(
                  "rounded-[12px] border px-3.5 py-2 text-left transition-colors",
                  ratio === item.value
                    ? "border-ink bg-ink text-[#FFFDF8]"
                    : "border-line bg-card text-ink-soft hover:border-ink/25",
                )}
              >
                <span className="num block text-[13px] font-[600]">{item.label}</span>
                <span className={cn("block text-[10.5px]", ratio === item.value ? "text-white/60" : "text-ink-faint")}>
                  {item.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {allSources.length > 1 ? (
          <div>
            <p className="text-[11px] font-[620] uppercase tracking-[0.14em] text-ink-faint">
              পোস্টারের ছবি বাছাই করুন ({bn(allSources.length)}টি)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allSources.map((src, idx) => (
                <button
                  key={`pick-${idx}`}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "h-14 w-14 overflow-hidden rounded-[11px] ring-2 transition-all",
                    idx === selectedIdx ? "ring-accent" : "opacity-70 ring-line hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`ছবি ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-[16px] border border-line bg-card/70 p-4">
          <p className="text-[11px] font-[620] uppercase tracking-[0.14em] text-ink-faint">
            লাইভ এডিট (সাথে সাথে পোস্টারে আপডেট হবে)
          </p>
          <div className="mt-3 grid gap-2.5 text-[12.5px]">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-faint">ভাইরাল হেডলাইন</span>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="h-9 rounded-[10px] border border-line bg-card px-3 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-faint">সাবলাইন / মূল সুবিধা</span>
              <input
                type="text"
                value={subline}
                onChange={(e) => setSubline(e.target.value)}
                className="h-9 rounded-[10px] border border-line bg-card px-3 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-ink-faint">অফার ব্যাজ</span>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="h-9 rounded-[10px] border border-line bg-card px-3 text-[13px] outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-ink-faint">CTA বাটন</span>
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  className="h-9 rounded-[10px] border border-line bg-card px-3 text-[13px] outline-none focus:border-accent"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
