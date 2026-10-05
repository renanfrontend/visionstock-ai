"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, Search, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { formatBRL } from "@/core/shared/money";
import { useCatalog } from "../app/CatalogProvider";
import { PipelineBoard } from "./PipelineBoard";
import { StoreCard } from "./StoreCard";

export function StorefrontView() {
  const products = useCatalog((state) => state.products);
  const settings = useCatalog((state) => state.settings);
  const published = useMemo(() => products.filter((product) => product.status === "published"), [products]);
  const publishedValue = published.reduce((sum, product) => sum + product.priceCents * product.stock.quantity, 0);
  const host = settings.storeUrl.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-10">
      <section aria-labelledby="pipeline-title" className="space-y-4">
        <header className="space-y-1.5">
          <h1 id="pipeline-title" className="font-display text-2xl font-semibold tracking-tight">
            Vitrine
          </h1>
          <p className="max-w-2xl text-sm text-ink-muted">
            Arraste os cards entre as etapas. Cada etapa tem requisitos: qualidade e preço para ficar pronto, estoque e endereço para publicar.
          </p>
        </header>
        <PipelineBoard products={products} />
      </section>

      <section aria-labelledby="store-title" className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="store-title" className="font-display text-lg font-semibold">
              Prévia da loja virtual
            </h2>
            <p className="text-sm text-ink-muted">Passe o mouse para inclinar; clique para ver canais e tags.</p>
          </div>
          <p className="text-sm text-ink-muted">
            {published.length} {published.length === 1 ? "produto" : "produtos"} à venda, {formatBRL(publishedValue)} em estoque
          </p>
        </header>

        {/* Browser chrome around the preview makes the "live store" framing explicit. */}
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="flex items-center gap-3 border-b border-line bg-hull px-4 py-2.5">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-void/70 px-3 py-1 font-mono text-xs text-ink-muted">
              <Lock className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{host}</span>
            </span>
          </div>
          <div className="bg-[#eef1f7] p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex items-center gap-2 font-display text-base font-semibold text-[#1d2433]">
                <ShoppingBag className="size-5 text-[#2563eb]" aria-hidden="true" />
                {settings.storeName}
              </span>
              <span className="ml-auto flex w-full max-w-60 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-[#9ca3af]" aria-hidden="true">
                <Search className="size-3.5" />
                Buscar produtos
              </span>
            </div>
            {published.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-[#cbd3e1] px-6 py-14 text-center">
                <ShoppingBag className="mb-3 size-8 animate-float text-[#94a3b8]" aria-hidden="true" />
                <p className="text-sm font-medium text-[#334155]">A vitrine está vazia</p>
                <p className="mt-1 max-w-sm text-xs text-[#64748b]">Arraste um produto pronto para a coluna Publicado. Ele aparece aqui na hora.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <AnimatePresence initial={false}>
                  {published.map((product) => (
                    <motion.li
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    >
                      <StoreCard product={product} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
