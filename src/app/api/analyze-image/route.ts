import { NextResponse } from "next/server";
import {
  AnalyzeImageRequestSchema,
  type AnalyzeImageErrorCode,
  type AnalyzeImageResponse,
} from "@/core/catalog/analyze-image.contract";
import { analyzeProductImage, InvalidModelOutputError } from "@/server/catalog/analyze-product-image";
import { createVisionModel, VisionConfigError } from "@/server/catalog/create-vision-model";
import { VisionProviderError } from "@/server/catalog/vision-model.port";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(status: number, code: AnalyzeImageErrorCode, message: string) {
  return NextResponse.json<AnalyzeImageResponse>({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let visionModel;
  try {
    visionModel = createVisionModel();
  } catch (error) {
    if (error instanceof VisionConfigError) {
      console.error("[analyze-image] config error", { message: error.message });
      return fail(500, "MISSING_API_KEY", error.message);
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_REQUEST", "O corpo da requisição precisa ser JSON.");
  }

  const parsed = AnalyzeImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "INVALID_REQUEST", parsed.error.issues[0]?.message ?? "Payload inválido.");
  }

  const startedAt = performance.now();

  try {
    const result = await analyzeProductImage(visionModel, parsed.data);
    return NextResponse.json<AnalyzeImageResponse>({
      ok: true,
      data: result.draft,
      meta: {
        model: result.model,
        latencyMs: Math.round(performance.now() - startedAt),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  } catch (error) {
    if (error instanceof InvalidModelOutputError) {
      console.error("[analyze-image] invalid model output", { provider: visionModel.provider, raw: error.raw.slice(0, 500) });
      return fail(502, "INVALID_MODEL_OUTPUT", error.message);
    }
    if (error instanceof VisionProviderError) {
      console.error("[analyze-image] provider error", {
        provider: visionModel.provider,
        kind: error.kind,
        detail: error.providerDetail,
      });
      return fail(error.httpStatus, "MODEL_ERROR", error.message);
    }
    console.error("[analyze-image] unexpected error", error);
    return fail(500, "MODEL_ERROR", "Falha inesperada ao analisar a imagem.");
  }
}
