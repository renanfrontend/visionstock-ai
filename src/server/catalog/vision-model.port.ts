import type { SupportedMediaType } from "@/core/catalog/analyze-image.contract";

export interface VisionModelInput {
  base64: string;
  mediaType: SupportedMediaType;
  instruction: string;
}

export interface VisionModelOutput {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Port: any multimodal provider capable of answering a text instruction about one image. */
export interface VisionModel {
  readonly provider: string;
  describe(input: VisionModelInput): Promise<VisionModelOutput>;
}

export type VisionProviderErrorKind =
  | "auth"
  | "config"
  | "billing"
  | "model"
  | "rate_limit"
  | "unavailable"
  | "unknown";

/**
 * Provider-agnostic failure. Adapters translate their SDK/HTTP errors into this,
 * so the delivery layer never imports a vendor SDK to handle errors.
 * `message` is user-facing (pt-BR) and must never contain credentials.
 */
export class VisionProviderError extends Error {
  constructor(
    readonly kind: VisionProviderErrorKind,
    message: string,
    readonly httpStatus: number,
    readonly providerDetail?: string,
  ) {
    super(message);
    this.name = "VisionProviderError";
  }
}
