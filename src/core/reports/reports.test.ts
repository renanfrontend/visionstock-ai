import { describe, expect, it } from "vitest";
import { makeProduct } from "../testing/product-factory";
import { buildCsv } from "./csv";
import { summarize } from "./summary";
import { buildInventoryXml, buildMerchantFeedXml, escapeXml } from "./xml";

const products = [
  makeProduct({ status: "published", stock: { quantity: 40, minimum: 10, binId: "A-1-01" } }),
  makeProduct({
    id: "prd-002",
    sku: "MOD-MOCH-0001",
    title: 'Mochila Urbana Beta 20L "Impermeável" & leve',
    gtin: "",
    brand: "",
    status: "draft",
    priceCents: 18990,
    costCents: 7400,
    stock: { quantity: 3, minimum: 5, binId: null },
  }),
];

describe("escapeXml", () => {
  it("escapes markup characters and strips forbidden control chars", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>\u0001`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;");
  });
});

describe("summarize", () => {
  it("aggregates units, valuation and alerts", () => {
    expect(summarize(products)).toMatchObject({
      skus: 2,
      units: 43,
      stockCostCents: 40 * 1850 + 3 * 7400,
      stockValueCents: 40 * 4990 + 3 * 18990,
      lowStock: 1,
      outOfStock: 0,
      unallocated: 1,
      published: 1,
    });
  });

  it("handles an empty catalog", () => {
    expect(summarize([])).toMatchObject({ skus: 0, averageQuality: 0 });
  });
});

describe("buildInventoryXml", () => {
  const xml = buildInventoryXml(products, { storeName: "AcmeCorp", generatedAt: "2026-10-05T15:00:00.000Z" });

  it("declares UTF-8 and includes the summary", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<inventario loja="AcmeCorp" gerado_em="2026-10-05T15:00:00.000Z" total_skus="2">');
    expect(xml).toContain('abaixo_minimo="1"');
  });

  it("escapes user content", () => {
    expect(xml).toContain("Mochila Urbana Beta 20L &quot;Impermeável&quot; &amp; leve");
  });

  it("omits empty optional attributes", () => {
    expect(xml).toContain('<estoque quantidade="3" minimo="5" situacao="low"/>');
  });

  it("is well-formed", () => {
    expect(() => assertWellFormed(xml)).not.toThrow();
  });
});

describe("buildMerchantFeedXml", () => {
  const feed = buildMerchantFeedXml(products, { storeName: "AcmeCorp", storeUrl: "https://loja.acmecorp.com.br/" });

  it("includes only published products", () => {
    expect(feed).toContain("<g:id>CAS-CANE-0001</g:id>");
    expect(feed).not.toContain("MOD-MOCH-0001");
  });

  it("uses Merchant price, availability and identifiers", () => {
    expect(feed).toContain("<g:price>49.90 BRL</g:price>");
    expect(feed).toContain("<g:availability>in_stock</g:availability>");
    expect(feed).toContain("<g:gtin>4006381333931</g:gtin>");
    expect(feed).toContain("<link>https://loja.acmecorp.com.br/produtos/caneca-de-ceramica-alpha-azul-marinho-350-ml</link>");
  });

  it("is well-formed", () => {
    expect(() => assertWellFormed(feed)).not.toThrow();
  });
});

describe("buildCsv", () => {
  const csv = buildCsv(products);

  it("starts with a BOM and uses semicolons with decimal commas", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split("\r\n")[1]).toContain(";49,90;18,50;40;10;Saudável;A-1-01;Publicado;");
  });

  it("quotes cells containing quotes", () => {
    expect(csv).toContain('"Mochila Urbana Beta 20L ""Impermeável"" & leve"');
  });
});

/** Minimal tag-balance check; enough to catch broken escaping or unclosed elements. */
function assertWellFormed(xml: string): void {
  const stack: string[] = [];
  const body = xml.replace(/<\?xml[^>]*\?>/, "");
  for (const match of body.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = match;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) throw new Error(`Unexpected </${name}>`);
    } else stack.push(name as string);
  }
  if (stack.length) throw new Error(`Unclosed: ${stack.join(", ")}`);
  if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(body)) throw new Error("Unescaped ampersand");
}
