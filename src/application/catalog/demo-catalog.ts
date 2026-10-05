import type { Product } from "@/core/catalog/product";
import type { StockMovement } from "@/core/inventory/stock";
import { CATALOG_STATE_VERSION, DEFAULT_SETTINGS, type CatalogState } from "./catalog-state";
import { illustration, type IllustrationKind } from "./demo-illustrations";

interface Seed {
  sku: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  gtin: string;
  colors: string[];
  seoTags: string[];
  price: number;
  cost: number;
  weight: number;
  quantity: number;
  minimum: number;
  binId: string | null;
  status: Product["status"];
  art: [IllustrationKind, string, string, string];
}

/**
 * Fictitious catalog covering every state the UI must handle: allocated and
 * unallocated, healthy/low/out of stock, complete and incomplete records.
 */
const SEEDS: readonly Seed[] = [
  {
    sku: "CAS-CANE-0001",
    title: "Caneca de cerâmica Alpha azul-marinho 350 ml",
    description: "Caneca de cerâmica esmaltada com faixa dourada próxima à borda, alça ergonômica e acabamento brilhante. Vai ao micro-ondas e à lava-louças.",
    category: "Casa e Cozinha > Canecas",
    brand: "Linha Alpha",
    gtin: "7891000001011",
    colors: ["Azul-marinho", "Dourado"],
    seoTags: ["caneca", "ceramica", "cafe", "azul-marinho", "presente"],
    price: 4990,
    cost: 1850,
    weight: 380,
    quantity: 40,
    minimum: 10,
    binId: "A-1-01",
    status: "ready",
    art: ["mug", "#1e3a8a", "#d4a64a", "#e8eefb"],
  },
  {
    sku: "MOD-MOCH-0001",
    title: "Mochila urbana Beta 20 L impermeável com bolso para notebook",
    description: "Mochila em poliéster com revestimento impermeável, bolso acolchoado para notebook de até 15,6 polegadas e alças reguláveis com espuma respirável.",
    category: "Moda > Mochilas",
    brand: "Urbano Beta",
    gtin: "7891000002025",
    colors: ["Grafite", "Laranja"],
    seoTags: ["mochila", "notebook", "impermeavel", "urbana", "trabalho"],
    price: 18990,
    cost: 7400,
    weight: 720,
    quantity: 12,
    minimum: 5,
    binId: "A-2-02",
    status: "ready",
    art: ["backpack", "#374151", "#f97316", "#f3f4f6"],
  },
  {
    sku: "CAL-TENI-0001",
    title: "Tênis de corrida Gama em malha respirável com amortecimento",
    description: "Tênis leve com cabedal em malha respirável, entressola com amortecimento em EVA e solado de borracha com tração para asfalto e esteira.",
    category: "Calçados > Esportivos",
    brand: "Gama Run",
    gtin: "7891000003039",
    colors: ["Verde-água", "Branco"],
    seoTags: ["tenis", "corrida", "academia", "respiravel", "esporte"],
    price: 34990,
    cost: 14000,
    weight: 560,
    quantity: 4,
    minimum: 6,
    binId: "B-1-01",
    status: "ready",
    art: ["sneaker", "#14b8a6", "#f8fafc", "#e6f6f4"],
  },
  {
    sku: "CAS-LUMI-0001",
    title: "Luminária de mesa Delta articulada com LED",
    description: "Luminária articulada com braço de alumínio, cúpula orientável e LED de baixo consumo em luz neutra, ideal para escritório e estudos.",
    category: "Casa e Cozinha > Iluminação",
    brand: "",
    gtin: "",
    colors: ["Preto"],
    seoTags: ["luminaria", "mesa", "led", "escritorio", "estudo"],
    price: 15990,
    cost: 6200,
    weight: 1100,
    quantity: 25,
    minimum: 5,
    binId: "B-2-03",
    status: "draft",
    art: ["lamp", "#111827", "#6b7280", "#f5f5f4"],
  },
  {
    sku: "ESP-GARR-0001",
    title: "Garrafa térmica Ômega em aço inox 750 ml",
    description: "Garrafa com parede dupla a vácuo que mantém bebidas geladas por 24 horas e quentes por 12 horas. Tampa rosqueável à prova de vazamento.",
    category: "Esporte e Lazer > Garrafas",
    brand: "Ômega",
    gtin: "7891000005057",
    colors: ["Aço escovado", "Azul-petróleo"],
    seoTags: ["garrafa", "termica", "inox", "academia", "trilha"],
    price: 12990,
    cost: 4300,
    weight: 410,
    quantity: 60,
    minimum: 15,
    binId: "C-1-02",
    status: "ready",
    art: ["bottle", "#0e7490", "#cbd5e1", "#ecfeff"],
  },
  {
    sku: "ELE-FONE-0001",
    title: "Fone de ouvido Sigma sem fio com cancelamento de ruído",
    description: "Fone over-ear com conexão Bluetooth, cancelamento ativo de ruído, até 30 horas de bateria e almofadas em espuma com memória.",
    category: "Eletrônicos > Áudio",
    brand: "Sigma Audio",
    gtin: "7891000006061",
    colors: ["Preto fosco"],
    seoTags: ["fone", "bluetooth", "cancelamento", "ruido", "audio"],
    price: 39990,
    cost: 18500,
    weight: 260,
    quantity: 0,
    minimum: 3,
    binId: null,
    status: "draft",
    art: ["headphones", "#1f2937", "#8b5cf6", "#f1f0fb"],
  },
  {
    sku: "CAS-VASO-0001",
    title: "Vaso Kappa",
    description: "Vaso de cerâmica.",
    category: "Casa e Cozinha > Decoração",
    brand: "",
    gtin: "",
    colors: ["Terracota"],
    seoTags: ["vaso"],
    price: 0,
    cost: 2100,
    weight: 900,
    quantity: 18,
    minimum: 4,
    binId: null,
    status: "draft",
    art: ["vase", "#c2410c", "#fdba74", "#fdf2ea"],
  },
  {
    sku: "PAP-CADE-0001",
    title: "Caderno Lambda pontilhado A5 com capa dura",
    description: "Caderno com 160 páginas pontilhadas em papel 90 g/m², capa dura revestida, elástico de fechamento e marcador de página em fita.",
    category: "Papelaria > Cadernos",
    brand: "Lambda",
    gtin: "7891000008089",
    colors: ["Verde-oliva"],
    seoTags: ["caderno", "pontilhado", "bullet", "journal", "a5"],
    price: 5990,
    cost: 2200,
    weight: 320,
    quantity: 120,
    minimum: 20,
    binId: "C-3-04",
    status: "ready",
    art: ["notebook", "#4d7c0f", "#a3e635", "#f4f8ec"],
  },
];

export function buildDemoCatalog(now: string): CatalogState {
  const products: Product[] = SEEDS.map((seed, index) => {
    const [kind, main, accent, background] = seed.art;
    return {
      id: `demo-${String(index + 1).padStart(2, "0")}`,
      sku: seed.sku,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      brand: seed.brand,
      gtin: seed.gtin,
      colors: seed.colors,
      seoTags: seed.seoTags,
      priceCents: seed.price,
      costCents: seed.cost,
      weightGrams: seed.weight,
      imageDataUrl: illustration(kind, main, accent, background),
      mediaKind: "photo",
      status: seed.status,
      channels: [],
      stock: { quantity: seed.quantity, minimum: seed.minimum, binId: seed.binId },
      source: "manual",
      aiModel: null,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };
  });

  const movements: StockMovement[] = products
    .filter((product) => product.stock.quantity > 0)
    .map((product) => ({
      id: `mov-${product.id}`,
      productId: product.id,
      type: "entrada",
      quantity: product.stock.quantity,
      before: 0,
      after: product.stock.quantity,
      note: "Carga inicial da demonstração",
      at: now,
    }));

  return { version: CATALOG_STATE_VERSION, products, movements, settings: DEFAULT_SETTINGS };
}
