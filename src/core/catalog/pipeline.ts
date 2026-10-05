import type { Product, ProductStatus } from "./product";
import { evaluateQuality, QUALITY_READY_THRESHOLD } from "./quality";

export type TransitionCheck = { allowed: true } | { allowed: false; reasons: string[] };

const ORDER: Readonly<Record<ProductStatus, number>> = { draft: 0, ready: 1, published: 2 };

function readinessReasons(product: Product): string[] {
  const reasons: string[] = [];
  const { score } = evaluateQuality(product);
  if (score < QUALITY_READY_THRESHOLD) reasons.push(`Qualidade do cadastro em ${score}%; o mínimo é ${QUALITY_READY_THRESHOLD}%.`);
  if (product.priceCents <= 0) reasons.push("Defina o preço de venda.");
  return reasons;
}

function publicationReasons(product: Product): string[] {
  const reasons: string[] = [];
  if (product.stock.quantity <= 0) reasons.push("Não há saldo em estoque para vender.");
  if (!product.stock.binId) reasons.push("Enderece o produto no armazém antes de publicar.");
  return reasons;
}

/**
 * Lifecycle rules. Moving backwards is always allowed (unpublish, reopen as draft);
 * moving forward requires every gate up to the target status.
 */
export function canTransition(product: Product, to: ProductStatus): TransitionCheck {
  if (product.status === to) return { allowed: false, reasons: ["O produto já está nesta etapa."] };
  if (ORDER[to] < ORDER[product.status]) return { allowed: true };

  const reasons = [...readinessReasons(product), ...(to === "published" ? publicationReasons(product) : [])];
  return reasons.length > 0 ? { allowed: false, reasons } : { allowed: true };
}
