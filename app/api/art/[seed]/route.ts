import { artSvg } from "@/lib/art";

export async function GET(_request: Request, context: { params: Promise<{ seed: string }> }) {
  const { seed } = await context.params;
  const svg = artSvg(decodeURIComponent(seed ?? "art"));
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
