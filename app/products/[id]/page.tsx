import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateForProduct } from "@/components/products/generate-for-product";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ProductGallery } from "@/components/ui/product-gallery";
import { IconPoster } from "@/components/ui/icons";
import { getPageById, getProduct, getProductLastUsed, listProductCaptions } from "@/lib/data";
import { captionCopyText, imageSrcFor, productGallerySources } from "@/lib/facebook-text";
import { bn, bnDate, bnRelative, discountPercent, taka } from "@/lib/format";
import { CAPTION_TYPES } from "@/lib/types";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  image: "ইমেজ ক্যাপশন",
  video: "ভিডিও ক্যাপশন",
  problem: "সমস্যা-সমাধান",
};

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const [page, captions, lastUsed] = await Promise.all([
    getPageById(product.pageId),
    listProductCaptions(product.id),
    getProductLastUsed(product.id),
  ]);
  if (!page) notFound();

  const today = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
  const latestByType = new Map<string, (typeof captions)[number]>();
  for (const caption of captions) {
    if (!latestByType.has(caption.type)) latestByType.set(caption.type, caption);
  }
  const todayCaptions = captions.filter((caption) => caption.runDate === today);
  const discount = discountPercent(product.priceBdt, product.compareAtPriceBdt);

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <Link href={`/products?page=${page.slug}`} className="text-[12.5px] text-ink-soft hover:text-ink">
          ← সব প্রোডাক্ট
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrcFor(product)}
            alt={product.nameBn}
            width={240}
            height={240}
            className="h-24 w-24 shrink-0 rounded-[18px] bg-paper-deep object-cover sm:h-28 sm:w-28"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{product.category}</Badge>
              {product.stock <= 5 ? <Badge tone="berry">স্টক কম</Badge> : null}
              {lastUsed ? <Badge tone="neutral">শেষ ব্যবহার {bnDate(lastUsed)}</Badge> : <Badge tone="accent">নতুন</Badge>}
            </div>
            <h1 className="mt-2 text-[24px] leading-snug sm:text-[28px]">{product.nameBn}</h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="num text-[22px] font-[660]">{taka(product.priceBdt)}</span>
              {product.compareAtPriceBdt ? (
                <span className="num text-[13px] text-ink-faint line-through">{taka(product.compareAtPriceBdt)}</span>
              ) : null}
              {discount > 0 ? <span className="text-[12px] font-[600] text-accent-deep">{bn(discount)}% ছাড়</span> : null}
              <span className="ml-1 text-[12px] text-ink-soft">· স্টক {bn(product.stock)}</span>
            </div>
            <p className="mt-2 max-w-[62ch] text-[13px] leading-[1.8] text-ink-soft">{product.solutionBn}</p>
          </div>
        </div>
      </header>

      <ProductGallery
        sources={productGallerySources(product)}
        productName={product.nameBn}
        sourceId={product.sourceId}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <section className="card-surface p-5">
          <h2 className="text-[13.5px] font-[640]">প্রোডাক্টের তথ্য</h2>
          <dl className="mt-3 grid gap-3 text-[12.5px]">
            <div>
              <dt className="text-ink-faint">সমস্যা</dt>
              <dd className="mt-0.5 leading-[1.8] text-ink">{product.problemBn}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">সমাধান</dt>
              <dd className="mt-0.5 leading-[1.8] text-ink">{product.solutionBn}</dd>
            </div>
            {product.features.length > 0 ? (
              <div>
                <dt className="text-ink-faint">ফিচার</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {product.features.map((feature) => (
                    <span key={feature} className="rounded-full border border-line bg-card-soft px-2.5 py-0.5 text-[11.5px]">
                      {feature}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-ink-faint">মেটেরিয়াল</dt>
                <dd className="mt-0.5 text-ink">{product.material ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">টার্গেট গ্রাহক</dt>
                <dd className="mt-0.5 text-ink">{product.targetAudience ?? "—"}</dd>
              </div>
            </div>
            <div>
              <dt className="text-ink-faint">অফার</dt>
              <dd className="mt-0.5 text-ink">{product.offerText ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">সোর্স আইডি</dt>
              <dd className="num mt-0.5 text-ink">{product.sourceId}</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-[640]">ক্যাপশন</h2>
            {todayCaptions.length === 0 ? <GenerateForProduct productId={product.id} /> : null}
          </div>

          {todayCaptions.length === 0 && captions.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-line bg-card/50 px-4 py-6 text-center">
              <p className="text-[13px] text-ink-soft">এখনো কোনো ক্যাপশন তৈরি হয়নি।</p>
              <p className="mt-1 text-[11.5px] text-ink-faint">
                উপরের বাটনে চাপ দিলে তিন ধরনের ক্যাপশন তৈরি হবে — এই প্রোডাক্ট আজকের ব্যাচে না থাকলেও।
              </p>
            </div>
          ) : null}

          {CAPTION_TYPES.map((type) => {
            const caption = todayCaptions.find((item) => item.type === type.type) ?? latestByType.get(type.type);
            if (!caption) return null;
            const isToday = caption.runDate === today;
            return (
              <article key={type.type} className="card-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={isToday ? "accent" : "neutral"}>{type.label}</Badge>
                    <span className="text-[11px] text-ink-faint">
                      {isToday ? "আজ" : bnDate(caption.runDate)} · {caption.status === "posted" ? "পোস্ট হয়েছে" : "রেডি"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/poster/${caption.id}`}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded-[10px] px-2.5 text-[11.5px] text-ink-soft",
                        "transition-colors hover:bg-ink/5 hover:text-ink",
                      )}
                    >
                      <IconPoster size={14} /> পোস্টার
                    </Link>
                    <CopyButton
                      text={captionCopyText(caption.body, caption.hashtags)}
                      label="কপি"
                      variant="quiet"
                      className="h-8 px-2.5 text-[11.5px]"
                    />
                  </div>
                </div>
                <p className="caption-text mt-2.5">{caption.body}</p>
              </article>
            );
          })}

          {captions.length > 0 ? (
            <div className="rounded-[16px] border border-line bg-card/50 p-4">
              <h3 className="text-[12px] font-[620] text-ink-soft">পুরনো ব্যবহার</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {captions.slice(0, 8).map((caption) => (
                  <li key={caption.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="text-ink-soft">
                      {bnDate(caption.runDate)} · {TYPE_LABEL[caption.type] ?? caption.type}
                    </span>
                    <span className={caption.status === "posted" ? "text-moss" : "text-ink-faint"}>
                      {caption.status === "posted" ? "পোস্ট হয়েছে" : caption.status === "edited" ? "এডিটেড" : "রেডি"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-ink-faint">শেষ ব্যবহার: {bnRelative(lastUsed ? `${lastUsed}T00:00:00Z` : null)}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
