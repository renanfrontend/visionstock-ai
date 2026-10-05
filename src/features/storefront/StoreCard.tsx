"use client";

import { Barcode, RotateCcw, Tag } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { toggleChannel } from "@/application/catalog/commands";
import { SALES_CHANNEL_LABEL, SALES_CHANNELS, type Product } from "@/core/catalog/product";
import { stockStatus } from "@/core/inventory/stock";
import { formatBRL } from "@/core/shared/money";
import { useCatalogStore } from "../app/CatalogProvider";

const MAX_TILT = 9;

/**
 * Storefront card with pointer-driven 3D tilt and a glare that follows the cursor.
 * Click flips it to the back: channels, tags and identifiers.
 */
export function StoreCard({ product }: { product: Product }) {
  const store = useCatalogStore();
  const card = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const low = stockStatus(product.stock.quantity, product.stock.minimum) === "low";

  const onMove = (event: PointerEvent) => {
    const element = card.current;
    if (!element || event.pointerType !== "mouse") return;
    const rect = element.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    element.style.setProperty("--tilt-y", `${(px - 0.5) * MAX_TILT * 2}deg`);
    element.style.setProperty("--tilt-x", `${(0.5 - py) * MAX_TILT * 2}deg`);
    element.style.setProperty("--glare-x", `${px * 100}%`);
    element.style.setProperty("--glare-y", `${py * 100}%`);
  };

  const reset = () => {
    card.current?.style.setProperty("--tilt-x", "0deg");
    card.current?.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div className="[perspective:900px]">
      <div ref={card} data-flipped={flipped} onPointerMove={onMove} onPointerLeave={reset} className="tilt-card relative aspect-[3/4.6] w-full">
        {/* Front */}
        <button
          type="button"
          onClick={() => setFlipped(true)}
          aria-label={`${product.title}, ${formatBRL(product.priceCents)}. Ver detalhes`}
          className="face absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-white text-left text-[#1d2433] shadow-[0_24px_50px_-24px_rgb(0_0_0/0.85)]"
        >
          <span className="relative block aspect-[5/4] w-full shrink-0 bg-[#f4f6fb]">
            {product.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored cover data URL
              <img src={product.imageDataUrl} alt="" className="size-full object-cover" draggable={false} />
            ) : null}
            {low ? <span className="absolute top-2.5 left-2.5 rounded-full bg-[#f59e0b] px-2 py-0.5 text-[11px] font-semibold text-white">Últimas unidades</span> : null}
          </span>
          <span className="flex flex-1 flex-col gap-1 p-3.5">
            <span className="text-[11px] text-[#6b7280]">{product.brand || product.category.split(">").pop()?.trim()}</span>
            <span className="line-clamp-2 text-sm leading-snug font-medium">{product.title}</span>
            <span className="mt-auto text-lg font-semibold">{formatBRL(product.priceCents)}</span>
            <span className="text-[11px] text-[#6b7280]">ou 3x de {formatBRL(Math.ceil(product.priceCents / 3))} sem juros</span>
          </span>
          <span className="tilt-glare pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true" />
        </button>

        {/* Back */}
        <div className="face face-back absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-[#0b0f22] p-4 text-sm" aria-hidden={!flipped}>
          <p className="line-clamp-2 font-medium text-ink">{product.title}</p>
          <div>
            <p className="mb-1.5 text-xs text-ink-muted">Canais de venda</p>
            <div className="flex flex-col gap-1.5">
              {SALES_CHANNELS.map((channel) => {
                const enabled = product.channels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    tabIndex={flipped ? 0 : -1}
                    onClick={() => store.run((state, ctx) => toggleChannel(state, product.id, channel, ctx))}
                    className="flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink hover:border-ice/30"
                  >
                    {SALES_CHANNEL_LABEL[channel]}
                    <span className={`relative h-4 w-7 rounded-full transition-colors ${enabled ? "bg-ice" : "bg-white/15"}`}>
                      <span className={`absolute top-0.5 size-3 rounded-full bg-void transition-[left] ${enabled ? "left-3.5" : "left-0.5"}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs text-ink-muted">
              <Tag className="size-3" aria-hidden="true" /> Tags de busca
            </p>
            <div className="flex flex-wrap gap-1">
              {product.seoTags.map((tag) => (
                <span key={tag} className="rounded bg-ice/10 px-1.5 py-0.5 text-[11px] text-ice">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
            <Barcode className="size-3.5" aria-hidden="true" />
            {product.gtin || "Sem EAN"}
          </p>
          <button
            type="button"
            tabIndex={flipped ? 0 : -1}
            onClick={() => setFlipped(false)}
            className="mt-auto flex items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs text-ink-muted hover:text-ink"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Voltar à vitrine
          </button>
        </div>
      </div>
    </div>
  );
}
