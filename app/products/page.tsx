import Link from "next/link";
import { PageTabs } from "@/components/shell/page-tabs";
import { SyncButton } from "@/components/products/sync-button";
import { BulkGenerate } from "@/components/products/bulk-generate";
import { imageSrcFor } from "@/lib/facebook-text";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { IconArrowUpRight, IconSearch } from "@/components/ui/icons";
import { getLastUsed, getPageStats, listCategories, listPages, listProducts } from "@/lib/data";
import { bn, bnNumber, bnRelative, discountPercent, taka } from "@/lib/format";
import { cn } from "@/lib/cn";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; cat?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const pages = await listPages();
  if (pages.length === 0) return <EmptyState title="পেজ নেই" description="আগে একটি পেজ যোগ করুন।" />;

  const active = pages.find((page) => page.slug === params.page) ?? pages[0];
  const [products, categories, lastUsed, stats] = await Promise.all([
    listProducts(active.id, { search: params.q, category: params.cat }),
    listCategories(active.id),
    getLastUsed(active.id),
    getPageStats(active.id, new Date().toISOString().slice(0, 10)),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <p className="text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">প্রোডাক্ট ক্যাটালগ</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] leading-tight sm:text-[30px]">{bn(stats.products)}টি প্রোডাক্ট</h1>
            <p className="mt-1 text-[13px] text-ink-soft">
              যেকোনো প্রোডাক্টে ক্লিক করে এখনই ক্যাপশন তৈরি করতে পারেন — ব্যাচের জন্য অপেক্ষা করতে হবে না।
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tone="moss">{bn(stats.fresh)}টি অপেক্ষায়</Badge>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <SyncButton pageSlug={active.slug} />
              <BulkGenerate pageSlug={active.slug} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <PageTabs pages={pages} activeSlug={active.slug} basePath="/products" />
        </div>
      </header>

      <form className="flex flex-wrap items-center gap-2" action="/products" method="get">
        <input type="hidden" name="page" value={active.slug} />
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <IconSearch size={16} />
          </span>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="নাম বা সমস্যা দিয়ে খুঁজুন…"
            className="h-10 w-full rounded-[12px] border border-line bg-card pl-9 pr-3 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <select
          name="cat"
          defaultValue={params.cat ?? "all"}
          className="h-10 rounded-[12px] border border-line bg-card px-3 text-[13px] text-ink-soft outline-none focus:border-accent"
        >
          <option value="all">সব ক্যাটাগরি</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-[12px] border border-ink bg-ink px-4 text-[13px] font-[560] text-[#FFFDF8]"
        >
          খুঁজুন
        </button>
        {params.q || (params.cat && params.cat !== "all") ? (
          <Link
            href={`/products?page=${active.slug}`}
            className="text-[12px] text-ink-faint underline decoration-line underline-offset-4 hover:text-ink"
          >
            ফিল্টার মুছুন
          </Link>
        ) : null}
      </form>

      {products.length === 0 ? (
        <EmptyState
          title="এই ফিল্টারে কিছু পাওয়া যায়নি"
          description="অন্য কীওয়ার্ড বা ক্যাটাগরি দিয়ে খুঁজুন।"
        />
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-line bg-card">
          <div className="hidden grid-cols-[minmax(0,2.4fr)_100px_90px_110px_120px_120px] gap-3 border-b border-line/70 bg-card-soft/60 px-4 py-2 text-[10.5px] font-[620] uppercase tracking-[0.1em] text-ink-faint lg:grid">
            <span>প্রোডাক্ট</span>
            <span>দাম</span>
            <span>স্টক</span>
            <span>ক্যাটাগরি</span>
            <span>শেষ ব্যবহার</span>
            <span className="text-right">ক্যাপশন</span>
          </div>
          <ul className="divide-y divide-line/60">
            {products.map((product) => {
              const last = lastUsed.get(product.id) ?? null;
              const discount = discountPercent(product.priceBdt, product.compareAtPriceBdt);
              return (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-card-soft/70 lg:grid-cols-[minmax(0,2.4fr)_100px_90px_110px_120px_120px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrcFor(product)}
                        alt=""
                        width={88}
                        height={88}
                        loading="lazy"
                        className="h-11 w-11 shrink-0 rounded-[12px] bg-paper-deep object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-[580]">{product.nameBn}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                          <span className="num">{product.sourceId}</span>
                          {discount > 0 ? (
                            <span className="rounded-full bg-accent-soft px-1.5 text-accent-deep">{bn(discount)}% ছাড়</span>
                          ) : null}
                        </span>
                      </span>
                    </div>
                    <span className="num hidden text-[12.5px] font-[560] lg:block">{taka(product.priceBdt)}</span>
                    <span className={cn("num hidden text-[12px] lg:block", product.stock <= 5 ? "text-berry" : "text-ink-soft")}>
                      {bnNumber(product.stock)}
                    </span>
                    <span className="hidden text-[12px] text-ink-soft lg:block">{product.category}</span>
                    <span className="hidden text-[11.5px] text-ink-soft lg:block">
                      {last ? bnRelative(`${last}T00:00:00Z`) : "কখনো নয়"}
                    </span>
                    <span className="flex items-center justify-end gap-1 text-[12px] font-[560] text-ink-soft group-hover:text-ink">
                      ক্যাপশন
                      <IconArrowUpRight size={14} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
