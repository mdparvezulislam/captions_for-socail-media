import type { CaptionMeta, CaptionType, Page, PosterCopy, Product } from "@/lib/types";
import { demoCaptionSet, demoPosterCopy } from "@/lib/ai/demo";
import { buildPrompt, type Angle } from "@/lib/ai/prompts";
import { callGemini, DEFAULT_GEMINI_MODEL, GeminiError } from "@/lib/ai/gemini";
import { validateCaption } from "@/lib/ai/validate";
import { taka } from "@/lib/format";

export interface CaptionDraft {
  type: CaptionType;
  body: string;
  hashtags: string[];
  meta: CaptionMeta;
}

export interface GenerateOutcome {
  drafts: CaptionDraft[];
  source: "gemini" | "demo";
  model: string;
  tokensIn: number;
  tokensOut: number;
  issues: string[];
  latencyMs: number;
}

export interface GenerateInput {
  page: Page;
  product: Product;
  avoid?: string[];
  apiKey?: string;
  model?: string;
  instruction?: string;
  type?: CaptionType;
}

const ANGLES: Angle[] = ["benefit", "emotional", "urgency"];

const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** High-demand 503s are transient — retry with backoff, then fall back to a stable model. */
async function callWithFallback(
  params: Omit<Parameters<typeof callGemini>[0], "model">,
  primaryModel: string,
): Promise<{ response: Awaited<ReturnType<typeof callGemini>>; model: string }> {
  const chain = [primaryModel, ...FALLBACK_MODELS.filter((model) => model !== primaryModel)];
  let lastError: GeminiError | null = null;

  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await callGemini({ ...params, model });
        return { response, model };
      } catch (error) {
        if (!(error instanceof GeminiError) || !error.retryable) throw error;
        lastError = error;
        await sleep(1200 * (attempt + 1));
      }
    }
  }
  throw lastError ?? new GeminiError("Gemini unavailable");
}

function angleFor(productId: string): Angle {
  let sum = 0;
  for (const char of productId) sum += char.charCodeAt(0);
  return ANGLES[sum % ANGLES.length];
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asTags(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .map((tag) => tag.replace(/\s+/g, ""))
    .filter((tag) => tag.length > 1);
  return tags.length >= 3 ? tags.slice(0, 8) : fallback;
}

function asPoster(value: unknown, fallback: PosterCopy): PosterCopy {
  if (!value || typeof value !== "object") return fallback;
  const poster = value as Record<string, unknown>;
  return {
    headline: asText(poster.headline, fallback.headline).slice(0, 40),
    subline: asText(poster.subline, fallback.subline).slice(0, 60),
    badge: asText(poster.badge, fallback.badge).slice(0, 14),
    cta: asText(poster.cta, fallback.cta).slice(0, 26),
  };
}

function posterFromDrafts(page: Page, product: Product, raw: unknown): PosterCopy {
  const fallback = demoPosterCopy(product, page);
  return asPoster(raw, fallback);
}

export async function generateCaptionDrafts(input: GenerateInput): Promise<GenerateOutcome> {
  const started = Date.now();
  const { page, product } = input;
  const fallbackPoster = demoPosterCopy(product, page);
  const demo = demoCaptionSet(product, page).map((item) => ({
    ...item,
    hashtags: page.hashtags,
    meta: { ...item.meta, poster: fallbackPoster },
  }));

  if (!input.apiKey) {
    return {
      drafts: demo,
      source: "demo",
      model: "demo",
      tokensIn: 0,
      tokensOut: 0,
      issues: [],
      latencyMs: Date.now() - started,
    };
  }

  const prompt = buildPrompt({
    page,
    product,
    type: input.type ?? "image",
    angle: angleFor(product.id),
    avoid: input.avoid?.slice(0, 8) ?? [],
  });

  const user = input.instruction
    ? `${prompt.user}\n\nঅতিরিক্ত নির্দেশনা (অবশ্যই মানতে হবে): ${input.instruction}`
    : prompt.user;

  const { response, model: usedModel } = await callWithFallback(
    {
      apiKey: input.apiKey,
      system: prompt.system,
      user,
      schema: prompt.responseSchema,
    },
    input.model ?? DEFAULT_GEMINI_MODEL,
  );

  const json = response.json as Record<string, unknown>;
  const video = (json.video_caption ?? {}) as Record<string, unknown>;
  const hashtags = asTags(json.hashtags, page.hashtags);
  const poster = posterFromDrafts(page, product, json.poster);
  const issues: string[] = [];

  const raw: Record<CaptionType, string> = {
    image: asText(json.image_caption),
    video: [asText(video.hook), asText(video.body), asText(video.cta)].filter(Boolean).join("\n"),
    problem: asText(json.problem_caption),
  };

  const drafts: CaptionDraft[] = (["image", "video", "problem"] as CaptionType[]).map((type) => {
    const demoDraft = demo.find((item) => item.type === type)!;
    let body = raw[type];
    let meta: CaptionMeta = {
      ...demoDraft.meta,
      source: "gemini",
      poster,
      hook: type === "video" ? asText(video.hook, demoDraft.meta.hook) : demoDraft.meta.hook,
      cta: asText(video.cta, page.ctaText),
    };

    if (!body || body.length < 24) {
      issues.push(`${type}: খালি বা খুব ছোট আউটপুট`);
      body = demoDraft.body;
      meta = { ...meta, source: "demo" };
    } else {
      const validation = validateCaption({
        body,
        type,
        product,
        recentBodies: input.avoid ?? [],
        hashtags,
      });
      if (!validation.ok) {
        issues.push(`${type}: ${validation.issues.join(", ")}`);
        // Never ship a caption with a wrong price or a banned claim — fall back to the safe draft.
        if (validation.issues.some((issue) => /দাম|নিষিদ্ধ/.test(issue))) {
          body = demoDraft.body;
          meta = { ...meta, source: "demo" };
        }
      }
    }

    return { type, body, hashtags, meta };
  });

  return {
    drafts,
    source: "gemini",
    model: usedModel,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    issues,
    latencyMs: Date.now() - started,
  };
}

export function priceLabel(product: Product): string {
  return taka(product.priceBdt);
}
