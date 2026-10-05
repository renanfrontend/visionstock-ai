"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { QUALITY_READY_THRESHOLD, QUALITY_TIER_LABEL, type QualityReport } from "@/core/catalog/quality";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIER_COLOR = {
  excellent: "var(--color-mint)",
  good: "var(--color-ice)",
  fair: "var(--color-amber)",
  incomplete: "var(--color-ember)",
} as const;

/** Ring that fills as the record improves; a burst plays when it reaches 100%. */
export function QualityMeter({ report }: { report: QualityReport }) {
  const color = TIER_COLOR[report.tier];
  const pending = report.checks.filter((check) => !check.passed);
  const complete = report.score === 100;

  return (
    <section aria-labelledby="quality-title" className="glass rounded-2xl p-5">
      <div className="flex items-center gap-5">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgb(148 163 255 / 0.12)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - report.score / 100)}
              style={{ transition: "stroke-dashoffset 0.8s var(--ease-out-expo), stroke 0.4s", filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-xl font-semibold tabular-nums" style={{ color }}>
              {report.score}
            </span>
          </div>
          <AnimatePresence>
            {complete ? (
              <motion.div key="burst" className="pointer-events-none absolute inset-0" initial="hidden" animate="shown" exit="hidden" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-1/2 left-1/2 size-1.5 rounded-full bg-mint"
                    variants={{
                      hidden: { x: 0, y: 0, opacity: 0 },
                      shown: {
                        x: Math.cos((i / 10) * Math.PI * 2) * 62,
                        y: Math.sin((i / 10) * Math.PI * 2) * 62,
                        opacity: [0, 1, 0],
                        transition: { duration: 0.9, ease: "easeOut" },
                      },
                    }}
                  />
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="min-w-0">
          <h2 id="quality-title" className="text-sm text-ink-muted">
            Qualidade do cadastro
          </h2>
          <p className="font-display text-lg font-semibold" style={{ color }}>
            {QUALITY_TIER_LABEL[report.tier]}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {report.score >= QUALITY_READY_THRESHOLD
              ? "Já pode ir para a vitrine."
              : `Faltam ${QUALITY_READY_THRESHOLD - report.score} pontos para liberar a venda.`}
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
        {report.checks.map((check) => (
          <li key={check.id} className="flex items-center gap-2 text-sm" title={check.passed ? undefined : check.hint}>
            <span
              className={`grid size-4.5 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                check.passed ? "scale-100 border-mint bg-mint text-void" : "scale-90 border-ink-faint"
              }`}
              aria-hidden="true"
            >
              {check.passed ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <span className={check.passed ? "text-ink" : "text-ink-muted"}>{check.label}</span>
            <span className="ml-auto font-mono text-[11px] text-ink-faint">+{check.weight}</span>
            <span className="sr-only">{check.passed ? "concluído" : `pendente: ${check.hint}`}</span>
          </li>
        ))}
      </ul>
      {pending[0] ? <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">Próximo passo: {pending[0].hint}</p> : null}
    </section>
  );
}
