"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { RegisterView } from "../register/RegisterView";
import { ReportsView } from "../reports/ReportsView";
import { StorefrontView } from "../storefront/StorefrontView";
import { AppShell } from "./AppShell";
import { CatalogProvider } from "./CatalogProvider";
import { NavigationProvider, useNavigation, type ViewId } from "./navigation";
import { NoticeCenter } from "./NoticeCenter";

// three.js + R3F load only when the warehouse is opened.
const WarehouseView = dynamic(() => import("../warehouse/WarehouseView").then((m) => m.WarehouseView), {
  ssr: false,
  loading: () => <div className="h-[70dvh] skeleton rounded-2xl" aria-label="Carregando armazém" />,
});

const VIEWS: Record<ViewId, () => React.ReactNode> = {
  cadastro: () => <RegisterView />,
  armazem: () => <WarehouseView />,
  vitrine: () => <StorefrontView />,
  relatorios: () => <ReportsView />,
};

function CurrentView() {
  const { view } = useNavigation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {VIEWS[view]()}
      </motion.div>
    </AnimatePresence>
  );
}

export default function VisionStockApp() {
  return (
    <CatalogProvider>
      <NavigationProvider>
        <AppShell>
          <CurrentView />
        </AppShell>
        <NoticeCenter />
      </NavigationProvider>
    </CatalogProvider>
  );
}
