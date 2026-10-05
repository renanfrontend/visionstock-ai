import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  AnalyzeImageRequestSchema,
  type AnalyzeImageErrorCode,
  type AnalyzeImageResponse,
} from "@/core/catalog/analyze-image.contract";
import { AnthropicVisionAdapter } from "@/server/catalog/anthropic-vision.adapter";
import { analyzeProductImage, InvalidModelOutputError } from "@/server/catalog/analyze-product-image";
import { CATALOG_SYSTEM_PROMPT } from "@/server/catalog/catalog-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(status: number, code: AnalyzeImageErrorCode, message: string) {
  return NextResponse.json<AnalyzeImageResponse>({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fail(500, "MISSING_API_KEY", "ANTHROPIC_API_KEY não está configurada no servidor.");
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
    const visionModel = new AnthropicVisionAdapter({
      apiKey,
      model: process.env.ANTHROPIC_MODEL,
      systemPrompt: CATALOG_SYSTEM_PROMPT,
    });
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
      console.error("[analyze-image] invalid model output", { raw: error.raw.slice(0, 500) });
      return fail(502, "INVALID_MODEL_OUTPUT", error.message);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[analyze-image] anthropic error", { status: error.status, message: error.message });
      const status = error.status === 429 ? 429 : 502;
      const message =
        error.status === 429
          ? "Limite de requisições atingido. Aguarde alguns segundos e tente de novo."
          : "O serviço de visão não respondeu como esperado. Tente novamente.";
      return fail(status, "MODEL_ERROR", message);
    }
    console.error("[analyze-image] unexpected error", error);
    return fail(500, "MODEL_ERROR", "Falha inesperada ao analisar a imagem.");
  }
}
