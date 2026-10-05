import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  AnalyzeImageRequestSchema,
  type AnalyzeImageErrorCode,
  type AnalyzeImageResponse,
} from "@/core/catalog/analyze-image.contract";
import { AnthropicVisionAdapter, DEFAULT_VISION_MODEL } from "@/server/catalog/anthropic-vision.adapter";
import { analyzeProductImage, InvalidModelOutputError } from "@/server/catalog/analyze-product-image";
import { CATALOG_SYSTEM_PROMPT } from "@/server/catalog/catalog-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(status: number, code: AnalyzeImageErrorCode, message: string) {
  return NextResponse.json<AnalyzeImageResponse>({ ok: false, error: { code, message } }, { status });
}

/**
 * Diagnoses a missing key without ever exposing its value: distinguishes
 * "not defined" from "defined but empty" and reports which environment ran.
 */
function describeMissingKey(raw: string | undefined) {
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "desconhecido";
  const state = raw === undefined ? "não está definida" : "está definida, mas vazia";
  const related = Object.keys(process.env).filter((name) => name.includes("ANTHROPIC"));
  console.error("[analyze-image] missing api key", { env, defined: raw !== undefined, related });
  return `ANTHROPIC_API_KEY ${state} no ambiente "${env}".`;
}

/** Maps provider failures to actionable messages. Never echoes credentials. */
function describeProviderError(error: InstanceType<typeof Anthropic.APIError>): { status: number; message: string } {
  const detail = error.message.toLowerCase();
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_VISION_MODEL;

  if (error.status === 401) {
    return { status: 502, message: "A ANTHROPIC_API_KEY foi recusada: chave inválida ou revogada. Gere uma nova no console da Anthropic." };
  }
  if (error.status === 403) {
    return { status: 502, message: "A chave não tem permissão para este recurso. Verifique o workspace da chave no console da Anthropic." };
  }
  if (error.status === 404 || detail.includes("model")) {
    return { status: 502, message: `O modelo "${model}" não está disponível para esta conta. Ajuste a variável ANTHROPIC_MODEL.` };
  }
  if (detail.includes("credit balance")) {
    return { status: 502, message: "A conta da Anthropic está sem créditos. Adicione saldo em Billing no console e tente de novo." };
  }
  if (error.status === 429) {
    return { status: 429, message: "Limite de requisições atingido. Aguarde alguns segundos e tente de novo." };
  }
  if (error.status === 529 || (error.status ?? 0) >= 500) {
    return { status: 503, message: "O serviço de visão está sobrecarregado no momento. Tente de novo em instantes." };
  }
  return { status: 502, message: `O serviço de visão recusou a requisição (HTTP ${error.status ?? "?"}).` };
}

export async function POST(request: Request) {
  const rawApiKey = process.env.ANTHROPIC_API_KEY;
  // Values pasted into dashboards often carry a trailing newline or spaces.
  const apiKey = rawApiKey?.trim();
  if (!apiKey) {
    return fail(500, "MISSING_API_KEY", describeMissingKey(rawApiKey));
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
      const { status, message } = describeProviderError(error);
      return fail(status, "MODEL_ERROR", message);
    }
    console.error("[analyze-image] unexpected error", error);
    return fail(500, "MODEL_ERROR", "Falha inesperada ao analisar a imagem.");
  }
}
