import { describe, expect, it } from "vitest";
import { makeProduct } from "../testing/product-factory";
import { applyMovement, stockStatus } from "./stock";
import { BIN_CAPACITY, boxesFor, checkAllocation, formatBin, listBins, parseBinId } from "./warehouse";

describe("warehouse addressing", () => {
  it("lists every bin once: 3 aisles × 3 levels × 4 positions", () => {
    const bins = listBins();
    expect(bins).toHaveLength(36);
    expect(new Set(bins.map((bin) => bin.id)).size).toBe(36);
    expect(bins[0]?.id).toBe("A-1-01");
  });

  it("parses valid ids and rejects out-of-range ones", () => {
    expect(parseBinId("B-2-04")).toMatchObject({ aisle: "B", level: 2, position: 4 });
    expect(parseBinId("D-1-01")).toBeNull();
    expect(parseBinId("A-4-01")).toBeNull();
    expect(parseBinId("A-1-05")).toBeNull();
  });

  it("formats a readable address", () => {
    expect(formatBin("C-3-02")).toBe("Rua C, nível 3, posição 02");
  });

  it("maps quantity to a 0–4 box stack", () => {
    expect(boxesFor(0)).toBe(0);
    expect(boxesFor(1)).toBe(1);
    expect(boxesFor(BIN_CAPACITY)).toBe(4);
    expect(boxesFor(BIN_CAPACITY * 3)).toBe(4);
  });
});

describe("checkAllocation", () => {
  const occupant = makeProduct({ id: "prd-002", title: "Mochila Urbana Beta", stock: { quantity: 5, minimum: 1, binId: "A-1-01" } });

  it("allows an empty bin", () => {
    expect(checkAllocation(makeProduct(), "A-1-02", [occupant])).toEqual({ allowed: true });
  });

  it("allows re-dropping a product on its own bin", () => {
    const self = makeProduct({ stock: { quantity: 5, minimum: 1, binId: "A-1-03" } });
    expect(checkAllocation(self, "A-1-03", [self, occupant])).toEqual({ allowed: true });
  });

  it("rejects a bin held by another SKU, naming it", () => {
    const result = checkAllocation(makeProduct(), "A-1-01", [occupant]);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("Mochila Urbana Beta");
  });

  it("rejects balances above bin capacity", () => {
    const result = checkAllocation(makeProduct({ stock: { quantity: BIN_CAPACITY + 1, minimum: 1, binId: null } }), "A-1-02", []);
    expect(result.allowed).toBe(false);
  });
});

describe("applyMovement", () => {
  it("adds receipts and subtracts issues", () => {
    expect(applyMovement(10, "entrada", 5)).toEqual({ ok: true, after: 15 });
    expect(applyMovement(10, "saida", 4)).toEqual({ ok: true, after: 6 });
  });

  it("sets the counted balance on adjustments, including zero", () => {
    expect(applyMovement(10, "ajuste", 0)).toEqual({ ok: true, after: 0 });
  });

  it("never lets the balance go negative", () => {
    expect(applyMovement(3, "saida", 4)).toMatchObject({ ok: false });
  });

  it("rejects zero, negative and fractional quantities", () => {
    expect(applyMovement(3, "entrada", 0).ok).toBe(false);
    expect(applyMovement(3, "entrada", -1).ok).toBe(false);
    expect(applyMovement(3, "entrada", 1.5).ok).toBe(false);
  });
});

describe("stockStatus", () => {
  it("classifies by balance against the minimum", () => {
    expect(stockStatus(0, 5)).toBe("out");
    expect(stockStatus(5, 5)).toBe("low");
    expect(stockStatus(6, 5)).toBe("ok");
  });
});
