import { searchProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const items = await searchProducts(query);
  return Response.json({ ok: true, items });
}
