"use client";

import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, MapPin, Pencil, Scale, Store, Unlock, X } from "lucide-react";
import { useMemo, useState } from "react";
import { allocateProduct, moveStock, releaseBin } from "@/application/catalog/commands";
import { Button } from "@/components/ui/Button";
import { StepperField } from "@/components/ui/fields";
import { Odometer } from "@/components/ui/Odometer";
import { PRODUCT_STATUS_LABEL, type Product } from "@/core/catalog/product";
import { MOVEMENT_LABEL, STOCK_STATUS_LABEL, stockStatus, type MovementType } from "@/core/inventory/stock";
import { checkAllocation, formatBin, listBins } from "@/core/inventory/warehouse";
import { useCatalog, useCatalogStore } from "../app/CatalogProvider";
import { useNavigation } from "../app/navigation";
import { formatInt, relativeTime } from "../shared/format";
import { ProductThumb } from "../shared/ProductThumb";

const MOVE_TYPES: ReadonlyArray<{ type: MovementType; icon: typeof Scale }> = [
  { type: "entrada", icon: ArrowDownToLine },
  { type: "saida", icon: ArrowUpFromLine },
  { type: "ajuste", icon: Scale },
];

const STATUS_TONE = { ok: "text-mint", low: "text-amber", out: "text-ember" } as const;

interface ProductPanelProps {
  product: Product;
  products: readonly Product[];
  onClose: () => void;
  onAllocated: () => void;
}

export function ProductPanel({ product, products, onClose, onAllocated }: ProductPanelProps) {
  const store = useCatalogStore();
  const { edit, go } = useNavigation();
  const movements = useCatalog((state) => state.movements);
  const history = useMemo(() => movements.filter((m) => m.productId === product.id).slice(0, 6), [movements, product.id]);

  const [type, setType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState(10);
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("");
  const [shake, setShake] = useState(0);

  const status = stockStatus(product.stock.quantity, product.stock.minimum);
  const freeBins = useMemo(() => listBins().filter((bin) => checkAllocation(product, bin.id, products).allowed), [product, products]);

  const register = () => {
    const result = store.run((state, ctx) => moveStock(state, product.id, type, quantity, note, ctx));
    if (result.ok) setNote("");
    else setShake((n) => n + 1);
  };

  const allocate = () => {
    if (!target) return;
    const result = store.run((state, ctx) => allocateProduct(state, product.id, target, ctx));
    if (result.ok) onAllocated();
  };

  return (
    <motion.section
      aria-labelledby="panel-product-title"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-line bg-[#0b0f22] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.75)]"
    >
      <header className="flex items-start gap-3 border-b border-line p-4">
        <ProductThumb src={product.imageDataUrl} alt="" className="size-14" />
        <div className="min-w-0 flex-1">
          <h2 id="panel-product-title" className="line-clamp-2 text-sm font-medium text-ink">
            {product.title}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{product.sku}</p>
          <p className="mt-1 text-xs text-ink-muted">{PRODUCT_STATUS_LABEL[product.status]}</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-md text-ink-muted hover:bg-white/5 hover:text-ink" aria-label="Fechar painel do produto">
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="relative flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">Saldo em estoque</p>
            <p className={`font-display text-3xl font-semibold ${STATUS_TONE[status]}`}>
              <Odometer value={formatInt(product.stock.quantity)} /> <span className="text-sm font-normal text-ink-muted">un.</span>
            </p>
          </div>
          <div className="text-right text-xs">
            <p className={STATUS_TONE[status]}>{STOCK_STATUS_LABEL[status]}</p>
            <p className="text-ink-faint">Mínimo de {product.stock.minimum} un.</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          {product.stock.binId ? (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm text-ink">
                <MapPin className="size-4 text-ice" aria-hidden="true" />
                {formatBin(product.stock.binId)}
              </p>
              <Button
                size="sm"
                variant="ghost"
                icon={Unlock}
                onClick={() => store.run((state, ctx) => releaseBin(state, product.id, ctx))}
                title={product.status === "published" ? "Tire da vitrine antes de liberar" : undefined}
              >
                Liberar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="bin-select" className="text-xs text-ink-muted">
                Sem endereço. Escolha um livre ou arraste para a maquete:
              </label>
              <div className="flex gap-2">
                <select id="bin-select" value={target} onChange={(event) => setTarget(event.target.value)} className="field !py-1.5 text-sm">
                  <option value="">Endereço…</option>
                  {freeBins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.id} ({formatBin(bin.id)})
                    </option>
                  ))}
                </select>
                <Button size="sm" icon={MapPin} onClick={allocate} disabled={!target}>
                  Endereçar
                </Button>
              </div>
            </div>
          )}
        </div>

        <fieldset key={shake} className={`space-y-3 ${shake ? "animate-shake" : ""}`}>
          <legend className="mb-2 text-xs font-medium text-ink-muted">Movimentar estoque</legend>
          <div role="radiogroup" aria-label="Tipo de movimentação" className="grid grid-cols-3 gap-1 rounded-lg border border-line p-0.5">
            {MOVE_TYPES.map(({ type: value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={type === value}
                onClick={() => setType(value)}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                  type === value ? "bg-ice/12 text-ice" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {value === "ajuste" ? "Ajuste" : MOVEMENT_LABEL[value]}
              </button>
            ))}
          </div>
          <StepperField label={type === "ajuste" ? "Saldo contado" : "Quantidade"} value={quantity} onChange={setQuantity} unit="un." step={type === "ajuste" ? 1 : 5} />
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Observação (ex.: NF 1042, pedido 588)" className="field text-sm" aria-label="Observação" />
          <Button className="w-full" onClick={register}>
            Registrar {MOVEMENT_LABEL[type].toLowerCase()}
          </Button>
        </fieldset>

        <div>
          <h3 className="mb-2 text-xs font-medium text-ink-muted">Últimas movimentações</h3>
          {history.length === 0 ? (
            <p className="text-xs text-ink-faint">Nenhuma movimentação ainda.</p>
          ) : (
            <ol className="space-y-1.5">
              {history.map((movement) => {
                const delta = movement.after - movement.before;
                return (
                  <li key={movement.id} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-2.5 py-2 text-xs">
                    <span className={`w-12 font-mono ${delta > 0 ? "text-mint" : delta < 0 ? "text-ember" : "text-ink-muted"}`}>
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">{MOVEMENT_LABEL[movement.type]}</p>
                      {movement.note ? <p className="truncate text-ink-faint">{movement.note}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-ink-muted">
                        {movement.before} → {movement.after}
                      </p>
                      <p className="text-ink-faint">{relativeTime(movement.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <footer className="flex gap-2 border-t border-line p-3">
        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => edit(product.id)} className="flex-1">
          Editar cadastro
        </Button>
        <Button variant="ghost" size="sm" icon={Store} onClick={() => go("vitrine")} className="flex-1">
          Ver na vitrine
        </Button>
      </footer>
    </motion.section>
  );
}
