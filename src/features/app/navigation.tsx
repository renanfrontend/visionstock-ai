"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const VIEWS = ["cadastro", "armazem", "vitrine", "relatorios"] as const;
export type ViewId = (typeof VIEWS)[number];

const isView = (value: string): value is ViewId => (VIEWS as readonly string[]).includes(value);

interface Navigation {
  view: ViewId;
  go: (view: ViewId) => void;
  /** Product loaded in the registration form for editing; null = new product. */
  editingId: string | null;
  edit: (productId: string | null) => void;
  /** Product highlighted in the warehouse scene. */
  focusedId: string | null;
  focus: (productId: string | null) => void;
}

const NavigationContext = createContext<Navigation | null>(null);

/** View state mirrored in the URL hash, so reload and back/forward keep the current screen. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewId>("cadastro");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      if (isView(hash)) setView(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const go = useCallback((next: ViewId) => {
    setView(next);
    if (window.location.hash !== `#${next}`) window.history.pushState(null, "", `#${next}`);
  }, []);

  const edit = useCallback(
    (productId: string | null) => {
      setEditingId(productId);
      go("cadastro");
    },
    [go],
  );

  const focus = useCallback(
    (productId: string | null) => {
      setFocusedId(productId);
      if (productId) go("armazem");
    },
    [go],
  );

  const value = useMemo(() => ({ view, go, editingId, edit, focusedId, focus }), [view, go, editingId, edit, focusedId, focus]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error("useNavigation must be used inside <NavigationProvider>");
  return navigation;
}
