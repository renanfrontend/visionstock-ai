const RELATIVE = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const INTEGER = new Intl.NumberFormat("pt-BR");

const STEPS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
  ["year", Infinity],
];

export function relativeTime(iso: string, now = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) return RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return DATE_TIME.format(new Date(iso));
}

export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));
export const formatInt = (value: number) => INTEGER.format(value);
