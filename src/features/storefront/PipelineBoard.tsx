"use client";

import { LayoutGroup, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Lock, X } from "lucide-react";
import { useState, type DragEvent } from "react";
import { transitionProduct } from "@/application/catalog/commands";
import { canTransition } from "@/core/catalog/pipeline";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABEL, type Product, type ProductStatus } from "@/core/catalog/product";
import { evaluateQuality, QUALITY_READY_THRESHOLD } from "@/core/catalog/quality";
import { formatBRL } from "@/core/shared/money";
import { useCatalogStore } from "../app/CatalogProvider";
import { ProductThumb } from "../shared/ProductThumb";
import { StockBadge } from "../shared/StockBadge";

const DRAG_TYPE = "application/x-visionstock-stage";

const COLUMN_HINT: Record<ProductStatus, string> = {
  draft: "Cadastro em revisão",
  ready: "Qualidade ok, aguardando publicação",
  published: "À venda nos canais",
};

const COLUMN_ACCENT: Record<ProductStatus, string> = {
  draft: "bg-ink-faint",
  ready: "bg-amber",
  published: "bg-mint",
};

interface Gate {
  label: string;
  passed: boolean;
}

/** Requirements for the next stage, shown on the card like an unlock checklist. */
function gatesFor(product: Product): Gate[] {
  const score = evaluateQuality(product).score;
  if (product.status === "draft") {
    return [
      { label: `Qualidade ${score}%`, passed: score >= QUALITY_READY_THRESHOLD },
      { label: "Preço", passed: product.priceCents > 0 },
    ];
  }
  if (product.status === "ready") {
    return [
      { label: "Estoque", passed: product.stock.quantity > 0 },
      { label: "Endereço", passed: Boolean(product.stock.binId) },
    ];
  }
  return [];
}

interface CardProps {
  product: Product;
  shakeKey: number;
  dragging: boolean;
  onMove: (to: ProductStatus) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function PipelineCard({ product, shakeKey, dragging, onMove, onDragStart, onDragEnd }: CardProps) {
  const index = PRODUCT_STATUSES.indexOf(product.status);
  const previous = PRODUCT_STATUSES[index - 1];
  const next = PRODUCT_STATUSES[index + 1];
  const gates = gatesFor(product);
  const unlocked = gates.every((gate) => gate.passed);

  return (
    <motion.li layout layoutId={product.id} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
      <div
        key={shakeKey}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, product.id);
          event.dataTransfer.setData("text/plain", product.sku);
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className={`group cursor-grab rounded-xl border border-line bg-[#0b0f22] p-3 transition-[transform,box-shadow,opacity,border-color] duration-200 select-none active:cursor-grabbing ${
          shakeKey ? "animate-shake" : ""
        } hover:-translate-y-0.5 hover:border-ice/30 hover:shadow-[0_14px_30px_-16px_rgb(0_0_0/0.9)] ${
          dragging ? "scale-95 rotate-2 opacity-40" : ""
        }`}
      >
        <div className="flex gap-3">
          <ProductThumb src={product.imageDataUrl} alt="" className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-snug text-ink">{product.title}</p>
            <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{product.sku}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-mono text-sm text-ink">{product.priceCents ? formatBRL(product.priceCents) : "Sem preço"}</span>
          <StockBadge quantity={product.stock.quantity} minimum={product.stock.minimum} />
        </div>

        {gates.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
            <span className={`flex items-center gap-1 text-[11px] ${unlocked ? "text-mint" : "text-ink-faint"}`}>
              {unlocked ? <Check className="size-3" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
              {unlocked ? "Pode avançar" : "Para avançar"}
            </span>
            {gates.map((gate) => (
              <span
                key={gate.label}
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[11px] ${
                  gate.passed ? "border-mint/25 text-mint" : "border-amber/30 text-amber"
                }`}
              >
                {gate.passed ? <Check className="size-2.5" aria-hidden="true" /> : <X className="size-2.5" aria-hidden="true" />}
                {gate.label}
              </span>
            ))}
          </div>
        ) : null}

        {/* Buttons for keyboard and touch: same rules as dragging. */}
        <div className="mt-2.5 flex justify-between opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {previous ? (
            <button
              type="button"
              onClick={() => onMove(previous)}
              className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-ink-muted hover:bg-white/5 hover:text-ink"
              aria-label={`Voltar ${product.sku} para ${PRODUCT_STATUS_LABEL[previous]}`}
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              {PRODUCT_STATUS_LABEL[previous]}
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button
              type="button"
              onClick={() => onMove(next)}
              className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-ice hover:bg-ice/10"
              aria-label={`Mover ${product.sku} para ${PRODUCT_STATUS_LABEL[next]}`}
            >
              {next === "published" ? "Publicar" : PRODUCT_STATUS_LABEL[next]}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

export function PipelineBoard({ products }: { products: readonly Product[] }) {
  const store = useCatalogStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ProductStatus | null>(null);
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const dragging = products.find((product) => product.id === draggingId) ?? null;

  const move = (productId: string, to: ProductStatus) => {
    const result = store.run((state, ctx) => transitionProduct(state, productId, to, ctx));
    if (!result.ok && !result.notice.detail?.includes("já está nesta etapa")) {
      setShakes((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
    }
  };

  const onDrop = (event: DragEvent, to: ProductStatus) => {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE) || draggingId;
    setOverColumn(null);
    setDraggingId(null);
    if (id) move(id, to);
  };

  return (
    <LayoutGroup>
      <div className="grid gap-4 md:grid-cols-3">
        {PRODUCT_STATUSES.map((status) => {
          const items = products.filter((product) => product.status === status);
          // While dragging, each column previews whether the card would be accepted.
          const verdict = dragging && dragging.status !== status ? canTransition(dragging, status).allowed : null;
          const isOver = overColumn === status;
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                event.preventDefault();
                if (overColumn !== status) setOverColumn(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverColumn(null);
              }}
              onDrop={(event) => onDrop(event, status)}
              style={{ "--march-color": verdict === false ? "var(--color-ember)" : "var(--color-ice)" } as React.CSSProperties}
              className={`flex min-h-64 flex-col rounded-2xl border p-3 transition-colors duration-200 ${
                verdict === null
                  ? "border-line bg-white/[0.015]"
                  : verdict
                    ? `border-transparent marching ${isOver ? "bg-ice/[0.08]" : "bg-ice/[0.03]"}`
                    : `border-transparent marching ${isOver ? "bg-ember/[0.08]" : "bg-ember/[0.02]"}`
              }`}
            >
              <header className="mb-3 flex items-center gap-2 px-1">
                <span className={`size-2 rounded-full ${COLUMN_ACCENT[status]}`} aria-hidden="true" />
                <h2 id={`col-${status}`} className="text-sm font-medium text-ink">
                  {PRODUCT_STATUS_LABEL[status]}
                </h2>
                <span className="font-mono text-xs text-ink-faint">{items.length}</span>
                <span className="ml-auto truncate text-xs text-ink-faint">
                  {verdict === false ? "Requisitos pendentes" : verdict ? "Solte aqui" : COLUMN_HINT[status]}
                </span>
              </header>
              <ul className="flex flex-1 flex-col gap-2.5">
                {items.map((product) => (
                  <PipelineCard
                    key={product.id}
                    product={product}
                    shakeKey={shakes[product.id] ?? 0}
                    dragging={draggingId === product.id}
                    onMove={(to) => move(product.id, to)}
                    onDragStart={() => setDraggingId(product.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverColumn(null);
                    }}
                  />
                ))}
                {items.length === 0 ? (
                  <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-line px-4 py-8 text-center text-xs text-ink-faint">
                    Arraste um card para cá
                  </li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
