import Link from "next/link";
import { notFound } from "next/navigation";
import { PosterStudio } from "@/components/poster/poster-studio";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { getCaption, getPageById, getProduct } from "@/lib/data";
import { captionCopyText } from "@/lib/facebook-text";
import { bnRelative, discountPercent, taka } from "@/lib/format";
import type { PosterCopy } from "@/lib/types";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const caption = await getCaption(id);
  if (!caption) notFound();

  const [product, page] = await Promise.all([getProduct(caption.productId), getPageById(caption.pageId)]);
  if (!product || !page) notFound();

  const poster: PosterCopy = caption.meta.poster ?? {
    headline: product.nameBn.slice(0, 28),
    subline: product.offerText ?? product.solutionBn.slice(0, 40),
    badge: discountPercent(product.priceBdt, product.compareAtPriceBdt) > 0
      ? `${discountPercent(product.priceBdt, product.compareAtPriceBdt)}% OFF`
      : "নতুন",
    cta: page.ctaText.slice(0, 22),
  };

  const data = {
    brandName: page.brandName,
    logoMark: page.brand.logoMark,
    watermark: page.brand.watermark,
    tagline: page.tagline,
    headline: poster.headline,
    subline: poster.subline,
    badge: poster.badge,
    cta: poster.cta,
    price: taka(product.priceBdt),
    comparePrice: product.compareAtPriceBdt ? taka(product.compareAtPriceBdt) : "",
    offer: product.offerText ?? "",
    productName: product.nameBn,
    colors: {
      primary: page.brand.primary,
      accent: page.brand.accent,
      surface: page.brand.surface,
      ink: page.brand.ink,
    },
    template: page.brand.layout,
    ratio: "4:5" as const,
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <Link href={`/today?page=${page.slug}`} className="text-[12.5px] text-ink-soft hover:text-ink">
          ← আজকের ফিডে ফিরুন
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">
              পোস্টার স্টুডিও · {page.name}
            </p>
            <h1 className="mt-2 max-w-[32ch] text-[24px] leading-snug sm:text-[28px]">{product.nameBn}</h1>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              {caption.type === "image" ? "ইমেজ ক্যাপশন" : caption.type === "video" ? "ভিডিও ক্যাপশন" : "সমস্যা-সমাধান"} ·{" "}
              {bnRelative(caption.createdAt)} তৈরি
            </p>
          </div>
          <div className="flex items-center gap-2">
            {caption.status === "posted" ? <Badge tone="moss">পোস্ট হয়েছে</Badge> : <Badge tone="accent">রেডি</Badge>}
            <Badge tone="neutral">{taka(product.priceBdt)}</Badge>
          </div>
        </div>
      </header>

      <PosterStudio data={data} />

      <section className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-[640]">এই পোস্টের ক্যাপশন</h2>
          <CopyButton
            text={captionCopyText(caption.body, caption.hashtags)}
            label="ক্যাপশন কপি"
            variant="quiet"
            className="h-9"
          />
        </div>
        <p className="caption-text mt-3 rounded-[14px] border border-line-soft bg-card-soft/70 px-4 py-3.5">
          {caption.body}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-1.5 text-[11.5px] leading-[1.7] text-sky">
          {caption.hashtags.join(" ")}
        </p>
      </section>
    </div>
  );
}
