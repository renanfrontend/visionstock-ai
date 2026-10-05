"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, RotateCcw, ScanLine, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import type { PreparedImage } from "../lib/prepare-image";
import type { AnalysisPhase } from "../hooks/use-image-analysis";

interface ImageDropzoneProps {
  phase: AnalysisPhase;
  image: PreparedImage | null;
  onSelect: (file: File) => void;
  onRetry: () => void;
  onClear: () => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** Viewfinder corners: the only ornament on the dropzone, and they react to drag state. */
function ViewfinderCorners({ active }: { active: boolean }) {
  const base = "pointer-events-none absolute size-6 border-ice transition-all duration-300";
  const tone = active ? "opacity-100 border-ice" : "opacity-50 border-ice-dim";
  return (
    <>
      <span className={`${base} ${tone} left-3 top-3 border-l-2 border-t-2 rounded-tl-md`} />
      <span className={`${base} ${tone} right-3 top-3 border-r-2 border-t-2 rounded-tr-md`} />
      <span className={`${base} ${tone} bottom-3 left-3 border-b-2 border-l-2 rounded-bl-md`} />
      <span className={`${base} ${tone} bottom-3 right-3 border-b-2 border-r-2 rounded-br-md`} />
    </>
  );
}

function formatBytes(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function ImageDropzone({ phase, image, onSelect, onRetry, onClear }: ImageDropzoneProps) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const processing = phase === "processing";

  const pickFirstImage = useCallback(
    (files: FileList | null | undefined) => {
      const file = files?.[0];
      if (file) onSelect(file);
    },
    [onSelect],
  );

  // Paste from clipboard (Ctrl/Cmd + V) anywhere on the page.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) onSelect(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onSelect]);

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (!dragging) setDragging(true);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!processing) pickFirstImage(event.dataTransfer.files);
  };

  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-describedby={hintId}
        disabled={processing}
        onChange={(event) => {
          pickFirstImage(event.target.files);
          event.target.value = "";
        }}
      />

      <AnimatePresence mode="popLayout" initial={false}>
        {image ? (
          <motion.figure
            key={image.previewUrl}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative"
          >
            <div className="relative aspect-[4/3] w-full bg-void/60">
              <Image
                src={image.previewUrl}
                alt={`Pré-visualização de ${image.fileName}`}
                fill
                unoptimized
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-contain p-4"
              />
              {processing ? (
                <div className="pointer-events-none absolute inset-4" aria-hidden="true">
                  <div className="absolute inset-0 bg-iris/5" />
                  <div className="h-full animate-scan">
                    <div className="h-0.5 w-full bg-iris shadow-[0_0_18px_4px_var(--color-iris)]" />
                  </div>
                </div>
              ) : null}
              <ViewfinderCorners active={processing} />
            </div>

            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <div className="min-w-0 text-sm">
                <p className="truncate text-ink">{image.fileName}</p>
                <p className="flex gap-3 font-mono text-xs text-ink-faint">
                  <span>
                    {image.width}×{image.height}px
                  </span>
                  <span>{formatBytes(image.bytes)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <NeonButton variant="ghost" icon={X} onClick={onClear} disabled={processing}>
                  Remover
                </NeonButton>
                <NeonButton icon={phase === "error" ? RotateCcw : ScanLine} onClick={onRetry} disabled={processing}>
                  {processing ? "Analisando…" : "Analisar de novo"}
                </NeonButton>
              </div>
            </figcaption>
          </motion.figure>
        ) : (
          <motion.label
            key="empty"
            htmlFor={inputId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={onDragOver}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            tabIndex={0}
            className={`relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-4 px-6 text-center transition-colors duration-300 sm:aspect-[16/9] ${
              dragging ? "bg-ice/8" : "hover:bg-ice/[0.03]"
            }`}
          >
            <ViewfinderCorners active={dragging} />
            <motion.span
              animate={dragging ? { scale: 1.12, rotate: -6 } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="grid size-14 place-items-center rounded-xl border border-ice/30 bg-ice/10 text-ice shadow-[0_0_30px_-8px_var(--color-ice)]"
            >
              <ImagePlus className="size-6" aria-hidden="true" />
            </motion.span>
            <span className="space-y-1.5">
              <span className="block text-base font-medium text-ink">
                {dragging ? "Solte para analisar" : "Arraste a foto do produto"}
              </span>
              <span id={hintId} className="block text-sm text-ink-muted">
                ou clique para escolher, ou cole com Ctrl+V. JPG, PNG, WEBP ou GIF até 20 MB.
              </span>
            </span>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}
