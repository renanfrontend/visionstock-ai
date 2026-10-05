"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2, SwitchCamera, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MAX_VIDEO_SECONDS, type PreparedMedia } from "./lib/prepare-media";
import { useCamera } from "./use-camera";

type Mode = "photo" | "video";

interface CameraDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (media: PreparedMedia) => void;
}

export function CameraDialog({ open, onClose, onCapture }: CameraDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    videoRef,
    status,
    error,
    facing,
    canSwitch,
    canRecord,
    elapsed,
    start,
    stop,
    switchFacing,
    takePhoto,
    startRecording,
    stopRecording,
  } = useCamera();
  const [mode, setMode] = useState<Mode>("photo");
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      void start();
    }
    if (!open && dialog.open) dialog.close();
    if (!open) stop();
  }, [open, start, stop]);

  const finish = (media: PreparedMedia) => {
    stop();
    onCapture(media);
    onClose();
  };

  const shoot = () => {
    if (mode === "photo") {
      const media = takePhoto();
      if (media) {
        setFlash((n) => n + 1);
        window.setTimeout(() => finish(media), 180);
      }
    } else if (status === "recording") {
      stopRecording();
    } else {
      startRecording(finish);
    }
  };

  const recording = status === "recording";
  const busy = status === "starting" || status === "processing";
  const remaining = Math.max(0, MAX_VIDEO_SECONDS - elapsed);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="camera-title"
      className="m-auto w-[min(720px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-hull p-0 text-ink shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="camera-title" className="font-display text-sm font-semibold">
          Câmera
        </h2>
        <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-white/5 hover:text-ink" aria-label="Fechar câmera">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="relative aspect-[4/3] bg-black sm:aspect-video">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
          aria-label="Prévia da câmera"
        />

        {/* Shutter flash */}
        <AnimatePresence>
          {flash > 0 ? (
            <motion.div key={flash} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />
          ) : null}
        </AnimatePresence>

        {recording ? (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 font-mono text-xs text-white">
            <span className="size-2 animate-rec rounded-full bg-ember" aria-hidden="true" />
            {elapsed.toFixed(1).replace(".", ",")} s de {MAX_VIDEO_SECONDS} s
          </div>
        ) : null}

        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm text-white">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {status === "processing" ? "Extraindo quadros do vídeo…" : "Abrindo a câmera…"}
            </span>
          </div>
        ) : null}

        {status === "error" ? (
          <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-sm space-y-4">
              <p className="text-sm text-ink">{error}</p>
              <Button variant="ghost" onClick={() => void start()}>
                Tentar de novo
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {error && status !== "error" ? (
        <p role="alert" className="border-t border-line bg-ember/10 px-4 py-2 text-sm text-ember">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
        <div role="radiogroup" aria-label="Modo de captura" className="flex w-fit rounded-lg border border-line p-0.5 text-sm">
          {(
            [
              ["photo", "Foto", Camera],
              ["video", "Vídeo", Video],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              disabled={recording || (value === "video" && !canRecord)}
              onClick={() => setMode(value)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-40 ${mode === value ? "bg-ice/12 text-ice" : "text-ink-muted hover:text-ink"}`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Shutter / record button with a countdown ring that drains over the clip limit */}
        <button
          type="button"
          onClick={shoot}
          disabled={status !== "live" && !recording}
          className="relative grid size-16 place-items-center rounded-full transition-transform active:scale-95 disabled:opacity-40"
          aria-label={mode === "photo" ? "Tirar foto" : recording ? `Parar gravação, faltam ${Math.ceil(remaining)} segundos` : `Gravar vídeo de até ${MAX_VIDEO_SECONDS} segundos`}
        >
          <svg viewBox="0 0 100 100" className="countdown-ring absolute inset-0 -rotate-90" style={{ "--clip-duration": `${MAX_VIDEO_SECONDS}s` } as React.CSSProperties} aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="5" />
            {recording ? <circle className="progress" cx="50" cy="50" r="46" fill="none" stroke="var(--color-ember)" strokeWidth="5" strokeLinecap="round" /> : null}
          </svg>
          <span
            className={`block transition-all duration-300 ${
              mode === "photo" ? "size-11 rounded-full bg-white" : recording ? "size-6 rounded-md bg-ember" : "size-11 rounded-full bg-ember"
            }`}
          />
        </button>

        <div className="flex justify-end">
          {canSwitch ? (
            <Button variant="ghost" size="sm" icon={SwitchCamera} onClick={() => void switchFacing()} disabled={recording}>
              Virar
            </Button>
          ) : null}
        </div>
      </div>
      <p className="px-4 pb-4 text-center text-xs text-ink-faint">
        {mode === "video" ? `O vídeo para sozinho em ${MAX_VIDEO_SECONDS} s. Gire o produto devagar para mostrar vários ângulos.` : "Centralize o produto e use fundo limpo para um cadastro melhor."}
      </p>
    </dialog>
  );
}
