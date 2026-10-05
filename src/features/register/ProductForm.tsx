"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { ChipListField } from "@/components/ui/ChipListField";
import { MoneyField, StepperField, TextField } from "@/components/ui/fields";
import { isValidGtin } from "@/core/catalog/gtin";
import { marginPercent, type ProductInput } from "@/core/catalog/product";

export type AiField = "title" | "description" | "category" | "colors" | "seoTags";

interface ProductFormProps {
  value: ProductInput;
  onChange: (patch: Partial<ProductInput>) => void;
  mode: "create" | "edit";
  skuPreview: string;
  /** Fields just filled by the model; they glow briefly so the person sees what changed. */
  aiFilled: ReadonlySet<AiField>;
  aiRevision: number;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 font-display text-xs font-semibold tracking-wide text-ink-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Wraps an AI-fillable field; re-keyed on each analysis so the glow replays. */
function AiGlow({ active, revision, children }: { active: boolean; revision: number; children: ReactNode }) {
  return (
    <div key={active ? `ai-${revision}` : "plain"} className={active ? "ai-filled rounded-xl" : undefined}>
      {children}
    </div>
  );
}

export function ProductForm({ value, onChange, mode, skuPreview, aiFilled, aiRevision }: ProductFormProps) {
  const gtinState = value.gtin ? (isValidGtin(value.gtin) ? "valid" : "invalid") : "empty";
  const margin = marginPercent(value);

  return (
    <div className="space-y-8">
      <Section title="Identificação">
        <AiGlow active={aiFilled.has("title")} revision={aiRevision}>
          <TextField
            label="Título"
            value={value.title}
            max={160}
            placeholder="Ex.: Caneca de cerâmica Alpha azul-marinho 350 ml"
            onChange={(title) => onChange({ title })}
          />
        </AiGlow>
        <div className="grid gap-4 sm:grid-cols-2">
          <AiGlow active={aiFilled.has("category")} revision={aiRevision}>
            <TextField label="Categoria" value={value.category} max={120} placeholder="Ex.: Casa e Cozinha > Canecas" onChange={(category) => onChange({ category })} />
          </AiGlow>
          <TextField label="Marca" value={value.brand} max={80} placeholder="Ex.: Linha Alpha" onChange={(brand) => onChange({ brand })} />
          <TextField
            label="SKU"
            value={value.sku ?? ""}
            max={40}
            mono
            placeholder={skuPreview}
            hint={mode === "create" ? "Deixe em branco para gerar automaticamente." : undefined}
            onChange={(sku) => onChange({ sku: sku.toUpperCase() })}
          />
          <TextField
            label="EAN / GTIN"
            value={value.gtin}
            max={14}
            mono
            inputMode="numeric"
            placeholder="13 dígitos"
            error={gtinState === "invalid" ? "Dígito verificador inválido." : null}
            hint={
              gtinState === "valid" ? (
                <span className="inline-flex items-center gap-1 text-mint">
                  <Check className="size-3" aria-hidden="true" /> Código válido
                </span>
              ) : (
                "Opcional, melhora a indexação em marketplaces."
              )
            }
            onChange={(gtin) => onChange({ gtin: gtin.replace(/\D/g, "") })}
          />
        </div>
      </Section>

      <Section title="Descrição e atributos">
        <AiGlow active={aiFilled.has("description")} revision={aiRevision}>
          <TextField
            label="Descrição"
            value={value.description}
            max={2000}
            multiline
            rows={5}
            placeholder="Material, medidas, uso e diferenciais."
            onChange={(description) => onChange({ description })}
          />
        </AiGlow>
        <div className="grid gap-4 sm:grid-cols-2">
          <AiGlow active={aiFilled.has("colors")} revision={aiRevision}>
            <ChipListField label="Cores" values={value.colors} max={12} placeholder="Adicionar cor" onChange={(colors) => onChange({ colors })} />
          </AiGlow>
          <AiGlow active={aiFilled.has("seoTags")} revision={aiRevision}>
            <ChipListField label="Tags de SEO" values={value.seoTags} max={5} chipPrefix="#" placeholder="Adicionar tag" onChange={(seoTags) => onChange({ seoTags })} />
          </AiGlow>
        </div>
      </Section>

      <Section title="Comercial">
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyField label="Preço de venda" cents={value.priceCents} onChange={(priceCents) => onChange({ priceCents })} />
          <MoneyField label="Custo" cents={value.costCents} onChange={(costCents) => onChange({ costCents })} />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-muted">Margem</p>
            <p
              className={`field flex items-center gap-2 font-mono text-[0.9rem] ${
                margin === null ? "text-ink-faint" : margin > 0 ? "text-mint" : "text-ember"
              }`}
              aria-live="polite"
            >
              {margin === null ? "Informe preço e custo" : `${margin.toFixed(1).replace(".", ",")}%`}
              {margin !== null && margin <= 0 ? <X className="size-3.5" aria-label="margem negativa" /> : null}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Estoque e logística">
        <div className="grid gap-4 sm:grid-cols-3">
          {mode === "create" ? (
            <StepperField label="Estoque inicial" value={value.initialQuantity} unit="un." step={5} onChange={(initialQuantity) => onChange({ initialQuantity })} />
          ) : null}
          <StepperField label="Estoque mínimo" value={value.minimumQuantity} unit="un." onChange={(minimumQuantity) => onChange({ minimumQuantity })} hint="Abaixo disso o armazém acende alerta." />
          <StepperField label="Peso" value={value.weightGrams} unit="g" step={50} onChange={(weightGrams) => onChange({ weightGrams })} />
        </div>
        {mode === "edit" ? <p className="text-xs text-ink-faint">O saldo de estoque muda pelas movimentações na aba Armazém, para manter o histórico.</p> : null}
      </Section>
    </div>
  );
}
