"use client";

import dynamic from "next/dynamic";

/**
 * The catalog lives in browser storage, so the app renders client-side only.
 * This avoids hydration mismatches between an empty server render and stored data.
 */
const VisionStockApp = dynamic(() => import("./VisionStockApp"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center" role="status">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <svg viewBox="0 0 24 24" className="size-6 animate-float text-ice" aria-hidden="true">
          <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8 16 10.5v5L12 18l-4-2.5v-5z" fill="currentColor" opacity="0.8" />
        </svg>
        Abrindo o catálogo…
      </div>
    </div>
  ),
});

export function ClientApp() {
  return <VisionStockApp />;
}
