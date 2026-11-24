"use client";

import { useState } from "react";
import { IconCheck, IconDownload, IconImage, IconX } from "@/components/ui/icons";
import { showToast } from "@/components/ui/toast";
import { bn } from "@/lib/format";
import { cn } from "@/lib/cn";

async function triggerFileDownload(src: string, filename: string): Promise<boolean> {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
    const finalName = filename.replace(/\.[a-z0-9]+$/i, "") + `.${ext}`;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    return true;
  } catch {
    // Fallback direct anchor download
    const link = document.createElement("a");
    link.href = src;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}

export function ProductGallery({
  sources,
  productName,
  sourceId,
  compact = false,
}: {
  sources: string[];
  productName: string;
  sourceId: string;
  compact?: boolean;
}) {
  const [downloadedIdx, setDownloadedIdx] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (sources.length === 0) return null;

  const safeSlug = sourceId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "product";

  async function downloadSingle(index: number) {
    const src = sources[index];
    if (!src) return;
    setDownloadedIdx(index);
    await triggerFileDownload(src, `${safeSlug}-${index + 1}.jpg`);
    showToast(`ছবি ${bn(index + 1)}/${bn(sources.length)} ডাউনলোড হয়েছে`);
    setTimeout(() => setDownloadedIdx((cur) => (cur === index ? null : cur)), 1600);
  }

  async function downloadAll() {
    if (downloadingAll) return;
    setDownloadingAll(true);
    showToast(`${bn(sources.length)}টি ছবি ডাউনলোড শুরু হয়েছে…`);
    for (let i = 0; i < sources.length; i++) {
      await triggerFileDownload(sources[i], `${safeSlug}-${i + 1}.jpg`);
      if (i + 1 < sources.length) {
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
    }
    setDownloadingAll(false);
    showToast(`সব ${bn(sources.length)}টি ছবি ডাউনলোড সম্পন্ন!`);
  }

  return (
    <div className={cn("rounded-[14px] border border-line bg-card/75", compact ? "p-3" : "p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconImage size={14} className="text-accent-deep" />
          <span className="text-[12px] font-[620] text-ink">
            প্রোডাক্টের ছবি ({bn(sources.length)}টি)
          </span>
          <span className="text-[10.5px] text-ink-faint">· ট্যাপ করলেই ডাউনলোড</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLightboxIdx(0)}
            className="inline-flex h-7 items-center gap-1 rounded-[9px] border border-line bg-card px-2.5 text-[11px] font-[560] text-ink-soft transition-colors hover:border-ink/25 hover:text-ink"
          >
            বড় দেখুন
          </button>
          {sources.length > 1 ? (
            <button
              type="button"
              disabled={downloadingAll}
              onClick={downloadAll}
              className="inline-flex h-7 items-center gap-1 rounded-[9px] border border-accent/30 bg-accent-soft px-2.5 text-[11px] font-[600] text-accent-deep transition-colors hover:bg-accent hover:text-white disabled:opacity-60"
            >
              <IconDownload size={12} />
              {downloadingAll ? "ডাউনলোড হচ্ছে…" : "সব ডাউনলোড"}
            </button>
          ) : null}
        </div>
      </div>

      {/* কম্প্যাক্ট থাম্বনেইল স্ট্রিপ — ক্লিক করলেই ইনস্ট্যান্ট ডাউনলোড */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2" data-testid="product-gallery-strip">
        {sources.map((src, index) => {
          const isDone = downloadedIdx === index;
          return (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => downloadSingle(index)}
              title={`ছবি ${bn(index + 1)} ডাউনলোড করুন`}
              aria-label={`ছবি ${bn(index + 1)} ডাউনলোড করুন`}
              className={cn(
                "group relative overflow-hidden rounded-[11px] bg-paper-deep ring-1 transition-all active:scale-95",
                compact ? "h-14 w-14" : "h-16 w-16",
                isDone ? "ring-2 ring-moss" : "ring-line hover:ring-accent",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${productName} — ছবি ${index + 1}`}
                width={80}
                height={80}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span
                className={cn(
                  "absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-colors",
                  isDone ? "bg-moss text-white" : "bg-ink/80 text-white group-hover:bg-accent",
                )}
              >
                {isDone ? <IconCheck size={11} strokeWidth={2.6} /> : <IconDownload size={10} />}
              </span>
              {index === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-ink/75 px-1 py-[1px] text-[8.5px] font-[600] text-white">
                  মেইন
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ফুল গ্যালারি লাইটবক্স */}
      {lightboxIdx !== null ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-ink/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
          role="dialog"
          aria-modal="true"
          aria-label="প্রোডাক্ট গ্যালারি"
        >
          <div
            className="flex w-full max-w-[540px] flex-col gap-3 rounded-[20px] border border-white/10 bg-[#1B1815] p-4 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-[600]">
                ছবি {bn(lightboxIdx + 1)} / {bn(sources.length)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadSingle(lightboxIdx)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-[12px] font-[600] text-white hover:bg-accent-deep"
                >
                  <IconDownload size={13} /> ডাউনলোড
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIdx(null)}
                  aria-label="বন্ধ"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <IconX size={15} />
                </button>
              </div>
            </div>

            <div className="flex max-h-[60dvh] items-center justify-center overflow-hidden rounded-[14px] bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sources[lightboxIdx]}
                alt={`${productName} — ছবি ${lightboxIdx + 1}`}
                className="max-h-[60dvh] w-auto object-contain"
              />
            </div>

            {sources.length > 1 ? (
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
                {sources.map((src, idx) => (
                  <button
                    key={`lb-${idx}`}
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    className={cn(
                      "h-12 w-12 shrink-0 overflow-hidden rounded-[9px] ring-2 transition-all",
                      idx === lightboxIdx ? "ring-accent" : "opacity-60 ring-transparent hover:opacity-100",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
