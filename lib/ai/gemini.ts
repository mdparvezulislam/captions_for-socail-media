export interface GeminiRequest {
  apiKey: string;
  model?: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  temperature?: number;
  timeoutMs?: number;
  /** >0 হলে মডেল আগে ভেবে নেবে (গবেষণা-ধাঁচের লেখার জন্য) */
  thinkingBudget?: number;
}

export interface GeminiResponse {
  json: unknown;
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

export class GeminiError extends Error {
  status?: number;
  retryable: boolean;
  quotaExhausted: boolean;
  notFound: boolean;

  constructor(
    message: string,
    options: { status?: number; retryable?: boolean; quotaExhausted?: boolean; notFound?: boolean } = {},
  ) {
    super(message);
    this.name = "GeminiError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.quotaExhausted = options.quotaExhausted ?? false;
    this.notFound = options.notFound ?? false;
  }
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; status?: string };
}

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const model = request.model ?? DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const started = Date.now();

  const thinkingBudget = Math.max(0, request.thinkingBudget ?? 0);
  const generationConfig: Record<string, unknown> = {
    temperature: request.temperature ?? 0.95,
    responseMimeType: "application/json",
    responseSchema: request.schema,
    maxOutputTokens: thinkingBudget > 0 ? 4200 : 2400,
  };
  // thinking বন্ধ রাখলে JSON কাটে না; চালু রাখলে লেখা ভালো হয় কিন্তু টোকেন খায়
  if (model.startsWith("gemini-2.5") || model.startsWith("gemini-3")) {
    generationConfig.thinkingConfig = { thinkingBudget };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": request.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: request.user }] }],
        systemInstruction: { parts: [{ text: request.system }] },
        generationConfig,
      }),
      signal: AbortSignal.timeout(request.timeoutMs ?? 16_000),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new GeminiError(timedOut ? "Gemini অনুরোধ সময় শেষ (১৬s)" : `Gemini অনুরোধ ব্যর্থ: ${String(error)}`, {
      retryable: true,
    });
  }

  if (response.status === 400) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    if (/thinking|thinkingConfig|thinkingBudget/i.test(detail) && thinkingBudget > 0) {
      // এই মডেল thinking বাজেট নেয় না — বন্ধ করে আবার চেষ্টা
      return callGemini({ ...request, thinkingBudget: 0 });
    }
    throw new GeminiError(`Gemini HTTP 400: ${detail}`, { status: 400, retryable: false });
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    const isDailyQuota =
      response.status === 429 &&
      /PerDay|GenerateRequestsPerDay|exceeded your current quota/i.test(detail);
    const isNotFound = response.status === 404;
    throw new GeminiError(`Gemini HTTP ${response.status}: ${detail}`, {
      status: response.status,
      retryable: response.status === 429 || response.status >= 500 || isNotFound,
      quotaExhausted: isDailyQuota,
      notFound: isNotFound,
    });
  }

  const payload = (await response.json()) as GeminiPayload;
  if (!payload.candidates || payload.candidates.length === 0) {
    throw new GeminiError("Gemini কোনো আউটপুট দেয়নি (সম্ভবত safety block)", { retryable: false });
  }

  const candidate = payload.candidates[0];
  const rawText = (candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  if (!text) {
    throw new GeminiError(`Gemini খালি উত্তর দিয়েছে (finishReason: ${candidate.finishReason ?? "unknown"})`, {
      retryable: true,
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GeminiError(`Gemini JSON পার্স করা যায়নি: ${text.slice(0, 200)}`, { retryable: true });
  }

  return {
    json,
    text,
    model,
    tokensIn: payload.usageMetadata?.promptTokenCount ?? 0,
    tokensOut: payload.usageMetadata?.candidatesTokenCount ?? 0,
    latencyMs: Date.now() - started,
  };
}
