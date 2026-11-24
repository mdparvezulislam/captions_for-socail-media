"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconDownload, IconImage } from "@/components/ui/icons";
import { drawPoster, loadImageElement, posterSize, type PosterData, type PosterRatio, type PosterTemplate } from "@/lib/poster";
import { cn } from "@/lib/cn";

const RATIOS: { value: PosterRatio; label: string; hint: string }[] = [
  { value: "4:5", label: "৪:৫", hint: "ফিড" },
  { value: "1:1", label: "১:১", hint: "স্কয়ার" },
  { value: "9:16", label: "৯:১৬", hint: "স্টোরি" },
];

const TEMPLATES: { value: PosterTemplate; label: string }[] = [
  { value: "editorial", label: "এডিটোরিয়াল" },
  { value: "bold", label: "বোল্ড" },
  { value: "minimal", label: "মিনিমাল" },
];

export function PosterStudio({ data, imageUrl }: { data: PosterData; imageUrl?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState<PosterRatio>(data.ratio);
  const [template, setTemplate] = useState<PosterTemplate>(data.template);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<HTMLImageElement | null>(null);

  const current: PosterData = useMemo(() => ({ ...data, ratio, template }), [data, ratio, template]);

  const paint = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await drawPoster(canvas, current, productImage);
    setReady(true);
  }, [current, productImage]);

  useEffect(() => {
    let cancelled = false;
    if (!imageUrl) {
      setProductImage(null);
      return;
    }
    void loadImageElement(imageUrl).then((image) => {
      if (!cancelled) setProductImage(image);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

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
      link.download = `poster-${ratio.replace(":", "x")}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNote("ছবি ডাউনলোড হয়েছে");
      setTimeout(() => setNote(null), 2000);
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
    } catch {
      setNote("ব্রাউজার কপি সাপোর্ট করছে না — ডাউনলোড করুন");
    }
    setTimeout(() => setNote(null), 2600);
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
          <Button variant="primary" icon={<IconDownload size={16} />} onClick={download}>
            PNG ডাউনলোড
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

        <div>
          <p className="text-[11px] font-[620] uppercase tracking-[0.14em] text-ink-faint">টেমপ্লেট</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTemplate(item.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors",
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

        <div className="rounded-[16px] border border-line bg-card/60 p-4">
          <p className="text-[11px] font-[620] uppercase tracking-[0.14em] text-ink-faint">পোস্টারে যা থাকছে</p>
          <dl className="mt-2.5 grid gap-2 text-[12.5px]">
            {[
              ["হেডলাইন", data.headline],
              ["সাবলাইন", data.subline],
              ["ব্যাজ", data.badge],
              ["CTA", data.cta],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <dt className="w-20 shrink-0 text-ink-faint">{label}</dt>
                <dd className="min-w-0 flex-1 text-ink">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 border-t border-line/70 pt-2.5 text-[11.5px] leading-[1.7] text-ink-faint">
            লেখাগুলো এডিট করতে ক্যাপশনের নিচের লেখা বদলে রিজেনারেট করুন — পোস্টার কপি স্বয়ংক্রিয়ভাবে আপডেট হয়।
          </p>
        </div>
      </div>
    </div>
  );
}
