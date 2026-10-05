import { MAX_FRAMES, type ImagePart } from "@/core/catalog/analyze-image.contract";
import { base64Bytes, COVER_MAX_EDGE, encodeJpeg, FRAME_MAX_EDGE, MediaValidationError, PHOTO_MAX_EDGE, sharpness } from "./encode";

export const MAX_VIDEO_SECONDS = 10;
/** Small tolerance: phones often report 10.03 s for a 10 s clip. */
const DURATION_TOLERANCE = 0.4;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export interface PreparedMedia {
  kind: "photo" | "video";
  /** Payload for the vision model: 1 photo or up to MAX_FRAMES video frames. */
  frames: ImagePart[];
  /** Small previews of each frame, for the filmstrip. */
  previews: string[];
  /** Cover persisted with the product (photo, or the sharpest video frame). */
  cover: string;
  coverIndex: number;
  label: string;
  width: number;
  height: number;
  /** Total upload size of `frames`, in bytes. */
  bytes: number;
  durationSec?: number;
  /** Object URL for playback in this session only; caller revokes it. */
  playbackUrl?: string;
}

function fromImageSource(source: CanvasImageSource, width: number, height: number, label: string): PreparedMedia {
  const photo = encodeJpeg(source, width, height, PHOTO_MAX_EDGE);
  const cover = encodeJpeg(source, width, height, COVER_MAX_EDGE, 0.8);
  return {
    kind: "photo",
    frames: [photo.part],
    previews: [cover.dataUrl],
    cover: cover.dataUrl,
    coverIndex: 0,
    label,
    width: photo.width,
    height: photo.height,
    bytes: base64Bytes(photo.part),
  };
}

export async function prepareImageFile(file: File | Blob, label: string): Promise<PreparedMedia> {
  if (file.size > MAX_IMAGE_BYTES) throw new MediaValidationError("A imagem passa de 20 MB. Exporte uma versão menor e tente de novo.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new MediaValidationError("Não foi possível ler essa imagem. Verifique se o arquivo não está corrompido.");
  });
  try {
    return fromImageSource(bitmap, bitmap.width, bitmap.height, label);
  } finally {
    bitmap.close();
  }
}

/** Snapshot of a live <video> (camera preview). */
export function prepareVideoSnapshot(video: HTMLVideoElement, label: string): PreparedMedia {
  if (!video.videoWidth) throw new MediaValidationError("A câmera ainda não enviou imagem. Aguarde um instante.");
  return fromImageSource(video, video.videoWidth, video.videoHeight, label);
}

function once<K extends keyof HTMLMediaElementEventMap>(video: HTMLVideoElement, event: K, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new MediaValidationError("O vídeo demorou demais para carregar. Tente outro arquivo."));
    }, timeoutMs);
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new MediaValidationError("Formato de vídeo não suportado por este navegador. Use MP4 ou WebM."));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener(event, onEvent);
      video.removeEventListener("error", onError);
    };
    video.addEventListener(event, onEvent, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

/**
 * MediaRecorder WebM blobs report `duration = Infinity` until the browser scans
 * the whole file; seeking far forward forces it to compute the real value.
 */
async function resolveDuration(video: HTMLVideoElement, fallback?: number): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  video.currentTime = Number.MAX_SAFE_INTEGER;
  await once(video, "durationchange", 4000).catch(() => undefined);
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : fallback ?? 0;
  video.currentTime = 0;
  return duration;
}

async function seek(video: HTMLVideoElement, time: number): Promise<void> {
  const done = once(video, "seeked");
  video.currentTime = time;
  await done;
}

export async function prepareVideo(blob: Blob, label: string, knownDurationSec?: number): Promise<PreparedMedia> {
  if (blob.size > MAX_VIDEO_BYTES) throw new MediaValidationError("O vídeo passa de 80 MB. Grave um clipe mais curto ou com resolução menor.");

  const playbackUrl = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = playbackUrl;

  try {
    await once(video, "loadedmetadata");
    const duration = await resolveDuration(video, knownDurationSec);
    if (!duration) throw new MediaValidationError("Não foi possível ler a duração do vídeo.");
    if (duration > MAX_VIDEO_SECONDS + DURATION_TOLERANCE) {
      throw new MediaValidationError(`O vídeo tem ${duration.toFixed(1).replace(".", ",")} s; o limite é ${MAX_VIDEO_SECONDS} s. Corte o clipe e envie de novo.`);
    }
    if (!video.videoWidth) await once(video, "loadeddata");

    // Evenly spaced frames, skipping the very first and last instants (often blurred by hand motion).
    const times = Array.from({ length: MAX_FRAMES }, (_, i) => duration * (0.12 + (0.76 * i) / (MAX_FRAMES - 1)));
    const frames: ImagePart[] = [];
    const previews: string[] = [];
    let best = { index: 0, score: -1 };
    let width = 0;
    let height = 0;

    for (const [index, time] of times.entries()) {
      await seek(video, Math.min(time, Math.max(0, duration - 0.05)));
      const frame = encodeJpeg(video, video.videoWidth, video.videoHeight, FRAME_MAX_EDGE, 0.82);
      const preview = encodeJpeg(video, video.videoWidth, video.videoHeight, COVER_MAX_EDGE, 0.8);
      const score = sharpness(video, video.videoWidth, video.videoHeight);
      if (score > best.score) best = { index, score };
      frames.push(frame.part);
      previews.push(preview.dataUrl);
      width = frame.width;
      height = frame.height;
    }

    return {
      kind: "video",
      frames,
      previews,
      cover: previews[best.index] ?? previews[0] ?? "",
      coverIndex: best.index,
      label,
      width,
      height,
      bytes: frames.reduce((sum, part) => sum + base64Bytes(part), 0),
      durationSec: duration,
      playbackUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(playbackUrl);
    throw error;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

/** Entry point for files coming from the picker, drag and drop or the clipboard. */
export async function prepareMediaFile(file: File): Promise<PreparedMedia> {
  if (file.type.startsWith("image/")) return prepareImageFile(file, file.name);
  if (file.type.startsWith("video/")) return prepareVideo(file, file.name);
  throw new MediaValidationError("Formato não suportado. Envie uma foto (JPG, PNG, WEBP) ou um vídeo de até 10 s.");
}
