import type { Product } from "../catalog/product";
import { evaluateQuality } from "../catalog/quality";
import { stockStatus } from "../inventory/stock";

export interface CatalogSummary {
  skus: number;
  units: number;
  /** Inventory valued at cost. */
  stockCostCents: number;
  /** Inventory valued at sale price. */
  stockValueCents: number;
  lowStock: number;
  outOfStock: number;
  unallocated: number;
  published: number;
  averageQuality: number;
}

export function summarize(products: readonly Product[]): CatalogSummary {
  const base: CatalogSummary = {
    skus: products.length,
    units: 0,
    stockCostCents: 0,
    stockValueCents: 0,
    lowStock: 0,
    outOfStock: 0,
    unallocated: 0,
    published: 0,
    averageQuality: 0,
  };
  if (products.length === 0) return base;

  let qualitySum = 0;
  for (const product of products) {
    const { quantity, minimum, binId } = product.stock;
    base.units += quantity;
    base.stockCostCents += quantity * product.costCents;
    base.stockValueCents += quantity * product.priceCents;
    const status = stockStatus(quantity, minimum);
    if (status === "low") base.lowStock += 1;
    if (status === "out") base.outOfStock += 1;
    if (!binId) base.unallocated += 1;
    if (product.status === "published") base.published += 1;
    qualitySum += evaluateQuality(product).score;
  }
  base.averageQuality = Math.round(qualitySum / products.length);
  return base;
}
