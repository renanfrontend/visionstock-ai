"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Film, ImagePlus, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CameraDialog } from "./CameraDialog";
import { MediaValidationError } from "./lib/encode";
import { MAX_VIDEO_SECONDS, prepareMediaFile, type PreparedMedia } from "./lib/prepare-media";

export type AnalysisPhase = "idle" | "processing" | "success" | "error";

interface MediaCaptureProps {
  media: PreparedMedia | null;
  phase: AnalysisPhase;
  onMedia: (media: PreparedMedia) => void;
  onClear: () => void;
  onAnalyze: () => void;
  onError: (message: string) => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

function formatBytes(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Corner brackets of a viewfinder; they light up while dragging or scanning. */
function Viewfinder({ active, tone = "ice" }: { active: boolean; tone?: "ice" | "iris" }) {
  const color = tone === "iris" ? "border-iris" : "border-ice";
  const base = `pointer-events-none absolute size-7 transition-all duration-300 ${color} ${active ? "opacity-100" : "opacity-40"}`;
  // Corners pull inward when active, like a camera locking focus.
  const pos = active
    ? ["left-2 top-2", "right-2 top-2", "bottom-2 left-2", "right-2 bottom-2"]
    : ["left-3 top-3", "right-3 top-3", "bottom-3 left-3", "right-3 bottom-3"];
  return (
    <>
      <span className={`${base} ${pos[0]} rounded-tl-lg border-t-2 border-l-2`} />
      <span className={`${base} ${pos[1]} rounded-tr-lg border-t-2 border-r-2`} />
      <span className={`${base} ${pos[2]} rounded-bl-lg border-b-2 border-l-2`} />
      <span className={`${base} ${pos[3]} rounded-br-lg border-r-2 border-b-2`} />
    </>
  );
}

export function MediaCapture({ media, phase, onMedia, onClear, onAnalyze, onError }: MediaCaptureProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeFrame, setActiveFrame] = useState(media?.coverIndex ?? 0);
  const [frameSource, setFrameSource] = useState(media);
  const processing = phase === "processing";

  // New media: start on its cover frame.
  if (media !== frameSource) {
    setFrameSource(media);
    setActiveFrame(media?.coverIndex ?? 0);
  }

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setPreparing(true);
      try {
        onMedia(await prepareMediaFile(file));
      } catch (error) {
        onError(error instanceof MediaValidationError ? error.message : "Não foi possível preparar o arquivo.");
      } finally {
        setPreparing(false);
      }
    },
    [onMedia, onError],
  );

  // Paste an image from the clipboard anywhere outside form fields.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input, textarea")) return;
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
      if (file) void handleFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!processing) void handleFile(event.dataTransfer.files[0]);
  };

  const pickFile = () => inputRef.current?.click();

  return (
    <section aria-label="Foto ou vídeo do produto" className="glass relative overflow-hidden rounded-2xl">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <AnimatePresence mode="popLayout" initial={false}>
        {media ? (
          <motion.div key={media.cover} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-void/60">
              {media.kind === "video" && media.playbackUrl && !processing ? (
                <video src={media.playbackUrl} autoPlay loop muted playsInline className="size-full object-contain" aria-label={`Vídeo ${media.label}`} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
                <img src={media.previews[activeFrame] ?? media.cover} alt={`Prévia de ${media.label}`} className="size-full object-contain p-3" />
              )}
              {processing ? (
                <div className="pointer-events-none absolute inset-3" aria-hidden="true">
                  <div className="absolute inset-0 bg-iris/5" />
                  <div className="h-full animate-scan">
                    <div className="h-0.5 w-full bg-iris shadow-[0_0_18px_4px_var(--color-iris)]" />
                  </div>
                </div>
              ) : null}
              <Viewfinder active={processing} tone="iris" />
              <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] text-white/85">
                {media.kind === "video" ? `Vídeo de ${media.durationSec?.toFixed(1).replace(".", ",")} s` : "Foto"}
              </span>
            </div>

            {media.kind === "video" ? (
              <div className="border-t border-line px-4 pt-3">
                <p className="mb-2 text-xs text-ink-muted">{media.frames.length} quadros enviados para a análise. O mais nítido vira a capa.</p>
                <ol className="grid grid-cols-4 gap-2">
                  {media.previews.map((preview, index) => (
                    <li key={preview.slice(-24) + index}>
                      <button
                        type="button"
                        onClick={() => setActiveFrame(index)}
                        className={`relative block aspect-square w-full overflow-hidden rounded-lg border transition-all ${
                          activeFrame === index ? "border-ice shadow-[0_0_14px_-4px_var(--color-ice)]" : "border-line opacity-75 hover:opacity-100"
                        }`}
                        aria-label={`Quadro ${index + 1}${index === media.coverIndex ? ", capa" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- frame preview */}
                        <img src={preview} alt="" className="size-full object-cover" />
                        {index === media.coverIndex ? (
                          <span className="absolute right-1 bottom-1 rounded bg-ice px-1 text-[9px] font-semibold text-void">capa</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 text-sm">
                <p className="truncate text-ink">{media.label}</p>
                <p className="flex gap-3 font-mono text-xs text-ink-faint">
                  <span>
                    {media.width}×{media.height}px
                  </span>
                  <span>{formatBytes(media.bytes)} enviados</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={X} onClick={onClear} disabled={processing}>
                  Trocar
                </Button>
                <Button size="sm" icon={phase === "error" ? RotateCcw : Sparkles} onClick={onAnalyze} disabled={processing}>
                  {processing ? "Analisando…" : phase === "success" ? "Analisar de novo" : "Analisar"}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!dragging) setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
            className={`relative flex aspect-[4/3] flex-col items-center justify-center gap-5 px-6 text-center transition-colors duration-300 ${
              dragging ? "marching bg-ice/[0.06]" : ""
            }`}
          >
            <Viewfinder active={dragging} />
            <motion.div
              animate={dragging ? { scale: 1.15, rotate: -8, y: -4 } : { scale: 1, rotate: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 16 }}
              className={`grid size-16 place-items-center rounded-2xl border border-ice/30 bg-ice/10 text-ice shadow-[0_0_34px_-8px_var(--color-ice)] ${dragging ? "" : "animate-float"}`}
            >
              {preparing ? <Loader2 className="size-7 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-7" aria-hidden="true" />}
            </motion.div>
            <div className="space-y-1.5">
              <p className="text-base font-medium text-ink">
                {preparing ? "Preparando mídia…" : dragging ? "Solte para carregar" : "Arraste a foto ou o vídeo do produto"}
              </p>
              <p className="text-sm text-ink-muted">Fotos JPG, PNG ou WEBP. Vídeos MP4 ou WebM de até {MAX_VIDEO_SECONDS} s.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="ghost" icon={Film} onClick={pickFile} disabled={preparing}>
                Escolher arquivo
              </Button>
              <Button icon={Camera} onClick={() => setCameraOpen(true)} disabled={preparing}>
                Abrir câmera
              </Button>
            </div>
            <p className="text-xs text-ink-faint">Também dá para colar uma imagem com Ctrl+V.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <CameraDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onMedia} />
    </section>
  );
}
