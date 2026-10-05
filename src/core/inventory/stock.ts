export const MOVEMENT_TYPES = ["entrada", "saida", "ajuste"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABEL: Readonly<Record<MovementType, string>> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste de inventário",
};

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  /** Units moved; for "ajuste" it is the counted balance. */
  quantity: number;
  before: number;
  after: number;
  note: string;
  at: string;
}

export type MovementResult = { ok: true; after: number } | { ok: false; reason: string };

export function applyMovement(balance: number, type: MovementType, quantity: number): MovementResult {
  if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, reason: "Informe uma quantidade inteira e positiva." };
  if (type !== "ajuste" && quantity === 0) return { ok: false, reason: "A quantidade precisa ser maior que zero." };
  if (type === "entrada") return { ok: true, after: balance + quantity };
  if (type === "saida") {
    if (quantity > balance) return { ok: false, reason: `Saída de ${quantity} un. maior que o saldo (${balance} un.).` };
    return { ok: true, after: balance - quantity };
  }
  return { ok: true, after: quantity };
}

export type StockStatus = "out" | "low" | "ok";

export const STOCK_STATUS_LABEL: Readonly<Record<StockStatus, string>> = {
  out: "Sem estoque",
  low: "Abaixo do mínimo",
  ok: "Saudável",
};

export function stockStatus(quantity: number, minimum: number): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= minimum) return "low";
  return "ok";
}
