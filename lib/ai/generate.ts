import type { CaptionMeta, CaptionType, Page, PosterCopy, Product } from "@/lib/types";
import { demoCaptionSet, demoPosterCopy } from "@/lib/ai/demo";
import { buildPrompt, type Angle } from "@/lib/ai/prompts";
import { callGemini, DEFAULT_GEMINI_MODEL, GeminiError } from "@/lib/ai/gemini";
import { validateCaption } from "@/lib/ai/validate";
import { commentKeyword } from "@/lib/ai/demo";

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
  variationSeed?: string;
  temperature?: number;
}

const ANGLES: Angle[] = ["benefit", "emotional", "urgency"];

// Ordered so flagship Flash runs first when quota is available, and high-capacity
// Flash-Lite models run at the tail (so a dead 429 flagship never masks a retryable 503).
const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];

// Per-isolate cooldown for models whose daily quota is exhausted or deprecated (5 min TTL).
const COOLDOWN_MS = 5 * 60 * 1000;
const modelCooldownUntil = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Smart multi-model fallback:
 * - Immediately advances on 429 daily-quota exhaustion or 404 deprecated model (and cools down for 5 min)
 * - Retries transient 503 high-demand spikes briefly before falling over to the next Gemini model
 */
async function callWithFallback(
  params: Omit<Parameters<typeof callGemini>[0], "model">,
  primaryModel: string,
): Promise<{ response: Awaited<ReturnType<typeof callGemini>>; model: string }> {
  const fullChain = [primaryModel, ...FALLBACK_MODELS.filter((model) => model !== primaryModel)];
  const now = Date.now();
  const activeChain = fullChain.filter((model) => (modelCooldownUntil.get(model) ?? 0) <= now);
  const chain = activeChain.length > 0 ? activeChain : ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", primaryModel];
  let lastError: GeminiError | null = null;

  for (const model of chain) {
    const isFastLite = model === "gemini-3.5-flash-lite" || model === "gemini-flash-lite-latest";
    const maxAttempts = isFastLite ? 3 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await callGemini({ ...params, model });
        modelCooldownUntil.delete(model);
        return { response, model };
      } catch (error) {
        if (!(error instanceof GeminiError)) throw error;
        lastError = error;

        if (error.quotaExhausted || error.notFound) {
          modelCooldownUntil.set(model, Date.now() + COOLDOWN_MS);
          break; // skip immediately to next model — retrying won't help
        }

        if (!error.retryable) throw error;
        if (attempt + 1 < maxAttempts) {
          await sleep(600 + Math.floor(Math.random() * 400));
        }
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
    angle: angleFor(input.variationSeed ? `${product.id}:${input.variationSeed}` : product.id),
    avoid: input.avoid?.slice(0, 10) ?? [],
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
      temperature: input.temperature ?? 0.88,
    },
    input.model ?? DEFAULT_GEMINI_MODEL,
  );

  const json = response.json as Record<string, unknown>;
  const video = (json.video_caption ?? {}) as Record<string, unknown>;
  const hashtags = asTags(json.hashtags, page.hashtags);
  const poster = posterFromDrafts(page, product, json.poster);
  const issues: string[] = [];

  const keyword = asText(json.comment_keyword, commentKeyword(product));
  const videoStory = [asText(video.hook), asText(video.body)].filter(Boolean).join("\n");
  const videoCta = asText(video.cta);
  const videoFormatted = [videoStory, videoCta].filter(Boolean).join("\n\n");
  // Never allow robotic "সমাধান:" label prefix in Caption 3
  const cleanProblem = asText(json.problem_caption).replace(/(^|\n)\s*সমাধান\s*[:：\-–—]\s*/g, "$1");
  const raw: Record<CaptionType, string> = {
    image: asText(json.image_caption),
    video: videoFormatted,
    problem: cleanProblem,
  };

  const drafts: CaptionDraft[] = (["image", "video", "problem"] as CaptionType[]).map((type) => {
    const demoDraft = demo.find((item) => item.type === type)!;
    let body = raw[type];
    let meta: CaptionMeta = {
      ...demoDraft.meta,
      source: "gemini",
      poster,
      keyword,
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
