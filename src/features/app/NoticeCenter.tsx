"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { NoticeEvent } from "@/application/catalog/catalog-store";
import type { NoticeTone } from "@/application/catalog/commands";
import { useCatalogStore } from "./CatalogProvider";

const TONE: Record<NoticeTone, { icon: typeof Info; ring: string; text: string; bar: string }> = {
  success: { icon: CircleCheck, ring: "border-mint/35", text: "text-mint", bar: "bg-mint" },
  info: { icon: Info, ring: "border-ice/30", text: "text-ice", bar: "bg-ice" },
  error: { icon: TriangleAlert, ring: "border-ember/45", text: "text-ember", bar: "bg-ember" },
};

const VISIBLE_MS: Record<NoticeTone, number> = { success: 3600, info: 4200, error: 7000 };
const MAX_VISIBLE = 4;

/** Toast stack fed by the store's notices. Errors stay longer and are announced assertively. */
export function NoticeCenter() {
  const store = useCatalogStore();
  const [notices, setNotices] = useState<NoticeEvent[]>([]);

  useEffect(
    () =>
      store.onNotice((notice) => {
        // "Nothing changed" chatter is not worth a toast.
        if (notice.tone === "info" && notice.title === "Nada mudou") return;
        setNotices((current) => [...current, notice].slice(-MAX_VISIBLE));
        window.setTimeout(() => setNotices((current) => current.filter((item) => item.id !== notice.id)), VISIBLE_MS[notice.tone]);
      }),
    [store],
  );

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96">
      <AnimatePresence initial={false}>
        {notices.map((notice) => {
          const tone = TONE[notice.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={notice.id}
              layout
              role={notice.tone === "error" ? "alert" : "status"}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`glass pointer-events-auto relative w-full overflow-hidden rounded-xl border ${tone.ring} py-3 pr-10 pl-4`}
            >
              <div className="flex gap-3">
                <Icon className={`mt-0.5 size-4 shrink-0 ${tone.text}`} aria-hidden="true" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-ink">{notice.title}</p>
                  {notice.detail ? <p className="mt-0.5 text-ink-muted">{notice.detail}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotices((current) => current.filter((item) => item.id !== notice.id))}
                className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded text-ink-faint hover:bg-white/5 hover:text-ink"
                aria-label="Fechar aviso"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
              <motion.span
                className={`absolute bottom-0 left-0 h-0.5 ${tone.bar} opacity-60`}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: VISIBLE_MS[notice.tone] / 1000, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
