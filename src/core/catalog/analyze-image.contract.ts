import { z } from "zod";
import type { ProductDraft } from "./product-draft";

export const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

/** ~4 MB of base64 keeps us under Vercel's 4.5 MB request body ceiling. */
export const MAX_BASE64_LENGTH = 4 * 1024 * 1024;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const AnalyzeImageRequestSchema = z.object({
  image: z
    .string()
    .min(1, "Envie a imagem em base64.")
    .max(MAX_BASE64_LENGTH, "Imagem acima de 4 MB após a codificação.")
    .regex(BASE64_PATTERN, "O campo image deve conter base64 puro, sem o prefixo data:."),
  mediaType: z.enum(SUPPORTED_MEDIA_TYPES),
});

export type AnalyzeImageRequest = z.infer<typeof AnalyzeImageRequestSchema>;

export type AnalyzeImageErrorCode =
  | "INVALID_REQUEST"
  | "MISSING_API_KEY"
  | "MODEL_ERROR"
  | "INVALID_MODEL_OUTPUT";

export type AnalyzeImageResponse =
  | {
      ok: true;
      data: ProductDraft;
      meta: { model: string; latencyMs: number; inputTokens: number; outputTokens: number };
    }
  | {
      ok: false;
      error: { code: AnalyzeImageErrorCode; message: string };
    };
