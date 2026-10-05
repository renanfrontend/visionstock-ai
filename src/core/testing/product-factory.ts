import type { Product } from "../catalog/product";

/** Realistic, fully-filled product for tests; override only what the test is about. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prd-001",
    sku: "CAS-CANE-0001",
    title: "Caneca de cerâmica Alpha azul-marinho 350 ml",
    description:
      "Caneca de cerâmica esmaltada com faixa dourada próxima à borda, alça ergonômica e acabamento brilhante, ideal para café e chá.",
    category: "Casa e Cozinha > Canecas",
    brand: "Linha Alpha",
    gtin: "4006381333931",
    colors: ["Azul-marinho", "Dourado"],
    seoTags: ["caneca", "ceramica", "cafe", "azul-marinho", "presente"],
    priceCents: 4990,
    costCents: 1850,
    weightGrams: 380,
    imageDataUrl: "data:image/jpeg;base64,AAAA",
    mediaKind: "photo",
    status: "draft",
    channels: [],
    stock: { quantity: 40, minimum: 10, binId: null },
    source: "ai",
    aiModel: "gemini-3.6-flash",
    createdAt: "2026-10-05T13:00:00.000Z",
    updatedAt: "2026-10-05T13:00:00.000Z",
    publishedAt: null,
    ...overrides,
  };
}
