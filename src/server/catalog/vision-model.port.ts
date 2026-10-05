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
  describe(input: VisionModelInput): Promise<VisionModelOutput>;
}
