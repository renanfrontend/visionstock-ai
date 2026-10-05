import { lettersOnly, stripAccents } from "../shared/text";

const STOP_WORDS = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "EM", "COM", "PARA", "PRA", "A", "O", "AS", "OS", "UM", "UMA"]);

function firstMeaningfulWord(text: string): string {
  const words = stripAccents(text)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return lettersOnly(words[0] ?? "");
}

function pad(source: string, size: number): string {
  return (source || "X".repeat(size)).slice(0, size).padEnd(size, "X");
}

/**
 * Human-readable, sortable SKU: CATEGORY(3)-PRODUCT(4)-SEQUENCE(4).
 * "Casa e Cozinha" + "Caneca de cerâmica Alpha" → "CAS-CANE-0001".
 * The sequence continues from the highest existing SKU with the same prefix.
 */
export function generateSku(category: string, title: string, existingSkus: readonly string[]): string {
  const prefix = `${pad(firstMeaningfulWord(category), 3)}-${pad(firstMeaningfulWord(title), 4)}`;
  const highest = existingSkus.reduce((max, sku) => {
    if (!sku.startsWith(`${prefix}-`)) return max;
    const sequence = Number(sku.slice(prefix.length + 1));
    return Number.isInteger(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(4, "0")}`;
}

export const SKU_PATTERN = /^[A-Z0-9]{2,}(-[A-Z0-9]{2,})*$/;

export function normalizeSku(value: string): string {
  return stripAccents(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
