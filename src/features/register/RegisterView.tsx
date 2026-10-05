"use client";

import { motion } from "framer-motion";
import { Eraser, ImageUp, PackagePlus, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createProduct, updateProduct } from "@/application/catalog/commands";
import { Button } from "@/components/ui/Button";
import type { ProductDraft } from "@/core/catalog/product-draft";
import { EMPTY_PRODUCT_INPUT, type Product, type ProductInput } from "@/core/catalog/product";
import { evaluateQuality } from "@/core/catalog/quality";
import { generateSku } from "@/core/catalog/sku";
import { useCatalog, useCatalogStore } from "../app/CatalogProvider";
import { flyTo } from "../app/fly-to";
import { useNavigation } from "../app/navigation";
import type { PreparedMedia } from "../media/lib/prepare-media";
import { MediaCapture } from "../media/MediaCapture";
import { ProductForm, type AiField } from "./ProductForm";
import { QualityMeter } from "./QualityMeter";
import { useProductAnalysis, type AnalysisMeta } from "./use-product-analysis";

const AI_FIELDS: readonly AiField[] = ["title", "description", "category", "colors", "seoTags"];

function inputFromProduct(product: Product): ProductInput {
  return {
    title: product.title,
    description: product.description,
    category: product.category,
    brand: product.brand,
    gtin: product.gtin,
    colors: product.colors,
    seoTags: product.seoTags,
    priceCents: product.priceCents,
    costCents: product.costCents,
    weightGrams: product.weightGrams,
    imageDataUrl: product.imageDataUrl,
    mediaKind: product.mediaKind,
    sku: product.sku,
    initialQuantity: product.stock.quantity,
    minimumQuantity: product.stock.minimum,
  };
}

export function RegisterView() {
  const products = useCatalog((state) => state.products);
  const { editingId } = useNavigation();
  const editing = useMemo(() => products.find((product) => product.id === editingId) ?? null, [products, editingId]);
  // Re-keyed per product: switching between "new" and "edit X" starts from a clean form.
  return <RegisterEditor key={editing?.id ?? "new"} editing={editing} products={products} />;
}

function RegisterEditor({ editing, products }: { editing: Product | null; products: readonly Product[] }) {
  const store = useCatalogStore();
  const { edit } = useNavigation();

  const [input, setInput] = useState<ProductInput>(() => (editing ? inputFromProduct(editing) : EMPTY_PRODUCT_INPUT));
  const [media, setMedia] = useState<PreparedMedia | null>(null);
  const [aiFilled, setAiFilled] = useState<Set<AiField>>(new Set());
  const [aiRevision, setAiRevision] = useState(0);
  const [aiModel, setAiModel] = useState<string | null>(editing?.aiModel ?? null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  // Revoke the session-only video URL when media is replaced.
  useEffect(() => () => {
    if (media?.playbackUrl) URL.revokeObjectURL(media.playbackUrl);
  }, [media]);

  const applyDraft = useCallback((draft: ProductDraft, meta: AnalysisMeta) => {
    setInput((current) => ({ ...current, ...draft }));
    setAiFilled(new Set(AI_FIELDS));
    setAiRevision((n) => n + 1);
    setAiModel(meta.model);
  }, []);

  const analysis = useProductAnalysis(applyDraft);

  const onMedia = useCallback(
    (next: PreparedMedia) => {
      setMediaError(null);
      setMedia(next);
      setInput((current) => ({ ...current, imageDataUrl: next.cover, mediaKind: next.kind }));
      void analysis.analyze(next);
    },
    [analysis],
  );

  const patch = useCallback((change: Partial<ProductInput>) => {
    setInput((current) => ({ ...current, ...change }));
    // Once the person edits a field, it is theirs: drop its AI highlight.
    setAiFilled((current) => {
      const keys = Object.keys(change).filter((key): key is AiField => (AI_FIELDS as readonly string[]).includes(key));
      if (!keys.some((key) => current.has(key))) return current;
      const next = new Set(current);
      keys.forEach((key) => next.delete(key));
      return next;
    });
  }, []);

  const report = useMemo(() => evaluateQuality(input), [input]);
  const skuPreview = useMemo(
    () => (input.title ? generateSku(input.category, input.title, products.map((p) => p.sku)) : "CAT-PROD-0001"),
    [input.title, input.category, products],
  );

  const clear = () => {
    setInput(EMPTY_PRODUCT_INPUT);
    setMedia(null);
    setAiFilled(new Set());
    setAiModel(null);
    analysis.reset();
  };

  const save = () => {
    if (editing) {
      const result = store.run((state, ctx) => updateProduct(state, editing.id, input, ctx));
      if (result.ok) edit(null);
      return;
    }
    const result = store.run((state, ctx) =>
      createProduct(state, input, { source: aiModel ? "ai" : "manual", aiModel }, ctx),
    );
    if (result.ok) {
      void flyTo(saveRef.current, '[data-tab="armazem"]', input.imageDataUrl);
      clear();
    }
  };

  const showCurrentCover = editing && !media && input.imageDataUrl;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-5 lg:sticky lg:top-24">
        <header className="space-y-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance">
            {editing ? "Editar produto" : "Da foto ao cadastro"}
          </h1>
          <p className="max-w-md text-sm text-pretty text-ink-muted">
            {editing
              ? `Você está editando ${editing.sku}. Troque a mídia para analisar de novo.`
              : "Fotografe, grave um vídeo curto girando o produto ou envie um arquivo. A IA preenche o cadastro e você revisa."}
          </p>
        </header>

        {showCurrentCover ? (
          <div className="glass flex items-center gap-4 rounded-2xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- stored cover data URL */}
            <img src={input.imageDataUrl ?? ""} alt={`Capa atual de ${editing.title}`} className="size-24 rounded-xl bg-white object-cover" />
            <div className="space-y-2">
              <p className="text-sm text-ink">Capa atual</p>
              <Button size="sm" variant="ghost" icon={ImageUp} onClick={() => setInput((current) => ({ ...current, imageDataUrl: null }))}>
                Substituir por foto ou vídeo
              </Button>
            </div>
          </div>
        ) : (
          <MediaCapture
            media={media}
            phase={analysis.phase}
            onMedia={onMedia}
            onClear={() => {
              setMedia(null);
              setInput((current) => ({ ...current, imageDataUrl: editing?.imageDataUrl ?? null, mediaKind: editing?.mediaKind ?? null }));
              analysis.reset();
            }}
            onAnalyze={() => media && void analysis.analyze(media)}
            onError={setMediaError}
          />
        )}

        {mediaError || analysis.error ? (
          <p role="alert" className="rounded-xl border border-ember/30 bg-ember/8 px-4 py-3 text-sm text-ink">
            {mediaError ?? analysis.error}
          </p>
        ) : null}
        {analysis.meta ? (
          <p className="font-mono text-xs text-ink-faint">
            {analysis.meta.model} respondeu em {(analysis.meta.latencyMs / 1000).toFixed(1).replace(".", ",")} s
          </p>
        ) : null}

        <QualityMeter report={report} />
      </div>

      <motion.section
        aria-labelledby="form-title"
        className="glass rounded-2xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 id="form-title" className="font-display text-base font-semibold">
            {editing ? editing.sku : "Novo produto"}
          </h2>
          {analysis.phase === "processing" ? (
            <span className="flex items-center gap-2 text-sm text-iris" role="status">
              <span className="size-2 animate-ping rounded-full bg-iris" aria-hidden="true" />
              Lendo a mídia
            </span>
          ) : aiFilled.size > 0 ? (
            <span className="text-sm text-iris">Campos em destaque vieram da IA</span>
          ) : null}
        </header>

        <div className={`px-5 py-6 sm:px-6 ${analysis.phase === "processing" ? "pointer-events-none opacity-60 transition-opacity" : ""}`}>
          <ProductForm value={input} onChange={patch} mode={editing ? "edit" : "create"} skuPreview={skuPreview} aiFilled={aiFilled} aiRevision={aiRevision} />
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
          {editing ? (
            <Button variant="ghost" icon={X} onClick={() => edit(null)}>
              Cancelar edição
            </Button>
          ) : (
            <Button variant="ghost" icon={Eraser} onClick={clear}>
              Limpar
            </Button>
          )}
          <Button ref={saveRef} icon={editing ? Save : PackagePlus} onClick={save} disabled={analysis.phase === "processing"}>
            {editing ? "Salvar alterações" : "Salvar no catálogo"}
          </Button>
        </footer>
      </motion.section>
    </div>
  );
}
