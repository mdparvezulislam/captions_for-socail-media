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

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "GeminiError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; status?: string };
}

export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const model = request.model ?? "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const started = Date.now();

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
        generationConfig: {
          temperature: request.temperature ?? 0.9,
          responseMimeType: "application/json",
          responseSchema: request.schema,
          maxOutputTokens: 1400,
        },
      }),
      signal: AbortSignal.timeout(request.timeoutMs ?? 45_000),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new GeminiError(timedOut ? "Gemini অনুরোধ সময় শেষ (৪৫s)" : `Gemini অনুরোধ ব্যর্থ: ${String(error)}`, {
      retryable: true,
    });
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 400);
    throw new GeminiError(`Gemini HTTP ${response.status}: ${detail}`, {
      status: response.status,
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  const payload = (await response.json()) as GeminiPayload;
  if (!payload.candidates || payload.candidates.length === 0) {
    throw new GeminiError("Gemini কোনো আউটপুট দেয়নি (সম্ভবত safety block)", { retryable: false });
  }

  const candidate = payload.candidates[0];
  const text = (candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError(`Gemini খালি উত্তর দিয়েছে (finishReason: ${candidate.finishReason ?? "unknown"})`, {
      retryable: false,
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
