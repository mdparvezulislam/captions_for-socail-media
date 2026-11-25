import { PageTabs } from "@/components/shell/page-tabs";
import { SyncButton } from "@/components/products/sync-button";
import { BulkGenerate } from "@/components/products/bulk-generate";
import { ProductCatalogGrid } from "@/components/products/product-catalog-grid";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { getPageStats, listPages, listTaskProducts } from "@/lib/data";
import { bn, dhakaDate } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; cat?: string; p?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const pages = await listPages();
  if (pages.length === 0) return <EmptyState title="পেজ নেই" description="আগে একটি পেজ যোগ করুন।" />;

  const active = pages.find((page) => page.slug === params.page) ?? pages[0];
  const date = dhakaDate();
  const [tasks, stats] = await Promise.all([
    listTaskProducts(active.id, date),
    getPageStats(active.id, date),
  ]);
  const readyCount = tasks.filter((task) => task.hasCaptionsToday).length;
  const initialPage = Math.max(1, Number.parseInt(params.p ?? "1", 10) || 1);

  return (
    <div className="flex flex-col gap-2.5 sm:gap-4">
      <header className="animate-fade flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] leading-tight sm:text-[26px]">{bn(stats.products)}টি প্রোডাক্ট</h1>
              <Badge tone="moss">{bn(readyCount)} রেডি</Badge>
            </div>
            <p className="mt-0.5 hidden text-[12.5px] text-ink-soft sm:block">
              যেকোনো প্রোডাক্টে ক্লিক করলেই ইনস্ট্যান্ট ক্যাপশন ও ভাইরাল পোস্টার স্টুডিও খুলবে।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SyncButton pageSlug={active.slug} />
            <BulkGenerate pageSlug={active.slug} />
          </div>
        </div>

        <PageTabs pages={pages} activeSlug={active.slug} basePath="/products" className="py-0" />
      </header>

      <ProductCatalogGrid
        page={active}
        tasks={tasks}
        initialQuery={params.q ?? ""}
        initialCategory={params.cat ?? "all"}
        initialPage={initialPage}
      />
    </div>
  );
}
