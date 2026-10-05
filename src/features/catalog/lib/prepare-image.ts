import type { SupportedMediaType } from "@/core/catalog/analyze-image.contract";

/** Long edge recommended by Anthropic for vision: larger images are downscaled server-side anyway. */
const MAX_EDGE_PX = 1568;
const JPEG_QUALITY = 0.86;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export interface PreparedImage {
  base64: string;
  mediaType: SupportedMediaType;
  previewUrl: string;
  fileName: string;
  width: number;
  height: number;
  /** Payload size after re-encoding, in bytes. */
  bytes: number;
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/**
 * Downscales and re-encodes in the browser so the upload stays far below
 * serverless body limits and the model receives a predictable resolution.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new ImageValidationError("Esse arquivo não é uma imagem. Use JPG, PNG, WEBP ou GIF.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageValidationError("A imagem passa de 20 MB. Exporte uma versão menor e tente de novo.");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImageValidationError("Não foi possível ler essa imagem. Verifique se o arquivo não está corrompido.");
  });

  const ratio = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageValidationError("Seu navegador não suporta o processamento da imagem.");

  // Transparent PNGs become white-background JPEGs, the e-commerce convention.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);

  return {
    base64,
    mediaType: "image/jpeg",
    previewUrl: URL.createObjectURL(file),
    fileName: file.name,
    width,
    height,
    bytes: Math.floor((base64.length * 3) / 4),
  };
}
