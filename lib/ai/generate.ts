import type { CaptionMeta, CaptionType, Page, PosterCopy, Product } from "@/lib/types";
import { demoCaptionSet, demoPosterCopy, commentKeyword } from "@/lib/ai/demo";
import { buildPrompt } from "@/lib/ai/prompts";
import { callGemini, DEFAULT_GEMINI_MODEL, GeminiError } from "@/lib/ai/gemini";
import { crossCheck, validateCaption } from "@/lib/ai/validate";

export interface CaptionDraft {
  type: CaptionType;
  body: string;
  hashtags: string[];
  meta: CaptionMeta;
}

export interface GenerateOutcome {
  drafts: CaptionDraft[];
  source: "gemini" | "demo" | "mixed";
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

const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const TYPES: CaptionType[] = ["image", "video", "problem"];

/** ধরন অনুযায়ী ভাবনার বাজেট — লম্বা লেখায় বেশি ভাবা দরকার */
const THINKING: Record<CaptionType, number> = { image: 768, video: 192, problem: 1024 };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        await sleep(900 * (attempt + 1));
      }
    }
  }
  throw lastError ?? new GeminiError("Gemini unavailable");
}

function normalizeNewlines(text: string): string {
  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? normalizeNewlines(value) : fallback;
}

/**
 * মডেল মাঝে মাঝে সব লাইন একসাথে লেখে — বুলেট ও CTA আলাদা লাইনে ভেঙে দিই।
 * (ইতিমধ্যে ঠিকভাবে ভাঙা ক্যাপশনে কিছু বদলায় না।)
 */
/** ধরন অনুযায়ী লাইন-গঠন নিশ্চিত করা (ভিডিও = ৩–৪ শক্ত লাইন, বাকিগুলোতে ফাঁকা লাইন) */
export function structureForType(text: string, type: CaptionType): string {
  if (type === "video" && (text.match(/\n/g) ?? []).length <= 1) {
    const sentences = text
      .split(/(?<=।)\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    if (sentences.length >= 2) {
      const lines: string[] = [];
      lines.push(sentences[0]);
      const middle = sentences.slice(1, -1);
      if (middle.length > 0) lines.push(middle.join(" "));
      lines.push(sentences[sentences.length - 1]);
      return lines.slice(0, 4).join("\n");
    }
  }
  if (type !== "video") {
    return text
      .replace(/([^\n])\n(✅)/g, "$1\n\n$2")
      .replace(/\n{3,}/g, "\n\n")
      .split("\n")
      .flatMap((line) => {
        // লম্বা প্যারাগ্রাফের শেষ CTA বাক্যটা আলাদা লাইনে
        if (line.length > 240) {
          const index = line.lastIndexOf("। ");
          if (index > 60) return [line.slice(0, index + 1).trim(), "", line.slice(index + 2).trim()];
        }
        return [line];
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .split("\n")
      .reduce<string[]>((acc, line) => {
        // বুলেটের মাঝে অতিরিক্ত ফাঁকা লাইন থাকলে সরিয়ে দিই
        if (line === "" && acc[acc.length - 1] === "") return acc;
        acc.push(line);
        return acc;
      }, [])
      .join("\n")
      .trim();
  }
  return text;
}

export function reflowCaption(text: string): string {
  let value = text.replace(/[ \t]+/g, " ").trim();
  const newlines = (value.match(/\n/g) ?? []).length;
  if (newlines >= 2) return value;

  value = value
    .replace(/\s*(✅)/g, "\n$1")
    .replace(/\s*(কমেন্টে\s)/g, "\n\n$1")
    .replace(/\s*(ইনবক্স করুন)/g, "\n$1")
    .replace(/\s*(বিস্তারিত জানতে|দাম জানতে|অর্ডার করতে|স্টক শেষ)/g, "\n$1");

  value = value.replace(/\n{2,}/g, "\n").replace(/\n(✅)/, "\n\n$1");
  // "- ✅ ..." ধরনের বুলেট থেকে ড্যাশ সরিয়ে দিই
  value = value
    .split("\n")
    .map((line) => line.replace(/^\s*[-–—•]\s*(✅)/, "$1"))
    .join("\n");
  return value.trim();
}

function asTags(value: unknown, fallback: string[], type: CaptionType): string[] {
  if (!Array.isArray(value)) return fallback;
  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .map((tag) => tag.replace(/\s+/g, ""))
    .filter((tag) => tag.length > 2);

  // ধরন অনুযায়ী হ্যাশট্যাগ আলাদা রাখা — একই সেট তিনবার দেখালে AI-গন্ধ বেরিয়ে যায়
  const mixed = Array.from(new Set([...tags, ...fallback]));
  if (type === "video") return mixed.slice(0, 4);
  if (type === "problem") return mixed.slice(-4);
  return mixed.slice(0, 5);
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

interface SingleResult {
  type: CaptionType;
  caption: string;
  hashtags: string[];
  keyword?: string;
  poster?: unknown;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

async function generateOneType(input: {
  page: Page;
  product: Product;
  type: CaptionType;
  apiKey: string;
  model: string;
  avoid: string[];
  siblings: string[];
  instruction?: string;
}): Promise<SingleResult> {
  const prompt = buildPrompt({
    page: input.page,
    product: input.product,
    type: input.type,
    avoid: input.avoid,
    siblingBodies: input.siblings,
  });

  const user = input.instruction
    ? `${prompt.user}\n\nঅতিরিক্ত নির্দেশনা (অবশ্যই মানতে হবে): ${input.instruction}`
    : prompt.user;

  const { response, model } = await callWithFallback(
    {
      apiKey: input.apiKey,
      system: prompt.system,
      user,
      schema: prompt.responseSchema,
      thinkingBudget: THINKING[input.type],
      timeoutMs: 40_000,
    },
    input.model,
  );

  const json = response.json as Record<string, unknown>;
  return {
    type: input.type,
    caption: structureForType(reflowCaption(asText(json.caption)), input.type),
    hashtags: Array.isArray(json.hashtags) ? (json.hashtags as string[]) : [],
    keyword: asText(json.comment_keyword) || undefined,
    poster: json.poster,
    model,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
  };
}

function demoDraft(page: Page, product: Product, type: CaptionType): CaptionDraft {
  const fallbackPoster = demoPosterCopy(product, page);
  const draft = demoCaptionSet(product, page).find((item) => item.type === type)!;
  return {
    type,
    body: draft.body,
    hashtags: page.hashtags,
    meta: { ...draft.meta, poster: fallbackPoster, source: "demo", keyword: commentKeyword(product) },
  };
}

function acceptedLines(drafts: CaptionDraft[]): string[] {
  return drafts.flatMap((draft) => draft.body.split("\n").map((line) => line.trim()).filter((line) => line.length > 8));
}

/**
 * প্রতি প্রোডাক্টে ৩টি আলাদা LLM কল — এক কলে তিনটা লিখলে লেখাগুলো একই ছাঁচে পড়ে।
 * তারপর তিনটে ক্যাপশন পরস্পরের সাথে মিলিয়ে দেখা হয়; মিলে গেলে সেই ধরনটা
 * অন্য ধরনগুলোর লাইন "নিষিদ্ধ" করে আবার লেখা হয়।
 */
export async function generateCaptionDrafts(input: GenerateInput): Promise<GenerateOutcome> {
  const started = Date.now();
  const { page, product } = input;
  const types = input.type ? [input.type] : TYPES;

  if (!input.apiKey) {
    return {
      drafts: types.map((type) => demoDraft(page, product, type)),
      source: "demo",
      model: "demo",
      tokensIn: 0,
      tokensOut: 0,
      issues: ["API key নেই — ডেমো জেনারেটর"],
      latencyMs: Date.now() - started,
    };
  }

  const siblings: string[] = [];
  const drafts: CaptionDraft[] = [];
  const issues: string[] = [];
  let tokensIn = 0;
  let tokensOut = 0;
  let model = input.model ?? DEFAULT_GEMINI_MODEL;
  let geminiCount = 0;

  for (const type of types) {
    let attempt = 0;
    let accepted: CaptionDraft | null = null;
    let bestEffort: { body: string; hashtags: string[]; keyword?: string; poster?: unknown } | null = null;

    while (attempt < 2 && !accepted) {
      attempt++;
      let result: SingleResult;
      try {
        result = await generateOneType({
          page,
          product,
          type,
          apiKey: input.apiKey,
          model: input.model ?? DEFAULT_GEMINI_MODEL,
          avoid: input.avoid ?? [],
          siblings: [...siblings, ...(input.instruction ? [] : [])],
          instruction:
            attempt === 1
              ? input.instruction
              : `${input.instruction ?? ""} আগের লেখায় অন্য ক্যাপশনের সাথে লাইন/CTA/শুরু মিলে গিয়েছিল। সম্পূর্ণ ভিন্ন কোণ, ভিন্ন শুরু আর ভিন্ন শেষ লাইন লেখো।`,
        });
        model = result.model;
        tokensIn += result.tokensIn;
        tokensOut += result.tokensOut;

        const hashtags = asTags(result.hashtags, page.hashtags, type);
        const validation = validateCaption({
          body: result.caption,
          type,
          product,
          recentBodies: input.avoid ?? [],
          hashtags,
        });

        const conflicts: string[] = [];
        for (const other of drafts) {
          const check = crossCheck(result.caption, other.body);
          if (check.sharedLines.length > 0) {
            conflicts.push(`${other.type} ক্যাপশনের সাথে লাইন মিলেছে`);
          }
          if (check.sameOpening) conflicts.push(`${other.type} ক্যাপশনের মতো শুরু`);
          if (check.sameCta) conflicts.push(`${other.type} ক্যাপশনের মতো CTA`);
          if (check.similarity >= 0.55) conflicts.push(`${other.type} ক্যাপশনের সাথে খুব মিল`);
        }
        if (hashtags.join(" ") === drafts[0]?.hashtags.join(" ") && drafts.length > 0) {
          conflicts.push("হ্যাশট্যাগ আগের ক্যাপশনের মতোই");
        }

        // দাম/নিষিদ্ধ দাবি ছাড়া অন্য সমস্যা হলে লেখাটা অন্তত দেখানোর যোগ্য
        const unsafe = validation.hard.some(
          (issue) => issue.includes("দাম") || issue.includes("নিষিদ্ধ") || issue.includes("খুব মিল"),
        );
        if (!unsafe && result.caption.split(/\s+/).length >= 30) {
          bestEffort = { body: result.caption, hashtags, keyword: result.keyword, poster: result.poster };
        }

        if (validation.hard.length > 0) {
          issues.push(`${type}: ${validation.hard.join(", ")}`);
        } else if (conflicts.length > 0) {
          issues.push(`${type}: ${conflicts.join(", ")}`);
        } else {
          if (validation.soft.length > 0) issues.push(`${type} (সফট): ${validation.soft.join(", ")}`);
          accepted = {
            type,
            body: result.caption,
            hashtags,
            meta: {
              keyword: result.keyword ?? commentKeyword(product),
              cta: result.caption.split("\n").filter(Boolean).slice(-1)[0],
              angle: type,
              source: "gemini",
              poster: type === "image" ? asPoster(result.poster, demoPosterCopy(product, page)) : undefined,
            },
          };
          geminiCount++;
        }
      } catch (error) {
        issues.push(`${type}: ${error instanceof Error ? error.message.slice(0, 160) : String(error)}`);
      }
    }

    if (!accepted) {
      if (bestEffort) {
        accepted = {
          type,
          body: bestEffort.body,
          hashtags: asTags(bestEffort.hashtags, page.hashtags, type),
          meta: {
            keyword: bestEffort.keyword ?? commentKeyword(product),
            cta: bestEffort.body.split("\n").filter(Boolean).slice(-1)[0],
            angle: type,
            source: "gemini",
            poster: type === "image" ? asPoster(bestEffort.poster, demoPosterCopy(product, page)) : undefined,
          },
        };
        geminiCount++;
        issues.push(`${type}: নিয়ম ভাঙলেও Gemini-র লেখা রাখা হয়েছে`);
      } else {
        accepted = demoDraft(page, product, type);
        issues.push(`${type}: ফলব্যাক ডেমো লেখা ব্যবহার হয়েছে`);
      }
    }

    accepted.hashtags = asTags(accepted.hashtags, page.hashtags, type);
    drafts.push(accepted);
    siblings.push(...acceptedLines([accepted]));
  }

  // image কল না হলে পোস্টার কপি ডেমো থেকে
  for (const draft of drafts) {
    if (!draft.meta.poster) draft.meta.poster = demoPosterCopy(product, page);
  }

  return {
    drafts,
    source: geminiCount === types.length ? "gemini" : geminiCount === 0 ? "demo" : "mixed",
    model,
    tokensIn,
    tokensOut,
    issues,
    latencyMs: Date.now() - started,
  };
}
