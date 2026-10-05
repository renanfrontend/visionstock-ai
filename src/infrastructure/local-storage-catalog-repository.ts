import type { CatalogRepository, SaveResult } from "@/application/catalog/catalog-repository";
import { CatalogStateSchema, type CatalogState } from "@/application/catalog/catalog-state";

const STORAGE_KEY = "visionstock:catalog:v2";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Access throws in some privacy modes.
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
}

/**
 * Browser persistence. Data is schema-validated on read, so a corrupted or
 * outdated payload falls back to a fresh catalog instead of crashing the app.
 */
export class LocalStorageCatalogRepository implements CatalogRepository {
  load(): CatalogState | null {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = CatalogStateSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      console.warn("[catalog] stored data failed validation; starting fresh", parsed.error.issues[0]);
    } catch {
      console.warn("[catalog] stored data is not valid JSON; starting fresh");
    }
    return null;
  }

  save(state: CatalogState): SaveResult {
    const target = storage();
    if (!target) return { ok: false, reason: "O navegador bloqueou o armazenamento local; as alterações valem só nesta aba." };
    try {
      target.setItem(STORAGE_KEY, JSON.stringify(state));
      return { ok: true };
    } catch (error) {
      if (isQuotaError(error)) {
        return { ok: false, reason: "O armazenamento do navegador está cheio. Exclua produtos ou exporte um backup e limpe os dados." };
      }
      return { ok: false, reason: "Não foi possível salvar no navegador." };
    }
  }

  clear(): void {
    storage()?.removeItem(STORAGE_KEY);
  }
}
