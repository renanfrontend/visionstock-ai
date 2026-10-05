/**
 * Warehouse addressing: aisle (rua) × level (nível) × position (posição).
 * One SKU per bin keeps picking unambiguous; a bin holds up to BIN_CAPACITY units.
 */
export const AISLES = ["A", "B", "C"] as const;
export type Aisle = (typeof AISLES)[number];

export const LEVELS = 3;
export const POSITIONS = 4;
export const BIN_CAPACITY = 200;

export type BinId = `${Aisle}-${number}-${string}`;

export interface BinAddress {
  id: BinId;
  aisle: Aisle;
  level: number;
  position: number;
}

export function binId(aisle: Aisle, level: number, position: number): BinId {
  return `${aisle}-${level}-${String(position).padStart(2, "0")}`;
}

export function parseBinId(id: string): BinAddress | null {
  const match = /^([ABC])-([1-9])-(\d{2})$/.exec(id);
  if (!match) return null;
  const [, aisle, level, position] = match;
  const parsed = { aisle: aisle as Aisle, level: Number(level), position: Number(position) };
  if (parsed.level > LEVELS || parsed.position < 1 || parsed.position > POSITIONS) return null;
  return { id: binId(parsed.aisle, parsed.level, parsed.position), ...parsed };
}

export function listBins(): BinAddress[] {
  return AISLES.flatMap((aisle) =>
    Array.from({ length: LEVELS }, (_, l) =>
      Array.from({ length: POSITIONS }, (_, p) => ({ id: binId(aisle, l + 1, p + 1), aisle, level: l + 1, position: p + 1 })),
    ).flat(),
  );
}

export function formatBin(id: string): string {
  const bin = parseBinId(id);
  return bin ? `Rua ${bin.aisle}, nível ${bin.level}, posição ${String(bin.position).padStart(2, "0")}` : id;
}

/** Visual stack size: 0 boxes when empty, up to 4 as the bin fills. */
export function boxesFor(quantity: number): number {
  if (quantity <= 0) return 0;
  return Math.min(4, Math.ceil((quantity / BIN_CAPACITY) * 4));
}

export type AllocationCheck = { allowed: true } | { allowed: false; reason: string };

interface Occupant {
  id: string;
  title: string;
  stock: { quantity: number; binId: string | null };
}

export function checkAllocation(product: Occupant, target: string, products: readonly Occupant[]): AllocationCheck {
  if (!parseBinId(target)) return { allowed: false, reason: "Endereço inexistente no armazém." };
  const occupant = products.find((other) => other.stock.binId === target && other.id !== product.id);
  if (occupant) return { allowed: false, reason: `${formatBin(target)} já está ocupado por "${occupant.title}".` };
  if (product.stock.quantity > BIN_CAPACITY) {
    return { allowed: false, reason: `O saldo de ${product.stock.quantity} un. passa a capacidade do endereço (${BIN_CAPACITY} un.).` };
  }
  return { allowed: true };
}
