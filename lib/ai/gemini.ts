export interface GeminiRequest {
  apiKey: string;
  model?: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  temperature?: number;
  timeoutMs?: number;
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

  const generationConfig: Record<string, unknown> = {
    temperature: request.temperature ?? 0.85,
    responseMimeType: "application/json",
    responseSchema: request.schema,
    maxOutputTokens: 2800,
  };
  // 2.5-এর "thinking" ডিফল্ট চালু — সেটাই maxOutputTokens খেয়ে JSON কেটে দেয়। ক্যাপশনে দরকার নেই।
  if (model.startsWith("gemini-2.5")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
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
