"use client";

import { motion } from "framer-motion";
import type { AnalysisPhase } from "../hooks/use-image-analysis";

const STATUS: Record<AnalysisPhase, { label: string; dot: string; text: string }> = {
  idle: { label: "Aguardando imagem", dot: "bg-ink-faint", text: "text-ink-muted" },
  processing: { label: "Lendo a imagem", dot: "bg-iris shadow-[0_0_10px_var(--color-iris)]", text: "text-iris" },
  success: { label: "Cadastro gerado", dot: "bg-ice shadow-[0_0_10px_var(--color-ice)]", text: "text-ice" },
  error: { label: "Análise interrompida", dot: "bg-ember shadow-[0_0_10px_var(--color-ember)]", text: "text-ember" },
};

export function AnalysisStatus({ phase }: { phase: AnalysisPhase }) {
  const status = STATUS[phase];
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
      <span className="relative flex size-2">
        {phase === "processing" ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-iris opacity-70" />
        ) : null}
        <span className={`relative inline-flex size-2 rounded-full ${status.dot}`} />
      </span>
      <motion.span
        key={phase}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={status.text}
      >
        {status.label}
      </motion.span>
    </div>
  );
}
