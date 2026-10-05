"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MediaValidationError } from "./lib/encode";
import { MAX_VIDEO_SECONDS, prepareVideo, prepareVideoSnapshot, type PreparedMedia } from "./lib/prepare-media";

export type CameraStatus = "idle" | "starting" | "live" | "recording" | "processing" | "error";
export type Facing = "environment" | "user";

/** Preference order: MP4/H.264 where supported (Safari, recent Chrome), WebM elsewhere. */
const RECORDER_TYPES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

function pickRecorderType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function describeCameraError(error: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) return "A câmera só funciona em páginas HTTPS.";
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Acesso à câmera negado. Libere a permissão no ícone de cadeado da barra de endereço e tente de novo.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nenhuma câmera encontrada neste dispositivo.";
    case "NotReadableError":
    case "AbortError":
      return "A câmera está em uso por outro aplicativo. Feche-o e tente de novo.";
    default:
      return error instanceof MediaValidationError ? error.message : "Não foi possível abrir a câmera.";
  }
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedAtRef = useRef(0);
  const autoStopRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [canSwitch, setCanSwitch] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const canRecord = typeof window !== "undefined" && Boolean(pickRecorderType());

  const clearTimers = () => {
    if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    autoStopRef.current = null;
    tickRef.current = null;
  };

  const stop = useCallback(() => {
    clearTimers();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setElapsed(0);
  }, []);

  const start = useCallback(
    async (nextFacing: Facing = facing) => {
      stop();
      setError(null);
      setStatus("starting");
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("unsupported", "NotFoundError");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: nextFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        setFacing(nextFacing);
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setCanSwitch(devices.filter((device) => device.kind === "videoinput").length > 1);
        setStatus("live");
      } catch (cause) {
        setError(describeCameraError(cause));
        setStatus("error");
      }
    },
    [facing, stop],
  );

  const switchFacing = useCallback(() => start(facing === "environment" ? "user" : "environment"), [facing, start]);

  const takePhoto = useCallback((): PreparedMedia | null => {
    const video = videoRef.current;
    if (!video) return null;
    try {
      return prepareVideoSnapshot(video, "Foto da câmera");
    } catch (cause) {
      setError(describeCameraError(cause));
      return null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(
    (onReady: (media: PreparedMedia) => void) => {
      const stream = streamRef.current;
      const mimeType = pickRecorderType();
      if (!stream || !mimeType) {
        setError("Este navegador não grava vídeo. Envie um arquivo de vídeo de até 10 s.");
        return;
      }
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        clearTimers();
        const seconds = (performance.now() - startedAtRef.current) / 1000;
        setStatus("processing");
        try {
          const media = await prepareVideo(new Blob(chunks, { type: mimeType }), "Vídeo da câmera", Math.min(seconds, MAX_VIDEO_SECONDS));
          onReady(media);
        } catch (cause) {
          setError(describeCameraError(cause));
          setStatus("live");
        }
      };

      startedAtRef.current = performance.now();
      setElapsed(0);
      recorder.start(250);
      setStatus("recording");
      tickRef.current = window.setInterval(() => setElapsed((performance.now() - startedAtRef.current) / 1000), 100);
      // Hard limit: the clip never exceeds what the analysis accepts.
      autoStopRef.current = window.setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_VIDEO_SECONDS * 1000);
    },
    [],
  );

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, facing, canSwitch, canRecord, elapsed, start, stop, switchFacing, takePhoto, startRecording, stopRecording };
}
