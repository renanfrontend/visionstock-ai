import { z } from "zod";

/**
 * Domain contract for a product draft produced by the vision model.
 * Shared by the API route (validation) and the client (typing + editing).
 */
export const SEO_TAG_COUNT = 5 as const;

export const ProductDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  category: z.string().trim().min(1).max(120),
  colors: z.array(z.string().trim().min(1).max(40)).max(12),
  seoTags: z.array(z.string().trim().min(1).max(60)).max(SEO_TAG_COUNT),
});

export type ProductDraft = z.infer<typeof ProductDraftSchema>;

export type ProductDraftListField = keyof Pick<ProductDraft, "colors" | "seoTags">;
export type ProductDraftTextField = Exclude<keyof ProductDraft, ProductDraftListField>;
