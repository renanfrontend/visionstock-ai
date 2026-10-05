import type { AnalyzeImageRequest } from "@/core/catalog/analyze-image.contract";
import { ProductDraftSchema, SEO_TAG_COUNT, type ProductDraft } from "@/core/catalog/product-draft";
import { CATALOG_USER_INSTRUCTION } from "./catalog-prompt";
import type { VisionModel } from "./vision-model.port";

export class InvalidModelOutputError extends Error {
  constructor(message: string, readonly raw: string) {
    super(message);
    this.name = "InvalidModelOutputError";
  }
}

export interface AnalyzeProductImageResult {
  draft: ProductDraft;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Tolerates code fences or stray prose around the JSON object. */
function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new InvalidModelOutputError("O modelo não retornou um objeto JSON.", text);
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new InvalidModelOutputError("O JSON retornado pelo modelo está malformado.", text);
  }
}

function normalize(draft: ProductDraft): ProductDraft {
  const unique = (values: readonly string[]) => [...new Set(values.map((v) => v.trim()))].filter(Boolean);
  return {
    ...draft,
    colors: unique(draft.colors),
    seoTags: unique(draft.seoTags.map((tag) => tag.toLowerCase())).slice(0, SEO_TAG_COUNT),
  };
}

/** Use case: image in, validated product draft out. Provider-agnostic. */
export async function analyzeProductImage(
  visionModel: VisionModel,
  request: AnalyzeImageRequest,
): Promise<AnalyzeProductImageResult> {
  const output = await visionModel.describe({
    base64: request.image,
    mediaType: request.mediaType,
    instruction: CATALOG_USER_INSTRUCTION,
  });

  const parsed = ProductDraftSchema.safeParse(extractJsonObject(output.text));
  if (!parsed.success) {
    throw new InvalidModelOutputError("O JSON do modelo não segue o contrato esperado.", output.text);
  }

  return {
    draft: normalize(parsed.data),
    model: output.model,
    inputTokens: output.inputTokens,
    outputTokens: output.outputTokens,
  };
}
