import { describe, expect, it } from "vitest";
import { EMPTY_PRODUCT_INPUT, type ProductInput } from "@/core/catalog/product";
import { makeProduct } from "@/core/testing/product-factory";
import type { CatalogRepository } from "./catalog-repository";
import { CatalogStateSchema, EMPTY_CATALOG, type CatalogState } from "./catalog-state";
import { createCatalogStore } from "./catalog-store";
import {
  allocateProduct,
  createProduct,
  moveStock,
  releaseBin,
  toggleChannel,
  transitionProduct,
  updateProduct,
  type CommandContext,
} from "./commands";
import { buildDemoCatalog } from "./demo-catalog";

let seq = 0;
const ctx: CommandContext = { now: "2026-10-05T15:00:00.000Z", newId: () => `id-${++seq}` };

const input: ProductInput = {
  ...EMPTY_PRODUCT_INPUT,
  title: "Caneca de cerâmica Alpha azul-marinho 350 ml",
  category: "Casa e Cozinha",
  priceCents: 4990,
  initialQuantity: 30,
  minimumQuantity: 5,
};

const stateWith = (...products: ReturnType<typeof makeProduct>[]): CatalogState => ({ ...EMPTY_CATALOG, products });

describe("createProduct", () => {
  it("creates a draft with generated SKU and an opening stock movement", () => {
    const result = createProduct(EMPTY_CATALOG, input, { source: "ai", aiModel: "gemini-3.6-flash" }, ctx);
    expect(result.ok).toBe(true);
    const [product] = result.state.products;
    expect(product).toMatchObject({ sku: "CAS-CANE-0001", status: "draft", stock: { quantity: 30, minimum: 5, binId: null } });
    expect(result.state.movements[0]).toMatchObject({ type: "entrada", before: 0, after: 30, productId: product?.id });
  });

  it("skips the movement when there is no opening stock", () => {
    const result = createProduct(EMPTY_CATALOG, { ...input, initialQuantity: 0 }, { source: "manual", aiModel: null }, ctx);
    expect(result.state.movements).toHaveLength(0);
  });

  it("rejects duplicated SKUs and invalid EANs without touching state", () => {
    const state = stateWith(makeProduct({ sku: "CAS-CANE-0001" }));
    const duplicate = createProduct(state, { ...input, sku: "cas-cane-0001" }, { source: "manual", aiModel: null }, ctx);
    expect(duplicate).toMatchObject({ ok: false, state });
    expect(duplicate.notice.detail).toContain("já está em uso");

    const badEan = createProduct(EMPTY_CATALOG, { ...input, gtin: "7891000001012" }, { source: "manual", aiModel: null }, ctx);
    expect(badEan.ok).toBe(false);
  });
});

describe("updateProduct", () => {
  it("demotes a published product whose edit breaks the publication gates", () => {
    const published = makeProduct({ status: "published", channels: ["loja"], stock: { quantity: 10, minimum: 2, binId: "A-1-01" } });
    const edit: ProductInput = { ...published, initialQuantity: 0, minimumQuantity: 2, priceCents: 0 };
    const result = updateProduct(stateWith(published), published.id, edit, ctx);
    expect(result.ok).toBe(true);
    expect(result.state.products[0]).toMatchObject({ status: "draft", channels: [], priceCents: 0 });
    expect(result.notice.tone).toBe("info");
  });

  it("keeps the stock balance; only the minimum is editable here", () => {
    const product = makeProduct({ stock: { quantity: 40, minimum: 10, binId: null } });
    const result = updateProduct(stateWith(product), product.id, { ...product, initialQuantity: 999, minimumQuantity: 3 }, ctx);
    expect(result.state.products[0]?.stock).toEqual({ quantity: 40, minimum: 3, binId: null });
  });
});

describe("allocateProduct / releaseBin", () => {
  it("allocates to a free bin and blocks an occupied one", () => {
    const a = makeProduct({ id: "a" });
    const b = makeProduct({ id: "b", sku: "B-0001", title: "Mochila Urbana Beta", stock: { quantity: 1, minimum: 0, binId: "A-1-01" } });
    expect(allocateProduct(stateWith(a, b), "a", "A-1-02", ctx).state.products[0]?.stock.binId).toBe("A-1-02");
    const blocked = allocateProduct(stateWith(a, b), "a", "A-1-01", ctx);
    expect(blocked.ok).toBe(false);
    expect(blocked.notice.detail).toContain("Mochila Urbana Beta");
  });

  it("refuses to release the bin of a published product", () => {
    const product = makeProduct({ status: "published", stock: { quantity: 3, minimum: 1, binId: "A-1-01" } });
    expect(releaseBin(stateWith(product), product.id, ctx).ok).toBe(false);
  });
});

describe("moveStock", () => {
  it("records the movement with before/after balances", () => {
    const product = makeProduct();
    const result = moveStock(stateWith(product), product.id, "saida", 15, "Pedido 1042", ctx);
    expect(result.state.products[0]?.stock.quantity).toBe(25);
    expect(result.state.movements[0]).toMatchObject({ type: "saida", quantity: 15, before: 40, after: 25, note: "Pedido 1042" });
  });

  it("takes a published product off the storefront when it sells out", () => {
    const product = makeProduct({ status: "published", channels: ["loja"], stock: { quantity: 2, minimum: 1, binId: "A-1-01" } });
    const result = moveStock(stateWith(product), product.id, "saida", 2, "", ctx);
    expect(result.state.products[0]?.status).toBe("ready");
  });

  it("rejects issuing more than the balance", () => {
    const product = makeProduct({ stock: { quantity: 2, minimum: 1, binId: null } });
    expect(moveStock(stateWith(product), product.id, "saida", 3, "", ctx).ok).toBe(false);
  });
});

describe("transitionProduct / toggleChannel", () => {
  it("publishes with the storefront as default channel", () => {
    const product = makeProduct({ status: "ready", stock: { quantity: 5, minimum: 1, binId: "A-1-01" } });
    const result = transitionProduct(stateWith(product), product.id, "published", ctx);
    expect(result.state.products[0]).toMatchObject({ status: "published", channels: ["loja"], publishedAt: ctx.now });
  });

  it("explains every blocking rule", () => {
    const product = makeProduct({ status: "ready", stock: { quantity: 0, minimum: 1, binId: null } });
    const result = transitionProduct(stateWith(product), product.id, "published", ctx);
    expect(result.ok).toBe(false);
    expect(result.notice.detail).toContain("saldo");
    expect(result.notice.detail).toContain("Enderece");
  });

  it("keeps at least one channel on a published product", () => {
    const product = makeProduct({ status: "published", channels: ["loja"], stock: { quantity: 5, minimum: 1, binId: "A-1-01" } });
    expect(toggleChannel(stateWith(product), product.id, "loja", ctx).ok).toBe(false);
    expect(toggleChannel(stateWith(product), product.id, "marketplace", ctx).state.products[0]?.channels).toEqual(["loja", "marketplace"]);
  });
});

describe("demo catalog", () => {
  it("passes the same schema used to read browser storage", () => {
    expect(CatalogStateSchema.safeParse(buildDemoCatalog(ctx.now)).success).toBe(true);
  });

  it("uses unique SKUs and bins", () => {
    const { products } = buildDemoCatalog(ctx.now);
    expect(new Set(products.map((p) => p.sku)).size).toBe(products.length);
    const bins = products.map((p) => p.stock.binId).filter(Boolean);
    expect(new Set(bins).size).toBe(bins.length);
  });
});

describe("createCatalogStore", () => {
  class MemoryRepository implements CatalogRepository {
    saved: CatalogState | null = null;
    load() {
      return this.saved;
    }
    save(state: CatalogState) {
      this.saved = state;
      return { ok: true as const };
    }
    clear() {
      this.saved = null;
    }
  }

  it("seeds the demo, persists changes and broadcasts notices", () => {
    const repository = new MemoryRepository();
    const store = createCatalogStore({ repository, now: () => ctx.now, newId: ctx.newId });
    const notices: string[] = [];
    store.onNotice((notice) => notices.push(notice.title));
    let renders = 0;
    store.subscribe(() => renders++);

    store.run((state, c) => moveStock(state, "demo-01", "entrada", 5, "", c));
    expect(repository.saved?.products.find((p) => p.id === "demo-01")?.stock.quantity).toBe(45);
    expect(renders).toBe(1);
    expect(notices).toEqual(["Entrada registrada"]);
  });

  it("does not persist or re-render on a rejected command", () => {
    const repository = new MemoryRepository();
    const store = createCatalogStore({ repository, now: () => ctx.now, newId: ctx.newId });
    let renders = 0;
    store.subscribe(() => renders++);
    store.run((state, c) => moveStock(state, "demo-06", "saida", 1, "", c));
    expect(renders).toBe(0);
    expect(repository.saved).toBeNull();
  });
});
