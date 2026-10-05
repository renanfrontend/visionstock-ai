"use client";

import { motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ImageDropzone } from "./components/ImageDropzone";
import { ProductControlPanel } from "./components/ProductControlPanel";
import { useImageAnalysis } from "./hooks/use-image-analysis";

// WebGL never runs on the server; the chunk (three + r3f + drei) also stays out of the initial bundle.
const VisionScene = dynamic(() => import("@/components/three/VisionScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
      <div className="size-28 rounded-full bg-ice/10 blur-2xl" />
    </div>
  ),
});

const ease = [0.22, 1, 0.36, 1] as const;

export function CatalogWorkbench() {
  const { state, selectFile, retry, reset, editText, editList } = useImageAnalysis();
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <svg viewBox="0 0 24 24" className="size-6 text-ice" aria-hidden="true">
            <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8 16 10.5v5L12 18l-4-2.5v-5z" fill="currentColor" opacity="0.8" />
          </svg>
          <span className="font-display text-sm font-semibold tracking-tight">VisionStock AI</span>
        </Link>
        <span className="hidden text-sm text-ink-faint sm:block">Prova de conceito</span>
      </header>

      <main className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
        <motion.div
          className="flex flex-col gap-5"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <div className="relative -mx-4 h-56 sm:mx-0 sm:h-64 lg:h-72">
            <VisionScene phase={state.phase} reducedMotion={reducedMotion} />
          </div>
          <div className="-mt-4 space-y-2">
            <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
              Da foto ao cadastro em segundos.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-pretty text-ink-muted sm:text-base">
              O modelo de visão lê o produto e devolve título, descrição, categoria, cores e tags de SEO prontos para
              revisar.
            </p>
          </div>

          <ImageDropzone
            phase={state.phase}
            image={state.image}
            onSelect={selectFile}
            onRetry={retry}
            onClear={reset}
          />
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease }}
        >
          <ProductControlPanel state={state} onEditText={editText} onEditList={editList} />
        </motion.div>
      </main>
    </div>
  );
}
