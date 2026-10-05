import { z } from "zod";

export const PRODUCT_STATUSES = ["draft", "ready", "published"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABEL: Readonly<Record<ProductStatus, string>> = {
  draft: "Rascunho",
  ready: "Pronto para venda",
  published: "Publicado",
};

export const SALES_CHANNELS = ["loja", "marketplace"] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const SALES_CHANNEL_LABEL: Readonly<Record<SalesChannel, string>> = {
  loja: "Loja virtual",
  marketplace: "Marketplace",
};

const nonNegativeInt = z.number().int().nonnegative();

export const MEDIA_KINDS = ["photo", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const ProductSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1).max(40),
  title: z.string().max(160),
  description: z.string().max(2000),
  category: z.string().max(120),
  brand: z.string().max(80),
  gtin: z.string().max(14),
  colors: z.array(z.string().max(40)).max(12),
  seoTags: z.array(z.string().max(60)).max(5),
  priceCents: nonNegativeInt,
  costCents: nonNegativeInt,
  weightGrams: nonNegativeInt,
  /** Cover image (a photo, or the sharpest frame of a video). */
  imageDataUrl: z.string().nullable(),
  /** How the product was captured; videos keep only their extracted cover. */
  mediaKind: z.enum(MEDIA_KINDS).nullable(),
  status: z.enum(PRODUCT_STATUSES),
  channels: z.array(z.enum(SALES_CHANNELS)),
  stock: z.object({
    quantity: nonNegativeInt,
    minimum: nonNegativeInt,
    binId: z.string().nullable(),
  }),
  source: z.enum(["ai", "manual"]),
  aiModel: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});

export type Product = z.infer<typeof ProductSchema>;

/** Fields a person edits in the registration form. Lifecycle fields are managed by use cases. */
export type ProductInput = Pick<
  Product,
  | "title"
  | "description"
  | "category"
  | "brand"
  | "gtin"
  | "colors"
  | "seoTags"
  | "priceCents"
  | "costCents"
  | "weightGrams"
  | "imageDataUrl"
  | "mediaKind"
> & {
  sku?: string;
  initialQuantity: number;
  minimumQuantity: number;
};

export const EMPTY_PRODUCT_INPUT: ProductInput = {
  title: "",
  description: "",
  category: "",
  brand: "",
  gtin: "",
  colors: [],
  seoTags: [],
  priceCents: 0,
  costCents: 0,
  weightGrams: 0,
  imageDataUrl: null,
  mediaKind: null,
  initialQuantity: 0,
  minimumQuantity: 5,
};

export function marginPercent(product: Pick<Product, "priceCents" | "costCents">): number | null {
  if (product.priceCents <= 0 || product.costCents <= 0) return null;
  return ((product.priceCents - product.costCents) / product.priceCents) * 100;
}
