"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, MapPin, PackageCheck } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/core/catalog/product";
import { ProductThumb } from "../shared/ProductThumb";
import { StockBadge } from "../shared/StockBadge";
import { startProductDrag } from "./drag";

type Tab = "pending" | "allocated";

interface AllocationQueueProps {
  products: readonly Product[];
  draggingId: string | null;
  armedId: string | null;
  focusedId: string | null;
  onDragStart: (productId: string) => void;
  onDragEnd: () => void;
  onArm: (productId: string) => void;
  onFocus: (productId: string) => void;
}

export function AllocationQueue({ products, draggingId, armedId, focusedId, onDragStart, onDragEnd, onArm, onFocus }: AllocationQueueProps) {
  const pending = products.filter((product) => !product.stock.binId);
  const allocated = products.filter((product) => product.stock.binId).sort((a, b) => (a.stock.binId ?? "").localeCompare(b.stock.binId ?? ""));
  const [tab, setTab] = useState<Tab>(pending.length > 0 ? "pending" : "allocated");
  const list = tab === "pending" ? pending : allocated;

  return (
    <aside aria-label="Fila de endereçamento" className="glass flex min-h-0 flex-col rounded-2xl">
      <div role="tablist" aria-label="Filtrar produtos" className="grid grid-cols-2 gap-1 border-b border-line p-2">
        {(
          [
            ["pending", "Sem endereço", pending.length],
            ["allocated", "No armazém", allocated.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative rounded-lg px-2 py-2 text-sm transition-colors ${tab === id ? "text-ink" : "text-ink-muted hover:text-ink"}`}
          >
            {tab === id ? <motion.span layoutId="queue-tab" className="absolute inset-0 rounded-lg bg-white/[0.06]" transition={{ type: "spring", stiffness: 500, damping: 38 }} /> : null}
            <span className="relative">
              {label} <span className={`font-mono text-xs ${id === "pending" && count > 0 ? "text-amber" : "text-ink-faint"}`}>{count}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="px-4 pt-3 text-xs text-ink-faint">
        {tab === "pending" ? "Arraste até uma prateleira, ou toque no card e depois na prateleira." : "Toque para ver o produto na maquete."}
      </p>

      <ul className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 lg:max-h-[calc(100dvh-260px)]">
        <AnimatePresence initial={false}>
          {list.map((product) => {
            const isPending = !product.stock.binId;
            const armed = armedId === product.id;
            const focused = focusedId === product.id;
            return (
              <motion.li key={product.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: 40 }} transition={{ type: "spring", stiffness: 420, damping: 34 }}>
                <div
                  role="button"
                  tabIndex={0}
                  draggable
                  aria-pressed={isPending ? armed : focused}
                  aria-label={`${product.title}, ${product.sku}${isPending ? ", sem endereço" : `, em ${product.stock.binId}`}`}
                  onDragStart={(event) => {
                    startProductDrag(event, product.id, product.sku);
                    onDragStart(product.id);
                  }}
                  onDragEnd={onDragEnd}
                  onClick={() => (isPending ? onArm(product.id) : onFocus(product.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (isPending) onArm(product.id);
                      else onFocus(product.id);
                    }
                  }}
                  className={`group flex cursor-grab items-center gap-3 rounded-xl border p-2.5 transition-all duration-200 select-none active:cursor-grabbing ${
                    draggingId === product.id
                      ? "scale-95 rotate-[-2deg] border-ice/40 opacity-40"
                      : armed
                        ? "border-ice bg-ice/10 shadow-[0_0_0_3px_rgb(110_231_249/0.15),0_0_26px_-8px_var(--color-ice)]"
                        : focused
                          ? "border-ice/50 bg-white/[0.05]"
                          : "border-line bg-white/[0.02] hover:-translate-y-0.5 hover:border-ice/30 hover:bg-white/[0.04] hover:shadow-[0_10px_24px_-14px_rgb(0_0_0/0.8)]"
                  }`}
                >
                  <GripVertical className="size-4 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted" aria-hidden="true" />
                  <ProductThumb src={product.imageDataUrl} alt="" className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug text-ink">{product.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="truncate font-mono text-[11px] text-ink-faint">{product.sku}</span>
                      {product.stock.binId ? (
                        <span className="flex items-center gap-0.5 font-mono text-[11px] text-ice">
                          <MapPin className="size-3" aria-hidden="true" />
                          {product.stock.binId}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <StockBadge quantity={product.stock.quantity} minimum={product.stock.minimum} />
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {list.length === 0 ? (
          <li className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="grid size-12 animate-float place-items-center rounded-2xl bg-mint/10 text-mint">
              <PackageCheck className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm text-ink">{tab === "pending" ? "Tudo endereçado" : "Armazém vazio"}</p>
            <p className="text-xs text-ink-muted">{tab === "pending" ? "Novos produtos do Cadastro aparecem aqui." : "Arraste produtos da aba Sem endereço."}</p>
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
