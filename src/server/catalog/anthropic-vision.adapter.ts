import Anthropic from "@anthropic-ai/sdk";
import {
  VisionProviderError,
  type VisionModel,
  type VisionModelInput,
  type VisionModelOutput,
} from "./vision-model.port";

/**
 * Claude 3.5 Sonnet was retired by Anthropic, so the default points to the current Sonnet.
 * Override with ANTHROPIC_MODEL to pin any other vision-capable model.
 */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";

interface AnthropicVisionAdapterOptions {
  apiKey: string;
  /** Required by the API when the key is not scoped to a workspace. */
  workspaceId?: string;
  model?: string;
  systemPrompt: string;
  maxTokens?: number;
}

/** Reads `error.message` from the JSON body ({ type, error: { type, message } }). */
function readBodyMessage(error: InstanceType<typeof Anthropic.APIError>): string | undefined {
  const body: unknown = error.error;
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  const inner: unknown = body.error;
  if (typeof inner !== "object" || inner === null || !("message" in inner)) return undefined;
  return typeof inner.message === "string" ? inner.message.slice(0, 300) : undefined;
}

function toProviderError(error: InstanceType<typeof Anthropic.APIError>, model: string): VisionProviderError {
  const detail = readBodyMessage(error);
  const text = (detail ?? error.message).toLowerCase();
  const status = error.status ?? 0;

  if (status === 401) {
    return new VisionProviderError("auth", "A ANTHROPIC_API_KEY foi recusada: chave inválida ou revogada.", 502, detail);
  }
  if (text.includes("anthropic-workspace-id")) {
    return new VisionProviderError(
      "config",
      "A chave da Anthropic não está vinculada a um workspace. Defina ANTHROPIC_WORKSPACE_ID ou gere a chave dentro de um workspace.",
      502,
      detail,
    );
  }
  if (text.includes("credit balance")) {
    return new VisionProviderError("billing", "A conta da Anthropic está sem créditos. Adicione saldo em Billing no console.", 502, detail);
  }
  if (status === 403) {
    return new VisionProviderError("auth", "A chave da Anthropic não tem permissão para este recurso.", 502, detail);
  }
  if (status === 404) {
    return new VisionProviderError("model", `O modelo "${model}" não está disponível para esta conta. Ajuste ANTHROPIC_MODEL.`, 502, detail);
  }
  if (status === 429) {
    return new VisionProviderError("rate_limit", "Limite de requisições da Anthropic atingido. Aguarde alguns segundos.", 429, detail);
  }
  if (status >= 500) {
    return new VisionProviderError("unavailable", "O serviço da Anthropic está sobrecarregado. Tente de novo em instantes.", 503, detail);
  }
  return new VisionProviderError(
    "unknown",
    `A Anthropic recusou a requisição (HTTP ${status || "?"})${detail ? `: ${detail}` : "."}`,
    502,
    detail,
  );
}

export class AnthropicVisionAdapter implements VisionModel {
  readonly provider = "anthropic";
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly maxTokens: number;

  constructor({ apiKey, workspaceId, model, systemPrompt, maxTokens = 1024 }: AnthropicVisionAdapterOptions) {
    this.client = new Anthropic({
      apiKey,
      maxRetries: 2,
      timeout: 45_000,
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });
    this.model = model || DEFAULT_ANTHROPIC_MODEL;
    this.systemPrompt = systemPrompt;
    this.maxTokens = maxTokens;
  }

  async describe({ images, instruction }: VisionModelInput): Promise<VisionModelOutput> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              ...images.map((image) => ({
                type: "image" as const,
                source: { type: "base64" as const, media_type: image.mediaType, data: image.data },
              })),
              { type: "text", text: instruction },
            ],
          },
        ],
      });

      return {
        text: message.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("")
          .trim(),
        model: message.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) throw toProviderError(error, this.model);
      throw error;
    }
  }
}
