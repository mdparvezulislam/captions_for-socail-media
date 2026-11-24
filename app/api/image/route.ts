/**
 * Same-origin image proxy — দুটো কারণে দরকার:
 * 1. Canvas-এ cross-origin ছবি আঁকলে ক্যানভাস tainted হয় → PNG ডাউনলোড SecurityError
 * 2. Remote ছবিতে সঠিক filename দিয়ে ডাউনলোড
 * শুধু https image অনুমোদিত, ৮MB সীমা।
 */

const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) return new Response("missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return new Response("https only", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: { "user-agent": "caption-engine-image-proxy" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return new Response(`fetch failed: ${error instanceof Error ? error.message : "unknown"}`, { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new Response("not an image", { status: 415 });
  }

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return new Response("image too large", { status: 413 });
  }

  const filename = parsed.pathname.split("/").pop() || "image";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

  return new Response(buffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "content-disposition": `inline; filename="${encodeURIComponent(filename.replace(/\.[a-z]+$/i, ""))}.${extension}"`,
    },
  });
}
