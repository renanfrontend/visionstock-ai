import { isValidGtin } from "./gtin";
import type { Product } from "./product";

export type QualityCheckId =
  | "photo"
  | "title"
  | "description"
  | "category"
  | "colors"
  | "seo"
  | "price"
  | "margin"
  | "brand"
  | "gtin";

export interface QualityCheck {
  id: QualityCheckId;
  label: string;
  hint: string;
  weight: number;
  passed: boolean;
}

export type QualityTier = "excellent" | "good" | "fair" | "incomplete";

export interface QualityReport {
  score: number;
  tier: QualityTier;
  checks: QualityCheck[];
}

export const QUALITY_TIER_LABEL: Readonly<Record<QualityTier, string>> = {
  excellent: "Excelente",
  good: "Bom",
  fair: "Regular",
  incomplete: "Incompleto",
};

/** Thresholds shared by the pipeline rules and the quality meter. */
export const QUALITY_READY_THRESHOLD = 70;
export const QUALITY_EXCELLENT_THRESHOLD = 90;

type QualitySubject = Pick<
  Product,
  "imageDataUrl" | "title" | "description" | "category" | "colors" | "seoTags" | "priceCents" | "costCents" | "brand" | "gtin"
>;

interface Rule {
  id: QualityCheckId;
  label: string;
  hint: string;
  weight: number;
  test: (product: QualitySubject) => boolean;
}

/** Weights add up to 100. Ordered by impact on conversion in a storefront. */
const RULES: readonly Rule[] = [
  { id: "photo", label: "Foto do produto", hint: "Adicione uma foto nítida, de preferência com fundo limpo.", weight: 15, test: (p) => Boolean(p.imageDataUrl) },
  {
    id: "title",
    label: "Título descritivo",
    hint: "Use entre 20 e 120 caracteres com tipo, material e diferencial.",
    weight: 15,
    test: (p) => p.title.trim().length >= 20 && p.title.trim().length <= 120,
  },
  {
    id: "description",
    label: "Descrição completa",
    hint: "Escreva pelo menos 80 caracteres sobre uso, material e medidas.",
    weight: 15,
    test: (p) => p.description.trim().length >= 80,
  },
  { id: "price", label: "Preço de venda", hint: "Informe o preço de venda.", weight: 15, test: (p) => p.priceCents > 0 },
  { id: "category", label: "Categoria", hint: "Defina a categoria para a navegação da loja.", weight: 10, test: (p) => p.category.trim().length > 0 },
  { id: "seo", label: "5 tags de SEO", hint: "Complete as 5 tags de busca.", weight: 10, test: (p) => p.seoTags.length === 5 },
  { id: "colors", label: "Cores", hint: "Informe pelo menos uma cor para os filtros.", weight: 5, test: (p) => p.colors.length > 0 },
  {
    id: "margin",
    label: "Margem positiva",
    hint: "Informe o custo e mantenha o preço acima dele.",
    weight: 5,
    test: (p) => p.costCents > 0 && p.priceCents > p.costCents,
  },
  { id: "brand", label: "Marca", hint: "Informe a marca; feeds de loja usam esse campo.", weight: 5, test: (p) => p.brand.trim().length > 0 },
  { id: "gtin", label: "EAN válido", hint: "Informe um código de barras GTIN/EAN com dígito verificador correto.", weight: 5, test: (p) => isValidGtin(p.gtin) },
];

function tierFor(score: number): QualityTier {
  if (score >= QUALITY_EXCELLENT_THRESHOLD) return "excellent";
  if (score >= QUALITY_READY_THRESHOLD) return "good";
  if (score >= 40) return "fair";
  return "incomplete";
}

export function evaluateQuality(product: QualitySubject): QualityReport {
  const checks = RULES.map(({ test, ...rule }) => ({ ...rule, passed: test(product) }));
  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
  return { score, tier: tierFor(score), checks };
}
