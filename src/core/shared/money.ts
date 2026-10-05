/** Money is always integer cents to avoid floating point drift. */
export type Cents = number;

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: Cents): string {
  return BRL.format(cents / 100);
}

/** "49.90" for XML/feeds: dot decimal, two places, no grouping. */
export function toDecimalString(cents: Cents): string {
  return (cents / 100).toFixed(2);
}

/**
 * Parses user input in Brazilian format ("1.234,56", "49,9", "R$ 10").
 * Returns null when the input is not a valid non-negative amount.
 */
export function parseBRL(input: string): Cents | null {
  const cleaned = input.replace(/R\$\s?/i, "").replace(/\s/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) return null;
  const [integer = "0", fraction = ""] = cleaned.replace(/\./g, "").split(",");
  return Number(integer) * 100 + Number(fraction.padEnd(2, "0"));
}
