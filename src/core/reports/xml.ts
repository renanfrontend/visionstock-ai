import { isValidGtin } from "../catalog/gtin";
import type { Product } from "../catalog/product";
import { evaluateQuality } from "../catalog/quality";
import { stockStatus } from "../inventory/stock";
import { toDecimalString } from "../shared/money";
import { slugify } from "../shared/text";
import { summarize } from "./summary";

/** Characters forbidden in XML 1.0 (control chars other than tab, LF, CR). */
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Attrs = Readonly<Record<string, string | number | null | undefined>>;

function attrs(values: Attrs): string {
  return Object.entries(values)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join("");
}

function element(name: string, content: string | number | null | undefined, attributes: Attrs = {}): string {
  if (content === null || content === undefined || content === "") return `<${name}${attrs(attributes)}/>`;
  return `<${name}${attrs(attributes)}>${escapeXml(String(content))}</${name}>`;
}

const indent = (lines: string[], depth: number) => lines.map((line) => `${"  ".repeat(depth)}${line}`);

export interface InventoryXmlOptions {
  storeName: string;
  generatedAt: string;
}

/** Full inventory report: every product with pricing, stock position and quality score. */
export function buildInventoryXml(products: readonly Product[], { storeName, generatedAt }: InventoryXmlOptions): string {
  const summary = summarize(products);
  const items = products.flatMap((product) => {
    const { quantity, minimum, binId } = product.stock;
    return [
      `<produto${attrs({ sku: product.sku, status: product.status, origem: product.source })}>`,
      ...indent(
        [
          element("titulo", product.title),
          element("descricao", product.description),
          element("categoria", product.category),
          element("marca", product.brand),
          element("gtin", product.gtin),
          element("preco", toDecimalString(product.priceCents), { moeda: "BRL" }),
          element("custo", toDecimalString(product.costCents), { moeda: "BRL" }),
          element("peso", product.weightGrams, { unidade: "g" }),
          `<estoque${attrs({ quantidade: quantity, minimo: minimum, situacao: stockStatus(quantity, minimum), endereco: binId })}/>`,
          element("qualidade", evaluateQuality(product).score, { escala: "0-100" }),
          "<cores>",
          ...indent(product.colors.map((color) => element("cor", color)), 1),
          "</cores>",
          "<tags>",
          ...indent(product.seoTags.map((tag) => element("tag", tag)), 1),
          "</tags>",
          "<canais>",
          ...indent(product.channels.map((channel) => element("canal", channel)), 1),
          "</canais>",
          element("atualizado_em", product.updatedAt),
        ],
        1,
      ),
      "</produto>",
    ];
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<inventario${attrs({ loja: storeName, gerado_em: generatedAt, total_skus: summary.skus })}>`,
    ...indent(
      [
        `<resumo${attrs({
          unidades: summary.units,
          valor_custo: toDecimalString(summary.stockCostCents),
          valor_venda: toDecimalString(summary.stockValueCents),
          abaixo_minimo: summary.lowStock,
          sem_estoque: summary.outOfStock,
          sem_endereco: summary.unallocated,
          publicados: summary.published,
          qualidade_media: summary.averageQuality,
        })}/>`,
        ...items,
      ],
      1,
    ),
    "</inventario>",
    "",
  ].join("\n");
}

export interface MerchantFeedOptions {
  storeName: string;
  storeUrl: string;
}

/**
 * Product feed in RSS 2.0 with the Google Merchant namespace, the de facto format
 * consumed by shopping ads and most marketplace integrators. Only published items.
 */
export function buildMerchantFeedXml(products: readonly Product[], { storeName, storeUrl }: MerchantFeedOptions): string {
  const base = storeUrl.replace(/\/+$/, "");
  const items = products
    .filter((product) => product.status === "published")
    .flatMap((product) => {
      const hasGtin = isValidGtin(product.gtin);
      const fields = [
        element("g:id", product.sku),
        element("title", product.title),
        element("description", product.description),
        element("link", `${base}/produtos/${slugify(product.title) || product.sku.toLowerCase()}`),
        element("g:image_link", `${base}/imagens/${product.sku.toLowerCase()}.jpg`),
        element("g:price", `${toDecimalString(product.priceCents)} BRL`),
        element("g:availability", product.stock.quantity > 0 ? "in_stock" : "out_of_stock"),
        element("g:condition", "new"),
        element("g:product_type", product.category),
        element("g:brand", product.brand),
        hasGtin ? element("g:gtin", product.gtin) : element("g:identifier_exists", product.brand ? "yes" : "no"),
        element("g:color", product.colors.join("/")),
        product.weightGrams > 0 ? element("g:shipping_weight", `${product.weightGrams} g`) : "",
      ].filter(Boolean);
      return ["<item>", ...indent(fields, 1), "</item>"];
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    ...indent([element("title", storeName), element("link", base), element("description", `Feed de produtos de ${storeName}`), ...items], 2),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
