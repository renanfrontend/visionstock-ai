import { PRODUCT_STATUS_LABEL, type Product } from "../catalog/product";
import { evaluateQuality } from "../catalog/quality";
import { STOCK_STATUS_LABEL, stockStatus } from "../inventory/stock";

/** Semicolon + decimal comma: opens correctly in spreadsheet apps configured for pt-BR. */
const SEPARATOR = ";";
const BOM = "﻿";

function cell(value: string | number): string {
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const decimal = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const COLUMNS: ReadonlyArray<{ header: string; value: (product: Product) => string | number }> = [
  { header: "SKU", value: (p) => p.sku },
  { header: "Título", value: (p) => p.title },
  { header: "Categoria", value: (p) => p.category },
  { header: "Marca", value: (p) => p.brand },
  { header: "EAN", value: (p) => p.gtin },
  { header: "Preço (R$)", value: (p) => decimal(p.priceCents) },
  { header: "Custo (R$)", value: (p) => decimal(p.costCents) },
  { header: "Estoque", value: (p) => p.stock.quantity },
  { header: "Mínimo", value: (p) => p.stock.minimum },
  { header: "Situação", value: (p) => STOCK_STATUS_LABEL[stockStatus(p.stock.quantity, p.stock.minimum)] },
  { header: "Endereço", value: (p) => p.stock.binId ?? "" },
  { header: "Etapa", value: (p) => PRODUCT_STATUS_LABEL[p.status] },
  { header: "Qualidade", value: (p) => evaluateQuality(p).score },
  { header: "Cores", value: (p) => p.colors.join(", ") },
  { header: "Tags", value: (p) => p.seoTags.join(", ") },
];

export function buildCsv(products: readonly Product[]): string {
  const header = COLUMNS.map((column) => cell(column.header)).join(SEPARATOR);
  const rows = products.map((product) => COLUMNS.map((column) => cell(column.value(product))).join(SEPARATOR));
  return `${BOM}${[header, ...rows].join("\r\n")}\r\n`;
}
