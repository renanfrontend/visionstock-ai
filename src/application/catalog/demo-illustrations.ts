/**
 * Flat product illustrations for the demo catalog, generated as SVG so the seed
 * ships no binary assets and stays a few KB in browser storage.
 */
export type IllustrationKind = "mug" | "backpack" | "sneaker" | "lamp" | "bottle" | "headphones" | "vase" | "notebook";

const SHAPES: Readonly<Record<IllustrationKind, (main: string, accent: string) => string>> = {
  mug: (m, a) =>
    `<rect x="70" y="70" width="90" height="110" rx="14" fill="${m}"/><rect x="70" y="84" width="90" height="12" fill="${a}"/>` +
    `<path d="M160 100h14a24 24 0 0 1 0 48h-14" fill="none" stroke="${m}" stroke-width="14"/>`,
  backpack: (m, a) =>
    `<rect x="62" y="58" width="116" height="136" rx="30" fill="${m}"/><rect x="82" y="118" width="76" height="52" rx="12" fill="${a}"/>` +
    `<path d="M95 60v-14a25 25 0 0 1 50 0v14" fill="none" stroke="${a}" stroke-width="10"/>`,
  sneaker: (m, a) =>
    `<path d="M40 150c0-40 30-58 60-60l20 18 30-8c20 20 52 26 60 38v22H40z" fill="${m}"/>` +
    `<rect x="36" y="168" width="178" height="14" rx="7" fill="${a}"/><path d="M104 108l10 12m6-16l10 12m6-15l10 12" stroke="${a}" stroke-width="5"/>`,
  lamp: (m, a) =>
    `<path d="M120 70l58 34-12 20-58-34z" fill="${m}"/><path d="M118 82l-38 66" stroke="${a}" stroke-width="10"/>` +
    `<rect x="54" y="150" width="70" height="20" rx="8" fill="${a}"/><circle cx="168" cy="132" r="10" fill="#fde68a"/>`,
  bottle: (m, a) =>
    `<rect x="100" y="40" width="40" height="22" rx="6" fill="${a}"/><rect x="88" y="60" width="64" height="134" rx="22" fill="${m}"/>` +
    `<rect x="88" y="104" width="64" height="16" fill="${a}" opacity=".6"/>`,
  headphones: (m, a) =>
    `<path d="M66 140v-20a54 54 0 0 1 108 0v20" fill="none" stroke="${m}" stroke-width="14"/>` +
    `<rect x="52" y="128" width="34" height="56" rx="14" fill="${a}"/><rect x="154" y="128" width="34" height="56" rx="14" fill="${a}"/>`,
  vase: (m, a) =>
    `<path d="M96 52h48l-6 20c34 18 40 72 18 112H84C62 144 68 90 102 72z" fill="${m}"/><rect x="92" y="46" width="56" height="10" rx="5" fill="${a}"/>`,
  notebook: (m, a) =>
    `<rect x="70" y="48" width="104" height="146" rx="10" fill="${m}"/><rect x="70" y="48" width="18" height="146" fill="${a}"/>` +
    `<rect x="106" y="78" width="50" height="8" rx="4" fill="#ffffff" opacity=".7"/>`,
};

export function illustration(kind: IllustrationKind, main: string, accent: string, background: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">` +
    `<rect width="240" height="240" fill="${background}"/>` +
    `<ellipse cx="120" cy="200" rx="78" ry="10" fill="#0f172a" opacity=".12"/>` +
    SHAPES[kind](main, accent) +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
