"use client";

import { motion } from "framer-motion";
import { ChartColumn, ScanLine, Store, Warehouse, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { useCatalog } from "./CatalogProvider";
import { useNavigation, VIEWS, type ViewId } from "./navigation";

const TABS: Record<ViewId, { label: string; icon: LucideIcon }> = {
  cadastro: { label: "Cadastro", icon: ScanLine },
  armazem: { label: "Armazém 3D", icon: Warehouse },
  vitrine: { label: "Vitrine", icon: Store },
  relatorios: { label: "Relatórios", icon: ChartColumn },
};

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest("input, textarea, select, [contenteditable=true]"));
}

export function AppShell({ children }: { children: ReactNode }) {
  const { view, go } = useNavigation();
  const products = useCatalog((state) => state.products);
  const storeName = useCatalog((state) => state.settings.storeName);

  // Badges tell where work is waiting: products without an address, products ready to publish.
  const badges = useMemo<Partial<Record<ViewId, number>>>(
    () => ({
      armazem: products.filter((product) => !product.stock.binId).length,
      vitrine: products.filter((product) => product.status === "ready").length,
    }),
    [products],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const index = Number(event.key) - 1;
      const target = VIEWS[index];
      if (target) {
        event.preventDefault();
        go(target);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col px-3 pb-24 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-30 -mx-3 mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-void/80 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <a href="#cadastro" onClick={() => go("cadastro")} className="flex items-center gap-2.5 rounded-md">
          <svg viewBox="0 0 24 24" className="size-6 text-ice" aria-hidden="true">
            <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8 16 10.5v5L12 18l-4-2.5v-5z" fill="currentColor" opacity="0.8" />
          </svg>
          <span className="font-display text-sm font-semibold tracking-tight">VisionStock</span>
        </a>

        <nav aria-label="Seções" className="order-3 w-full sm:order-none sm:w-auto">
          <ul className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-hull/60 p-1">
            {VIEWS.map((id, index) => {
              const { label, icon: Icon } = TABS[id];
              const active = view === id;
              const badge = badges[id] ?? 0;
              return (
                <li key={id} className="flex-1 sm:flex-none">
                  <a
                    href={`#${id}`}
                    data-tab={id}
                    onClick={(event) => {
                      event.preventDefault();
                      go(id);
                    }}
                    aria-current={active ? "page" : undefined}
                    title={`${label} (atalho ${index + 1})`}
                    aria-keyshortcuts={String(index + 1)}
                    className={`relative flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                      active ? "text-ink" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-lg border border-ice/30 bg-ice/10 shadow-[0_0_20px_-8px_var(--color-ice)]"
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      />
                    ) : null}
                    <Icon className={`relative size-4 ${active ? "text-ice" : ""}`} aria-hidden="true" />
                    <span className="relative hidden sm:inline">{label}</span>
                    <span className="sr-only sm:hidden">{label}</span>
                    {badge > 0 ? (
                      <span
                        key={badge}
                        className="relative animate-bump rounded-full bg-amber/20 px-1.5 font-mono text-[10px] leading-4 text-amber"
                        aria-label={`${badge} pendentes`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="ml-auto hidden text-sm text-ink-faint md:block">
          Loja <span className="text-ink-muted">{storeName}</span>
        </p>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-10 text-xs text-ink-faint">
        Prova de conceito com dados fictícios. O catálogo fica salvo neste navegador.
      </footer>
    </div>
  );
}
