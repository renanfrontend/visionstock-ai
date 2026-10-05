import { STOCK_STATUS_LABEL, stockStatus } from "@/core/inventory/stock";

const TONE = {
  ok: "bg-mint/12 text-mint border-mint/25",
  low: "bg-amber/12 text-amber border-amber/30",
  out: "bg-ember/12 text-ember border-ember/30",
} as const;

/** Balance colored by stock health; the status word is available to tooltips and screen readers. */
export function StockBadge({ quantity, minimum }: { quantity: number; minimum: number }) {
  const status = stockStatus(quantity, minimum);
  const label = STOCK_STATUS_LABEL[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap ${TONE[status]}`}
      title={`${label}, mínimo de ${minimum} un.`}
    >
      {quantity} un.<span className="sr-only">, {label.toLowerCase()}</span>
    </span>
  );
}
