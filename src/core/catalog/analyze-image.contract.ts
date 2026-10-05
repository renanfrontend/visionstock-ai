import { z } from "zod";
import type { ProductDraft } from "./product-draft";

export const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

/** A video is reduced to at most this many frames before upload. */
export const MAX_FRAMES = 4;

/** ~4 MB of base64 in total keeps us under Vercel's 4.5 MB request body ceiling. */
export const MAX_TOTAL_BASE64_LENGTH = 4 * 1024 * 1024;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

const ImagePartSchema = z.object({
  data: z.string().min(1, "Imagem vazia.").regex(BASE64_PATTERN, "As imagens devem estar em base64 puro, sem o prefixo data:."),
  mediaType: z.enum(SUPPORTED_MEDIA_TYPES),
});

export type ImagePart = z.infer<typeof ImagePartSchema>;

export const AnalyzeImageRequestSchema = z
  .object({
    /** One photo, or up to MAX_FRAMES frames of the same product taken from a short video. */
    images: z.array(ImagePartSchema).min(1, "Envie pelo menos uma imagem.").max(MAX_FRAMES, `Envie no máximo ${MAX_FRAMES} imagens.`),
    source: z.enum(["photo", "video"]).default("photo"),
  })
  .refine((request) => request.images.reduce((sum, image) => sum + image.data.length, 0) <= MAX_TOTAL_BASE64_LENGTH, {
    message: "As imagens passam de 4 MB somadas. Use fotos menores.",
  });

export type AnalyzeImageRequest = z.infer<typeof AnalyzeImageRequestSchema>;

export type AnalyzeImageErrorCode = "INVALID_REQUEST" | "MISSING_API_KEY" | "MODEL_ERROR" | "INVALID_MODEL_OUTPUT";

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
