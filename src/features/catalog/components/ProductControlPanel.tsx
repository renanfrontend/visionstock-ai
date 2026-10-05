"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { AlertTriangle, Check, Copy, Download } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import { SEO_TAG_COUNT, type ProductDraft, type ProductDraftListField, type ProductDraftTextField } from "@/core/catalog/product-draft";
import type { AnalysisState } from "../hooks/use-image-analysis";
import { AnalysisStatus } from "./AnalysisStatus";
import { ChipListField } from "./ChipListField";

interface ProductControlPanelProps {
  state: AnalysisState;
  onEditText: (field: ProductDraftTextField, value: string) => void;
  onEditList: (field: ProductDraftListField, values: string[]) => void;
}

const EMPTY_DRAFT: ProductDraft = { title: "", description: "", category: "", colors: [], seoTags: [] };

const fieldsVariants: Variants = {
  waiting: {},
  revealed: { transition: { staggerChildren: 0.07 } },
};
const fieldVariants: Variants = {
  waiting: { opacity: 1, y: 0 },
  revealed: { opacity: [0.3, 1], y: [8, 0], transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function FieldShell({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <motion.div variants={fieldVariants} className="relative">
      {children}
      {loading ? <div className="skeleton absolute inset-x-0 bottom-0 top-7 rounded-xl" aria-hidden="true" /> : null}
    </motion.div>
  );
}

function TextField({
  label,
  value,
  max,
  disabled,
  multiline,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  disabled: boolean;
  multiline?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const counterId = useId();
  const shared = {
    id,
    value,
    disabled,
    maxLength: max,
    placeholder,
    "aria-describedby": counterId,
    className: "field",
  } as const;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-muted">
          {label}
        </label>
        <span id={counterId} className="font-mono text-xs text-ink-faint">
          {value.length}/{max}
        </span>
      </div>
      {multiline ? (
        <textarea {...shared} rows={5} className="field resize-y" onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...shared} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Telemetry({ meta }: { meta: NonNullable<AnalysisState["meta"]> }) {
  const items = [
    { label: "Modelo", value: meta.model },
    { label: "Latência", value: `${(meta.latencyMs / 1000).toFixed(2)} s` },
    { label: "Tokens", value: `${meta.inputTokens} → ${meta.outputTokens}` },
  ];
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-ink-faint">{item.label}</dt>
          <dd className="font-mono text-sm whitespace-nowrap text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function useCopyFeedback(timeoutMs = 1800) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [copied, timeoutMs]);
  return [copied, setCopied] as const;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProductControlPanel({ state, onEditText, onEditList }: ProductControlPanelProps) {
  const { phase, draft, meta, error } = state;
  const values = draft ?? EMPTY_DRAFT;
  const loading = phase === "processing";
  const editable = phase === "success" && draft !== null;
  const [copied, setCopied] = useCopyFeedback();

  const copyJson = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
    setCopied(true);
  };

  const downloadJson = () => {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = Object.assign(document.createElement("a"), {
      href: url,
      download: `${slugify(draft.title) || "produto"}.json`,
    });
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="panel-title" className="glass flex flex-col rounded-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <h2 id="panel-title" className="font-display text-base font-semibold tracking-tight">
          Cadastro do produto
        </h2>
        <AnalysisStatus phase={phase} />
      </header>

      <div className="flex-1 space-y-6 px-5 py-6 sm:px-6">
        <AnimatePresence initial={false}>
          {phase === "idle" ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm leading-relaxed text-ink-muted"
            >
              Envie uma foto e os campos abaixo são preenchidos automaticamente. Tudo continua editável antes de
              exportar.
            </motion.p>
          ) : null}
          {phase === "error" && error ? (
            <motion.div
              key="error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-3 rounded-xl border border-ember/30 bg-ember/8 p-4 text-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden="true" />
              <p className="text-ink">{error}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          className="space-y-6"
          variants={fieldsVariants}
          initial={false}
          animate={phase === "success" ? "revealed" : "waiting"}
        >
          <FieldShell loading={loading}>
            <TextField
              label="Título"
              value={values.title}
              max={160}
              disabled={!editable}
              placeholder="Ex.: Tênis de corrida Alpha em malha respirável"
              onChange={(v) => onEditText("title", v)}
            />
          </FieldShell>

          <FieldShell loading={loading}>
            <TextField
              label="Categoria"
              value={values.category}
              max={120}
              disabled={!editable}
              placeholder="Ex.: Calçados > Esportivos"
              onChange={(v) => onEditText("category", v)}
            />
          </FieldShell>

          <FieldShell loading={loading}>
            <TextField
              label="Descrição"
              value={values.description}
              max={2000}
              multiline
              disabled={!editable}
              placeholder="Material, estilo e contexto de uso aparecem aqui."
              onChange={(v) => onEditText("description", v)}
            />
          </FieldShell>

          <div className="grid gap-6 md:grid-cols-2">
            <FieldShell loading={loading}>
              <ChipListField
                label="Cores"
                values={values.colors}
                disabled={!editable}
                max={12}
                placeholder="Adicionar cor"
                onChange={(v) => onEditList("colors", v)}
              />
            </FieldShell>
            <FieldShell loading={loading}>
              <ChipListField
                label="Tags de SEO"
                values={values.seoTags}
                disabled={!editable}
                max={SEO_TAG_COUNT}
                chipPrefix="#"
                placeholder="Adicionar tag"
                onChange={(v) => onEditList("seoTags", v)}
              />
            </FieldShell>
          </div>
        </motion.div>
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-line px-5 py-4 sm:px-6">
        <div>
          {meta ? <Telemetry meta={meta} /> : <p className="text-xs text-ink-faint">Métricas da análise aparecem aqui.</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <NeonButton variant="ghost" icon={copied ? Check : Copy} onClick={copyJson} disabled={!editable}>
            {copied ? "JSON copiado" : "Copiar JSON"}
          </NeonButton>
          <NeonButton icon={Download} onClick={downloadJson} disabled={!editable}>
            Baixar JSON
          </NeonButton>
        </div>
      </footer>
    </section>
  );
}
