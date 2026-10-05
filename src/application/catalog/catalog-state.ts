import { z } from "zod";
import { ProductSchema, type Product } from "@/core/catalog/product";
import { MOVEMENT_TYPES, type StockMovement } from "@/core/inventory/stock";

export const CATALOG_STATE_VERSION = 2;

export const StoreSettingsSchema = z.object({
  storeName: z.string().min(1).max(80),
  storeUrl: z.string().url(),
});
export type StoreSettings = z.infer<typeof StoreSettingsSchema>;

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "AcmeCorp",
  storeUrl: "https://loja.acmecorp.com.br",
};

const StockMovementSchema = z.object({
  id: z.string(),
  productId: z.string(),
  type: z.enum(MOVEMENT_TYPES),
  quantity: z.number().int().nonnegative(),
  before: z.number().int().nonnegative(),
  after: z.number().int().nonnegative(),
  note: z.string().max(200),
  at: z.string(),
}) satisfies z.ZodType<StockMovement>;

export const CatalogStateSchema = z.object({
  version: z.literal(CATALOG_STATE_VERSION),
  products: z.array(ProductSchema),
  movements: z.array(StockMovementSchema),
  settings: StoreSettingsSchema,
});

export interface CatalogState {
  version: typeof CATALOG_STATE_VERSION;
  products: Product[];
  movements: StockMovement[];
  settings: StoreSettings;
}

export const EMPTY_CATALOG: CatalogState = {
  version: CATALOG_STATE_VERSION,
  products: [],
  movements: [],
  settings: DEFAULT_SETTINGS,
};
