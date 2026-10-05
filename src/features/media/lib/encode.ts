import type { ImagePart } from "@/core/catalog/analyze-image.contract";

/** Long edge sent to the vision model (single photo). Larger images are downscaled server-side anyway. */
export const PHOTO_MAX_EDGE = 1568;
/** Video frames are smaller: four of them must fit comfortably in one request. */
export const FRAME_MAX_EDGE = 1024;
/** Cover persisted in browser storage with the product. */
export const COVER_MAX_EDGE = 480;

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export interface Encoded {
  dataUrl: string;
  part: ImagePart;
  width: number;
  height: number;
}

/**
 * Draws any image-like source onto a white canvas (transparent PNGs become e-commerce
 * friendly JPEGs) and re-encodes it within `maxEdge`.
 */
export function encodeJpeg(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, maxEdge: number, quality = 0.86): Encoded {
  const ratio = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * ratio));
  const height = Math.max(1, Math.round(sourceHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new MediaValidationError("Seu navegador não conseguiu processar a imagem.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, part: { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg" }, width, height };
}

/**
 * Sharpness score: variance of a Laplacian over a 96px grayscale downscale.
 * Higher means more edges in focus; used to pick a video's cover frame.
 */
export function sharpness(source: CanvasImageSource, sourceWidth: number, sourceHeight: number): number {
  const size = 96;
  const ratio = size / Math.max(sourceWidth, sourceHeight);
  const width = Math.max(3, Math.round(sourceWidth * ratio));
  const height = Math.max(3, Math.round(sourceHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return 0;
  context.drawImage(source, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i += 1) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const laplacian = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count += 1;
    }
  }
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

export const base64Bytes = (part: ImagePart) => Math.floor((part.data.length * 3) / 4);
