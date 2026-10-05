import type { CatalogRepository } from "./catalog-repository";
import { EMPTY_CATALOG, type CatalogState } from "./catalog-state";
import type { CommandContext, CommandResult, Notice } from "./commands";
import { buildDemoCatalog } from "./demo-catalog";

export type Command = (state: CatalogState, ctx: CommandContext) => CommandResult;

export interface NoticeEvent extends Notice {
  id: number;
  productId?: string;
}

type Listener = () => void;
type NoticeListener = (notice: NoticeEvent) => void;

export interface CatalogStore {
  getState(): CatalogState;
  subscribe(listener: Listener): () => void;
  onNotice(listener: NoticeListener): () => void;
  run(command: Command): CommandResult;
  resetToDemo(): void;
  clearAll(): void;
  replace(state: CatalogState, notice: Notice): void;
  /** Broadcasts a notice without changing state (e.g. a rejected file import). */
  notify(notice: Notice): void;
}

interface StoreDeps {
  repository: CatalogRepository;
  now?: () => string;
  newId?: () => string;
}

const defaultId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Framework-agnostic store: pure commands in, state + notices out.
 * React subscribes through useSyncExternalStore; persistence happens after every change.
 */
export function createCatalogStore({ repository, now = () => new Date().toISOString(), newId = defaultId }: StoreDeps): CatalogStore {
  let state: CatalogState = repository.load() ?? buildDemoCatalog(now());
  const listeners = new Set<Listener>();
  const noticeListeners = new Set<NoticeListener>();
  let noticeSeq = 0;

  const emit = (notice: Notice, productId?: string) => {
    const event: NoticeEvent = { ...notice, id: ++noticeSeq, productId };
    noticeListeners.forEach((listener) => listener(event));
  };

  const commit = (next: CatalogState) => {
    state = next;
    const saved = repository.save(next);
    if (!saved.ok) emit({ tone: "error", title: "Alterações não salvas", detail: saved.reason });
    listeners.forEach((listener) => listener());
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onNotice(listener) {
      noticeListeners.add(listener);
      return () => noticeListeners.delete(listener);
    },
    run(command) {
      const result = command(state, { now: now(), newId });
      if (result.state !== state) commit(result.state);
      emit(result.notice, result.productId);
      return result;
    },
    resetToDemo() {
      commit(buildDemoCatalog(now()));
      emit({ tone: "info", title: "Demonstração restaurada", detail: "O catálogo voltou aos 8 produtos de exemplo." });
    },
    clearAll() {
      commit({ ...EMPTY_CATALOG, settings: state.settings });
      emit({ tone: "info", title: "Catálogo vazio", detail: "Todos os produtos foram removidos deste navegador." });
    },
    replace(next, notice) {
      commit(next);
      emit(notice);
    },
    notify(notice) {
      emit(notice);
    },
  };
}
