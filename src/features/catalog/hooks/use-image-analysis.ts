"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AnalyzeImageResponse } from "@/core/catalog/analyze-image.contract";
import type { ProductDraft, ProductDraftListField, ProductDraftTextField } from "@/core/catalog/product-draft";
import { ImageValidationError, prepareImage, type PreparedImage } from "../lib/prepare-image";

export type AnalysisPhase = "idle" | "processing" | "success" | "error";
export type AnalysisMeta = Extract<AnalyzeImageResponse, { ok: true }>["meta"];

export interface AnalysisState {
  phase: AnalysisPhase;
  image: PreparedImage | null;
  draft: ProductDraft | null;
  meta: AnalysisMeta | null;
  error: string | null;
}

type Action =
  | { type: "image-selected"; image: PreparedImage }
  | { type: "started" }
  | { type: "succeeded"; draft: ProductDraft; meta: AnalysisMeta }
  | { type: "failed"; message: string }
  | { type: "text-edited"; field: ProductDraftTextField; value: string }
  | { type: "list-edited"; field: ProductDraftListField; values: string[] }
  | { type: "reset" };

const initialState: AnalysisState = { phase: "idle", image: null, draft: null, meta: null, error: null };

function reducer(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case "image-selected":
      return { ...initialState, image: action.image };
    case "started":
      return { ...state, phase: "processing", error: null };
    case "succeeded":
      return { ...state, phase: "success", draft: action.draft, meta: action.meta };
    case "failed":
      return { ...state, phase: "error", error: action.message };
    case "text-edited":
      return state.draft ? { ...state, draft: { ...state.draft, [action.field]: action.value } } : state;
    case "list-edited":
      return state.draft ? { ...state, draft: { ...state.draft, [action.field]: action.values } } : state;
    case "reset":
      return initialState;
  }
}

async function requestAnalysis(image: PreparedImage, signal: AbortSignal): Promise<AnalyzeImageResponse> {
  const response = await fetch("/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: image.base64, mediaType: image.mediaType }),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as AnalyzeImageResponse | null;
  return payload ?? { ok: false, error: { code: "MODEL_ERROR", message: `O servidor respondeu ${response.status} sem conteúdo.` } };
}

export function useImageAnalysis() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const inFlight = useRef<AbortController | null>(null);
  const previewUrl = state.image?.previewUrl;

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const analyze = useCallback(async (image: PreparedImage) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    dispatch({ type: "started" });
    try {
      const result = await requestAnalysis(image, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) dispatch({ type: "succeeded", draft: result.data, meta: result.meta });
      else dispatch({ type: "failed", message: result.error.message });
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({
        type: "failed",
        message: error instanceof Error ? `Falha de rede: ${error.message}` : "Falha de rede ao enviar a imagem.",
      });
    }
  }, []);

  const selectFile = useCallback(
    async (file: File) => {
      inFlight.current?.abort();
      try {
        const image = await prepareImage(file);
        dispatch({ type: "image-selected", image });
        await analyze(image);
      } catch (error) {
        dispatch({
          type: "failed",
          message: error instanceof ImageValidationError ? error.message : "Não foi possível preparar a imagem.",
        });
      }
    },
    [analyze],
  );

  const retry = useCallback(() => {
    if (state.image) void analyze(state.image);
  }, [analyze, state.image]);

  const reset = useCallback(() => {
    inFlight.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  const editText = useCallback(
    (field: ProductDraftTextField, value: string) => dispatch({ type: "text-edited", field, value }),
    [],
  );
  const editList = useCallback(
    (field: ProductDraftListField, values: string[]) => dispatch({ type: "list-edited", field, values }),
    [],
  );

  return { state, selectFile, retry, reset, editText, editList };
}
