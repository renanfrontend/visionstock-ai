"use client";

import { ArrowDown, ArrowUp, MapPin, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteProduct } from "@/application/catalog/commands";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PRODUCT_STATUS_LABEL, type Product, type ProductStatus } from "@/core/catalog/product";
import { evaluateQuality } from "@/core/catalog/quality";
import { stockStatus } from "@/core/inventory/stock";
import { formatBRL } from "@/core/shared/money";
import { stripAccents } from "@/core/shared/text";
import { useCatalogStore } from "../app/CatalogProvider";
import { useNavigation } from "../app/navigation";
import { ProductThumb } from "../shared/ProductThumb";
import { StockBadge } from "../shared/StockBadge";

type Filter = "all" | ProductStatus | "low";
type SortKey = "sku" | "title" | "stock" | "price" | "quality";

const FILTERS: ReadonlyArray<[Filter, string]> = [
  ["all", "Todos"],
  ["draft", PRODUCT_STATUS_LABEL.draft],
  ["ready", "Prontos"],
  ["published", "Publicados"],
  ["low", "Repor estoque"],
];

const normalize = (value: string) => stripAccents(value).toLowerCase();

export function ProductTable({ products }: { products: readonly Product[] }) {
  const store = useCatalogStore();
  const { edit, focus } = useNavigation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "sku", dir: 1 });

  const rows = useMemo(() => {
    const term = normalize(query.trim());
    const withQuality = products.map((product) => ({ product, quality: evaluateQuality(product).score }));
    const filtered = withQuality.filter(({ product }) => {
      if (filter === "low" && stockStatus(product.stock.quantity, product.stock.minimum) === "ok") return false;
      if (filter !== "all" && filter !== "low" && product.status !== filter) return false;
      return !term || normalize(`${product.title} ${product.sku} ${product.category} ${product.brand}`).includes(term);
    });
    const value = (row: (typeof withQuality)[number]): string | number => {
      switch (sort.key) {
        case "sku":
          return row.product.sku;
        case "title":
          return normalize(row.product.title);
        case "stock":
          return row.product.stock.quantity;
        case "price":
          return row.product.priceCents;
        case "quality":
          return row.quality;
      }
    };
    return filtered.sort((a, b) => (value(a) > value(b) ? sort.dir : value(a) < value(b) ? -sort.dir : 0));
  }, [products, query, filter, sort]);

  const header = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === key;
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
        <button
          type="button"
          onClick={() => setSort((current) => ({ key, dir: current.key === key ? (current.dir === 1 ? -1 : 1) : 1 }))}
          className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {label}
          {active ? sort.dir === 1 ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" /> : null}
        </button>
      </th>
    );
  };

  return (
    <section aria-labelledby="table-title" className="glass overflow-hidden rounded-2xl">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 id="table-title" className="font-display text-base font-semibold">
          Produtos
        </h2>
        <span className="font-mono text-xs text-ink-faint">
          {rows.length} de {products.length}
        </span>
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Buscar produtos</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, SKU, categoria" className="field !py-1.5 !pl-9 text-sm" />
        </label>
      </header>
      <div role="radiogroup" aria-label="Filtrar produtos" className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors ${
              filter === value ? "border-ice/50 bg-ice/10 text-ice" : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {/* relative: keeps absolutely positioned sr-only text inside the scroll container's clip. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="text-xs text-ink-muted">
            <tr className="border-b border-line">
              {header("title", "Produto")}
              {header("sku", "SKU")}
              <th scope="col" className="px-3 py-2.5 text-left font-medium">
                Etapa
              </th>
              {header("price", "Preço", "right")}
              {header("stock", "Estoque", "right")}
              {header("quality", "Qualidade", "right")}
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, quality }) => (
              <tr key={product.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.025]">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <ProductThumb src={product.imageDataUrl} alt="" className="size-9" />
                    <div className="min-w-0">
                      <p className="max-w-[320px] truncate text-ink">{product.title}</p>
                      <p className="truncate text-xs text-ink-faint">{product.category || "Sem categoria"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{product.sku}</td>
                <td className="px-3 py-2.5 text-xs text-ink-muted">{PRODUCT_STATUS_LABEL[product.status]}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-ink">{product.priceCents ? formatBRL(product.priceCents) : "—"}</td>
                <td className="px-3 py-2.5 text-right">
                  <StockBadge quantity={product.stock.quantity} minimum={product.stock.minimum} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="ml-auto flex w-24 items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className={`block h-full rounded-full ${quality >= 90 ? "bg-mint" : quality >= 70 ? "bg-ice" : quality >= 40 ? "bg-amber" : "bg-ember"}`}
                        style={{ width: `${quality}%` }}
                      />
                    </span>
                    <span className="w-7 text-right font-mono text-xs text-ink-muted">{quality}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => edit(product.id)} className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-white/5 hover:text-ink" aria-label={`Editar ${product.sku}`} title="Editar">
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => focus(product.id)} className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-white/5 hover:text-ink" aria-label={`Ver ${product.sku} no armazém`} title="Ver no armazém">
                      <MapPin className="size-4" aria-hidden="true" />
                    </button>
                    <ConfirmButton
                      icon={Trash2}
                      size="sm"
                      variant="ghost"
                      label=""
                      ariaLabel={`Excluir ${product.sku}`}
                      confirmLabel="Excluir?"
                      onConfirm={() => store.run((state) => deleteProduct(state, product.id))}
                      className="!px-2"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                  Nenhum produto com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
