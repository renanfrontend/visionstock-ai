"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import { Flame, LocateFixed, MousePointerClick, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { allocateProduct } from "@/application/catalog/commands";
import { Kbd } from "@/components/ui/fields";
import { Odometer } from "@/components/ui/Odometer";
import { STOCK_STATUS_LABEL } from "@/core/inventory/stock";
import { checkAllocation, listBins } from "@/core/inventory/warehouse";
import { summarize } from "@/core/reports/summary";
import { useCatalog, useCatalogStore } from "../app/CatalogProvider";
import { useNavigation } from "../app/navigation";
import { formatInt } from "../shared/format";
import { AllocationQueue } from "./AllocationQueue";
import { isProductDrag, PRODUCT_DRAG_TYPE } from "./drag";
import { ProductPanel } from "./ProductPanel";
import type { BinHover } from "./scene/BinSlots";
import { HEAT_COLORS } from "./scene/layout";
import { WarehouseScene, type BinPicker } from "./scene/WarehouseScene";

const TOTAL_BINS = listBins().length;

function isTyping(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest("input, textarea, select"));
}

export function WarehouseView() {
  const store = useCatalogStore();
  const products = useCatalog((state) => state.products);
  const { focusedId, focus } = useNavigation();
  const reducedMotion = useReducedMotion() ?? false;

  const [heat, setHeat] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragHover, setDragHover] = useState<BinHover | null>(null);
  const [pointerBinId, setPointerBinId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ binId: string; at: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const pickerRef = useRef<BinPicker | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  /** Cursor position relative to the 3D stage, for the target chip that follows it. */
  const trackCursor = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) setCursor({ x: clientX - rect.left, y: clientY - rect.top });
  };

  const summary = useMemo(() => summarize(products), [products]);
  const focused = products.find((product) => product.id === focusedId) ?? null;
  const armed = products.find((product) => product.id === armedId) ?? null;
  const occupiedBins = TOTAL_BINS - listBins().filter((bin) => !products.some((p) => p.stock.binId === bin.id)).length;

  /** Validity + label for putting `productId` into `binId`; drives the green/red highlight. */
  const describeTarget = useCallback(
    (productId: string, binId: string): BinHover => {
      const product = products.find((p) => p.id === productId);
      if (!product) return { binId, valid: false, label: binId };
      if (product.stock.binId === binId) return { binId, valid: true, label: `${binId}: endereço atual` };
      const check = checkAllocation(product, binId, products);
      if (check.allowed) return { binId, valid: true, label: `${binId} livre` };
      const occupant = products.find((p) => p.stock.binId === binId);
      return { binId, valid: false, label: occupant ? `${binId} ocupado: ${occupant.sku}` : `${binId}: acima da capacidade` };
    },
    [products],
  );

  // Hover shown in the scene: the drag target, or the pointer target while a product is armed.
  const hover = dragHover ?? (armedId && pointerBinId ? describeTarget(armedId, pointerBinId) : null);

  const tryAllocate = useCallback(
    (productId: string, binId: string) => {
      const result = store.run((state, ctx) => allocateProduct(state, productId, binId, ctx));
      if (result.ok) {
        setArmedId(null);
        focus(productId);
      } else {
        setFlash({ binId, at: performance.now() });
      }
    },
    [store, focus],
  );

  const onBinClick = useCallback(
    (binId: string) => {
      if (armedId) return tryAllocate(armedId, binId);
      const occupant = products.find((p) => p.stock.binId === binId);
      focus(occupant?.id ?? null);
    },
    [armedId, products, focus, tryAllocate],
  );

  // HTML5 drag from the queue onto the canvas: raycast at the cursor to find the bin.
  const onDragOver = (event: DragEvent) => {
    if (!isProductDrag(event) || !draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    trackCursor(event.clientX, event.clientY);
    const binId = pickerRef.current?.(event.clientX, event.clientY) ?? null;
    if (!binId) {
      if (dragHover) setDragHover(null);
      return;
    }
    if (dragHover?.binId !== binId) setDragHover(describeTarget(draggingId, binId));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const productId = event.dataTransfer.getData(PRODUCT_DRAG_TYPE) || draggingId;
    const binId = pickerRef.current?.(event.clientX, event.clientY) ?? null;
    setDragHover(null);
    setDraggingId(null);
    if (productId && binId) tryAllocate(productId, binId);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "h") setHeat((value) => !value);
      else if (key === "r") setResetSignal((n) => n + 1);
      else if (key === "escape") {
        setArmedId(null);
        focus(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  const stats = [
    { label: "Endereços ocupados", value: `${occupiedBins}/${TOTAL_BINS}`, tone: "text-ink" },
    { label: "Unidades", value: formatInt(summary.units), tone: "text-ink" },
    { label: "Abaixo do mínimo", value: String(summary.lowStock), tone: summary.lowStock ? "text-amber" : "text-ink" },
    { label: "Sem estoque", value: String(summary.outOfStock), tone: summary.outOfStock ? "text-ember" : "text-ink" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Armazém</h1>
          <p className="max-w-xl text-sm text-ink-muted">Arraste os produtos da fila até as prateleiras. Cada endereço guarda um SKU, e as caixas mostram o volume em estoque.</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-ink-faint">{stat.label}</dt>
              <dd className={`font-display text-xl font-semibold ${stat.tone}`}>
                <Odometer value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <AllocationQueue
          products={products}
          draggingId={draggingId}
          armedId={armedId}
          focusedId={focusedId}
          onDragStart={(id) => {
            setDraggingId(id);
            setArmedId(null);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDragHover(null);
          }}
          onArm={(id) => setArmedId((current) => (current === id ? null : id))}
          onFocus={(id) => focus(id)}
        />

        <div className="space-y-4">
          <div
            ref={stageRef}
            onPointerMove={(event) => armedId && trackCursor(event.clientX, event.clientY)}
            className={`relative h-[420px] overflow-hidden rounded-2xl border bg-model transition-[border-color,box-shadow] duration-300 sm:h-[540px] xl:h-[620px] ${
              draggingId || armed ? "border-ice/70 shadow-[0_0_0_4px_rgb(110_231_249/0.12),0_0_40px_-10px_var(--color-ice)]" : "border-line"
            }`}
            onDragOver={onDragOver}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragHover(null);
            }}
            onDrop={onDrop}
          >
            <WarehouseScene
              products={products}
              heat={heat}
              selectedId={focusedId}
              selectedBinId={focused?.stock.binId ?? null}
              armed={Boolean(armed)}
              hover={hover}
              pointerBinId={pointerBinId}
              flash={flash}
              resetSignal={resetSignal}
              reducedMotion={reducedMotion}
              pickerRef={pickerRef}
              onBinClick={onBinClick}
              onBinPointer={setPointerBinId}
            />

            <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
              {armed ? (
                <p className="pointer-events-auto flex items-center gap-2 rounded-lg bg-[#1d3a5f] px-3 py-2 text-sm text-white shadow-lg" role="status">
                  <MousePointerClick className="size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Toque numa prateleira livre para guardar <b className="font-medium">{armed.sku}</b>
                  </span>
                  <button type="button" onClick={() => setArmedId(null)} className="ml-1 grid size-6 place-items-center rounded hover:bg-white/10" aria-label="Cancelar endereçamento">
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </p>
              ) : draggingId ? (
                <p className="rounded-lg bg-[#1d3a5f] px-3 py-2 text-sm text-white shadow-lg" role="status">
                  Solte sobre uma prateleira verde
                </p>
              ) : (
                <span />
              )}
              <div className="pointer-events-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setHeat((value) => !value)}
                  aria-pressed={heat}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors ${
                    heat ? "border-[#e8a33c] bg-[#f6b34f] text-[#3d2604]" : "border-[#c2d0e4] bg-white/90 text-[#345779] hover:bg-white"
                  }`}
                >
                  <Flame className="size-4" aria-hidden="true" />
                  Camada de estoque
                  <span className="hidden sm:inline">
                    <Kbd>H</Kbd>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetSignal((n) => n + 1)}
                  className="grid size-9 place-items-center rounded-lg border border-[#c2d0e4] bg-white/90 text-[#345779] shadow-sm hover:bg-white"
                  aria-label="Recentrar câmera (R)"
                  title="Recentrar câmera (R)"
                >
                  <LocateFixed className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Target chip: follows the cursor and says whether the bin under it accepts the product. */}
            {hover && cursor ? (
              <span
                className={`pointer-events-none absolute z-10 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg ${
                  hover.valid ? "bg-[#15803d]" : "bg-[#b91c1c]"
                }`}
                style={{ left: cursor.x + 16, top: cursor.y + 16 }}
                role="status"
              >
                {hover.label}
              </span>
            ) : null}

            {heat ? (
              <ul className="absolute bottom-3 left-3 flex gap-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-[#354766] shadow-sm" aria-label="Legenda da camada de estoque">
                {(["ok", "low", "out"] as const).map((status) => (
                  <li key={status} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ background: HEAT_COLORS[status] }} aria-hidden="true" />
                    {STOCK_STATUS_LABEL[status]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="absolute bottom-3 left-3 hidden rounded-lg bg-white/85 px-3 py-1.5 text-xs text-[#526d8e] sm:block">
                Arraste para girar, role para aproximar. <Kbd>R</Kbd> recentra, <Kbd>Esc</Kbd> limpa a seleção.
              </p>
            )}

            {/* Floating product panel over the scene on large screens */}
            <div className="pointer-events-none absolute top-16 right-3 bottom-3 hidden w-[340px] xl:block">
              <AnimatePresence>
                {focused ? (
                  <div key={focused.id} className="pointer-events-auto h-full">
                    <ProductPanel product={focused} products={products} onClose={() => focus(null)} onAllocated={() => undefined} />
                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {/* Same panel below the scene on smaller screens */}
          <div className="xl:hidden">
            <AnimatePresence>
              {focused ? (
                <ProductPanel key={focused.id} product={focused} products={products} onClose={() => focus(null)} onAllocated={() => undefined} />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
