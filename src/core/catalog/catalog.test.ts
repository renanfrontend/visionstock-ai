import { describe, expect, it } from "vitest";
import { makeProduct } from "../testing/product-factory";
import { formatBRL, parseBRL, toDecimalString } from "../shared/money";
import { isValidGtin } from "./gtin";
import { canTransition } from "./pipeline";
import { evaluateQuality } from "./quality";
import { generateSku, normalizeSku } from "./sku";

describe("generateSku", () => {
  it("builds category-product-sequence without accents or stop words", () => {
    expect(generateSku("Casa e Cozinha", "Caneca de cerâmica Alpha", [])).toBe("CAS-CANE-0001");
  });

  it("continues from the highest existing sequence with the same prefix", () => {
    const existing = ["CAS-CANE-0001", "CAS-CANE-0007", "MOD-MOCH-0099"];
    expect(generateSku("Casa", "Caneca térmica", existing)).toBe("CAS-CANE-0008");
  });

  it("pads short or empty parts so the format stays fixed", () => {
    expect(generateSku("", "", [])).toBe("XXX-XXXX-0001");
    expect(generateSku("", "Pá", [])).toBe("XXX-PAXX-0001");
    expect(generateSku("TV", "Kit", [])).toMatch(/^TVX-KITX-0001$/);
  });

  it("normalizes manual SKUs", () => {
    expect(normalizeSku(" cas-cañe 01 ")).toBe("CAS-CANE-01");
  });
});

describe("isValidGtin", () => {
  it("accepts codes with a correct GS1 check digit", () => {
    expect(isValidGtin("4006381333931")).toBe(true); // EAN-13
    expect(isValidGtin("96385074")).toBe(true); // EAN-8
    expect(isValidGtin("036000291452")).toBe(true); // UPC-A
  });

  it("rejects wrong check digits, letters and unsupported lengths", () => {
    expect(isValidGtin("4006381333932")).toBe(false);
    expect(isValidGtin("40063813339A1")).toBe(false);
    expect(isValidGtin("12345")).toBe(false);
    expect(isValidGtin("")).toBe(false);
  });
});

describe("money", () => {
  it("parses Brazilian formatted amounts into cents", () => {
    expect(parseBRL("1.234,56")).toBe(123456);
    expect(parseBRL("R$ 49,9")).toBe(4990);
    expect(parseBRL("10")).toBe(1000);
  });

  it("rejects malformed amounts", () => {
    expect(parseBRL("12,345")).toBeNull();
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("-5")).toBeNull();
    expect(parseBRL("")).toBeNull();
  });

  it("formats for display and for feeds", () => {
    expect(formatBRL(4990).replace(/\s/g, " ")).toBe("R$ 49,90");
    expect(toDecimalString(4990)).toBe("49.90");
  });
});

describe("evaluateQuality", () => {
  it("scores a complete product at 100", () => {
    const report = evaluateQuality(makeProduct());
    expect(report.score).toBe(100);
    expect(report.tier).toBe("excellent");
  });

  it("weights add up to 100", () => {
    const total = evaluateQuality(makeProduct()).checks.reduce((sum, check) => sum + check.weight, 0);
    expect(total).toBe(100);
  });

  it("flags each missing piece with a hint", () => {
    const report = evaluateQuality(makeProduct({ imageDataUrl: null, priceCents: 0, seoTags: ["caneca"] }));
    const failed = report.checks.filter((check) => !check.passed).map((check) => check.id);
    expect(failed).toEqual(expect.arrayContaining(["photo", "price", "seo", "margin"]));
    expect(report.score).toBe(100 - 15 - 15 - 10 - 5);
  });

  it("requires price above cost for the margin check", () => {
    const report = evaluateQuality(makeProduct({ priceCents: 1000, costCents: 1200 }));
    expect(report.checks.find((check) => check.id === "margin")?.passed).toBe(false);
  });
});

describe("canTransition", () => {
  it("lets a complete draft become ready", () => {
    expect(canTransition(makeProduct(), "ready")).toEqual({ allowed: true });
  });

  it("blocks readiness below the quality threshold and explains why", () => {
    const result = canTransition(makeProduct({ title: "Caneca", description: "", seoTags: [], imageDataUrl: null }), "ready");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reasons[0]).toMatch(/Qualidade do cadastro em \d+%/);
  });

  it("requires stock and a bin address to publish", () => {
    const result = canTransition(makeProduct({ status: "ready", stock: { quantity: 0, minimum: 5, binId: null } }), "published");
    expect(result).toEqual({
      allowed: false,
      reasons: ["Não há saldo em estoque para vender.", "Enderece o produto no armazém antes de publicar."],
    });
  });

  it("applies every gate when skipping straight from draft to published", () => {
    const result = canTransition(makeProduct({ priceCents: 0, stock: { quantity: 3, minimum: 1, binId: "A-1-01" } }), "published");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reasons).toContain("Defina o preço de venda.");
  });

  it("always allows moving backwards", () => {
    expect(canTransition(makeProduct({ status: "published", priceCents: 0 }), "draft")).toEqual({ allowed: true });
  });
});
