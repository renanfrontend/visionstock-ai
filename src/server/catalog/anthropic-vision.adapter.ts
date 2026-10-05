import Anthropic from "@anthropic-ai/sdk";
import type { VisionModel, VisionModelInput, VisionModelOutput } from "./vision-model.port";

/**
 * Claude 3.5 Sonnet was retired by Anthropic, so the default points to the current Sonnet.
 * Override with ANTHROPIC_MODEL to pin any other vision-capable model.
 */
export const DEFAULT_VISION_MODEL = "claude-sonnet-5-5";

interface AnthropicVisionAdapterOptions {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  maxTokens?: number;
}

export class AnthropicVisionAdapter implements VisionModel {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly maxTokens: number;

  constructor({ apiKey, model, systemPrompt, maxTokens = 1024 }: AnthropicVisionAdapterOptions) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 45_000 });
    this.model = model ?? DEFAULT_VISION_MODEL;
    this.systemPrompt = systemPrompt;
    this.maxTokens = maxTokens;
  }

  async describe({ base64, mediaType, instruction }: VisionModelInput): Promise<VisionModelOutput> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: this.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: instruction },
          ],
        },
      ],
    });

    const text = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();

    return {
      text,
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  }
}
