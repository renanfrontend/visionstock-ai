import type { CatalogState } from "./catalog-state";

export type SaveResult = { ok: true } | { ok: false; reason: string };

/** Port: where the catalog lives. The browser adapter is one implementation; an HTTP API would be another. */
export interface CatalogRepository {
  load(): CatalogState | null;
  save(state: CatalogState): SaveResult;
  clear(): void;
}
