"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

type Variant = "primary" | "ghost";

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  icon?: LucideIcon;
  variant?: Variant;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-ice/12 text-ice border-ice/40 shadow-[0_0_24px_-8px_var(--color-ice)] hover:bg-ice/20 hover:border-ice/70",
  ghost: "bg-transparent text-ink-muted border-line hover:text-ink hover:border-ink-faint",
};

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(function NeonButton(
  { icon: Icon, variant = "primary", className = "", children, type = "button", ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
    </motion.button>
  );
});
