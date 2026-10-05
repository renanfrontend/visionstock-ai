import {
  VisionProviderError,
  type VisionModel,
  type VisionModelInput,
  type VisionModelOutput,
} from "./vision-model.port";

/** Stable Flash model with image input, available on the Gemini API free tier. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Free-tier capacity varies per model. When the preferred model is overloaded,
 * the adapter walks this chain of stable, image-capable Flash models.
 */
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
/** Total budget stays under the route's maxDuration (60 s). */
const TOTAL_BUDGET_MS = 52_000;
const ATTEMPT_TIMEOUT_MS = 25_000;
const RETRIES_PER_MODEL = 1;
const BACKOFF_MS = 900;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Failures worth retrying or routing to another model. */
const isTransient = (error: VisionProviderError) => error.kind === "unavailable" || error.kind === "model";

interface GeminiVisionAdapterOptions {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  /** Generous ceiling: Flash models may spend part of it on internal reasoning. */
  maxOutputTokens?: number;
}

/** Subset of the generateContent response this adapter relies on. */
interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
  promptFeedback?: { blockReason?: string };
}

interface GeminiErrorBody {
  error?: { code?: number; message?: string; status?: string };
}

function toProviderError(httpStatus: number, body: GeminiErrorBody | null, model: string): VisionProviderError {
  const detail = body?.error?.message?.slice(0, 300);
  const status = body?.error?.status ?? "";
  const text = (detail ?? "").toLowerCase();

  if (text.includes("api key not valid") || status === "UNAUTHENTICATED" || httpStatus === 401) {
    return new VisionProviderError("auth", "A GEMINI_API_KEY foi recusada: chave inválida. Gere uma nova no Google AI Studio.", 502, detail);
  }
  if (status === "PERMISSION_DENIED" || httpStatus === 403) {
    return new VisionProviderError(
      "auth",
      "A chave do Gemini não tem permissão. Confirme que a Generative Language API está ativa no projeto da chave.",
      502,
      detail,
    );
  }
  if (status === "NOT_FOUND" || httpStatus === 404) {
    return new VisionProviderError("model", `O modelo "${model}" não está disponível. Ajuste a variável GEMINI_MODEL.`, 502, detail);
  }
  if (status === "RESOURCE_EXHAUSTED" || httpStatus === 429) {
    return new VisionProviderError(
      "rate_limit",
      "A cota gratuita do Gemini foi atingida. Aguarde um minuto ou tente de novo amanhã.",
      429,
      detail,
    );
  }
  if (httpStatus >= 500) {
    return new VisionProviderError(
      "unavailable",
      `O Gemini está sobrecarregado no momento (HTTP ${httpStatus}). Tente de novo em instantes.`,
      503,
      detail,
    );
  }
  return new VisionProviderError(
    "unknown",
    `O Gemini recusou a requisição (HTTP ${httpStatus})${detail ? `: ${detail}` : "."}`,
    502,
    detail,
  );
}

/** Thin REST adapter (no SDK) with bounded retries and a model fallback chain. */
export class GeminiVisionAdapter implements VisionModel {
  readonly provider = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly maxOutputTokens: number;

  constructor({ apiKey, model, systemPrompt, maxOutputTokens = 4096 }: GeminiVisionAdapterOptions) {
    this.apiKey = apiKey;
    this.model = model || DEFAULT_GEMINI_MODEL;
    this.systemPrompt = systemPrompt;
    this.maxOutputTokens = maxOutputTokens;
  }

  async describe(input: VisionModelInput): Promise<VisionModelOutput> {
    const deadline = Date.now() + TOTAL_BUDGET_MS;
    const chain = [this.model, ...FALLBACK_MODELS.filter((model) => model !== this.model)];
    let lastError: VisionProviderError | undefined;

    for (const model of chain) {
      for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt += 1) {
        const remaining = deadline - Date.now();
        if (remaining < 3_000) break;
        try {
          return await this.request(model, input, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
        } catch (error) {
          if (!(error instanceof VisionProviderError) || !isTransient(error)) throw error;
          lastError = error;
          console.warn("[gemini] transient failure", { model, attempt, kind: error.kind, detail: error.providerDetail });
          // A missing model will not appear on retry: move straight to the next one.
          if (error.kind === "model") break;
          if (attempt < RETRIES_PER_MODEL) await sleep(BACKOFF_MS * (attempt + 1));
        }
      }
    }

    if (!lastError) throw new VisionProviderError("unavailable", "O Gemini não respondeu a tempo. Tente de novo.", 504);
    // Every model in the chain failed: surface the provider's own words to make diagnosis possible.
    throw new VisionProviderError(
      lastError.kind,
      `${lastError.message} Modelos tentados: ${chain.join(", ")}.${lastError.providerDetail ? ` Detalhe: ${lastError.providerDetail}` : ""}`,
      lastError.httpStatus,
      lastError.providerDetail,
    );
  }

  private async request(
    model: string,
    { base64, mediaType, instruction }: VisionModelInput,
    timeoutMs: number,
  ): Promise<VisionModelOutput> {
    const response = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: this.systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: mediaType, data: base64 } }, { text: instruction }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: this.maxOutputTokens,
          temperature: 0.4,
        },
      }),
    }).catch((error: unknown) => {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      throw new VisionProviderError(
        "unavailable",
        timedOut ? "O Gemini demorou demais para responder. Tente de novo." : "Não foi possível conectar ao Gemini.",
        504,
      );
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as GeminiErrorBody | null;
      throw toProviderError(response.status, body, model);
    }

    const payload = (await response.json()) as GenerateContentResponse;

    if (payload.promptFeedback?.blockReason) {
      throw new VisionProviderError(
        "unknown",
        "O Gemini bloqueou a análise desta imagem por política de conteúdo. Tente outra foto.",
        422,
        payload.promptFeedback.blockReason,
      );
    }

    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    return {
      text,
      model: payload.modelVersion ?? model,
      inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
