import { AnthropicVisionAdapter } from "./anthropic-vision.adapter";
import { CATALOG_SYSTEM_PROMPT } from "./catalog-prompt";
import { GeminiVisionAdapter } from "./gemini-vision.adapter";
import type { VisionModel } from "./vision-model.port";

export const VISION_PROVIDERS = ["gemini", "anthropic"] as const;
export type VisionProvider = (typeof VISION_PROVIDERS)[number];

export class VisionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionConfigError";
  }
}

type Env = Readonly<Record<string, string | undefined>>;

/** Dashboard-pasted values frequently carry stray whitespace or newlines. */
const read = (env: Env, name: string) => env[name]?.trim() || undefined;

function resolveProvider(env: Env): VisionProvider {
  const explicit = read(env, "VISION_PROVIDER")?.toLowerCase();
  if (explicit) {
    if ((VISION_PROVIDERS as readonly string[]).includes(explicit)) return explicit as VisionProvider;
    throw new VisionConfigError(`VISION_PROVIDER="${explicit}" é inválido. Use "gemini" ou "anthropic".`);
  }
  if (read(env, "GEMINI_API_KEY")) return "gemini";
  if (read(env, "ANTHROPIC_API_KEY")) return "anthropic";
  throw new VisionConfigError(
    `Nenhum provedor de visão configurado no ambiente "${env.VERCEL_ENV ?? env.NODE_ENV ?? "desconhecido"}". ` +
      "Defina GEMINI_API_KEY ou ANTHROPIC_API_KEY.",
  );
}

/**
 * Composition root for the vision port. Explicit VISION_PROVIDER wins;
 * otherwise Gemini is preferred when its key exists (free tier), then Anthropic.
 */
export function createVisionModel(env: Env = process.env): VisionModel {
  const provider = resolveProvider(env);

  if (provider === "gemini") {
    const apiKey = read(env, "GEMINI_API_KEY");
    if (!apiKey) throw new VisionConfigError("VISION_PROVIDER é gemini, mas GEMINI_API_KEY não está definida.");
    return new GeminiVisionAdapter({ apiKey, model: read(env, "GEMINI_MODEL"), systemPrompt: CATALOG_SYSTEM_PROMPT });
  }

  const apiKey = read(env, "ANTHROPIC_API_KEY");
  if (!apiKey) throw new VisionConfigError("VISION_PROVIDER é anthropic, mas ANTHROPIC_API_KEY não está definida.");
  return new AnthropicVisionAdapter({
    apiKey,
    workspaceId: read(env, "ANTHROPIC_WORKSPACE_ID"),
    model: read(env, "ANTHROPIC_MODEL"),
    systemPrompt: CATALOG_SYSTEM_PROMPT,
  });
}
