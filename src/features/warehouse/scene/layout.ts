import { AISLES, LEVELS, POSITIONS, type Aisle, type BinAddress } from "@/core/inventory/warehouse";
import type { StockStatus } from "@/core/inventory/stock";

/** Scale-model dimensions, in scene units (≈ meters / 1.5). */
export const BAY_WIDTH = 1.2;
export const LEVEL_HEIGHT = 0.95;
export const RACK_DEPTH = 0.9;
export const BASE_HEIGHT = 0.12;
const AISLE_SPACING = 3.1;

export const RACK_LENGTH = BAY_WIDTH * POSITIONS;
export const RACK_HEIGHT = BASE_HEIGHT + LEVEL_HEIGHT * LEVELS;

export function aisleZ(aisle: Aisle): number {
  const index = AISLES.indexOf(aisle);
  return (index - (AISLES.length - 1) / 2) * AISLE_SPACING;
}

/** Center of the shelf surface for a bin. */
export function binOrigin({ aisle, level, position }: Pick<BinAddress, "aisle" | "level" | "position">): [number, number, number] {
  const x = (position - (POSITIONS + 1) / 2) * BAY_WIDTH;
  const y = BASE_HEIGHT + (level - 1) * LEVEL_HEIGHT + 0.04;
  return [x, y, aisleZ(aisle)];
}

export const SCENE_COLORS = {
  background: "#e6edf7",
  floor: "#dfe6ef",
  slab: "#c3cede",
  laneMark: "#f8fbff",
  upright: "#5f84c4",
  beam: "#f0a64a",
  deck: "#cfd8e4",
  boxTape: "#efe3cf",
  hover: "#3b82f6",
  valid: "#22c55e",
  invalid: "#ef4444",
  selected: "#2563eb",
} as const;

/** Muted, distinguishable label colors for product boxes, picked by a stable hash. */
const BOX_PALETTE = ["#7aa2f7", "#f0a868", "#6fc5a6", "#b99af0", "#e8c35a", "#62bccf", "#ec8f8f", "#9fcf6a"] as const;

export function boxColorFor(productId: string): string {
  let hash = 0;
  for (const char of productId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return BOX_PALETTE[Math.abs(hash) % BOX_PALETTE.length] as string;
}

export const HEAT_COLORS: Readonly<Record<StockStatus, string>> = {
  ok: "#6fc5a6",
  low: "#f2b14c",
  out: "#e9707a",
};
