"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeImageResponse } from "@/core/catalog/analyze-image.contract";
import type { ProductDraft } from "@/core/catalog/product-draft";
import type { PreparedMedia } from "../media/lib/prepare-media";
import type { AnalysisPhase } from "../media/MediaCapture";

export type AnalysisMeta = Extract<AnalyzeImageResponse, { ok: true }>["meta"];

interface AnalysisState {
  phase: AnalysisPhase;
  error: string | null;
  meta: AnalysisMeta | null;
}

/** Sends a photo or video frames to the vision API; newer requests cancel older ones. */
export function useProductAnalysis(onDraft: (draft: ProductDraft, meta: AnalysisMeta) => void) {
  const [state, setState] = useState<AnalysisState>({ phase: "idle", error: null, meta: null });
  const inFlight = useRef<AbortController | null>(null);
  const onDraftRef = useRef(onDraft);

  useEffect(() => {
    onDraftRef.current = onDraft;
  }, [onDraft]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const analyze = useCallback(async (media: PreparedMedia) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setState({ phase: "processing", error: null, meta: null });

    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: media.frames, source: media.kind }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as AnalyzeImageResponse | null;
      if (controller.signal.aborted) return;
      if (!payload) throw new Error(`O servidor respondeu ${response.status} sem conteúdo.`);
      if (!payload.ok) {
        setState({ phase: "error", error: payload.error.message, meta: null });
        return;
      }
      setState({ phase: "success", error: null, meta: payload.meta });
      onDraftRef.current(payload.data, payload.meta);
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ phase: "error", error: error instanceof Error ? `Falha de rede: ${error.message}` : "Falha de rede.", meta: null });
    }
  }, []);

  const reset = useCallback(() => {
    inFlight.current?.abort();
    setState({ phase: "idle", error: null, meta: null });
  }, []);

  return { ...state, analyze, reset };
}
