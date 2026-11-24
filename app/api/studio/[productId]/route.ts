import { getStudioData } from "@/lib/data";
import { dhakaDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const data = await getStudioData(productId, dhakaDate());
  if (!data) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }
  return Response.json(
    { ok: true, ...data },
    { headers: { "cache-control": "no-store, no-cache, must-revalidate" } },
  );
}
