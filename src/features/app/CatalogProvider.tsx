"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CatalogState } from "@/application/catalog/catalog-state";
import { createCatalogStore, type CatalogStore } from "@/application/catalog/catalog-store";
import { LocalStorageCatalogRepository } from "@/infrastructure/local-storage-catalog-repository";

const StoreContext = createContext<CatalogStore | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createCatalogStore({ repository: new LocalStorageCatalogRepository() }), []);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useCatalogStore(): CatalogStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useCatalogStore must be used inside <CatalogProvider>");
  return store;
}

/** Subscribes to a slice of the catalog; re-renders only when the selected value changes identity. */
export function useCatalog<T>(selector: (state: CatalogState) => T): T {
  const store = useCatalogStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
