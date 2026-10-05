"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

export type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  icon?: LucideIcon;
  variant?: ButtonVariant;
  size?: Size;
  children?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "sheen bg-ice/14 text-ice border-ice/45 shadow-[0_0_26px_-10px_var(--color-ice)] hover:bg-ice/22 hover:border-ice/80",
  ghost: "bg-transparent text-ink-muted border-line hover:text-ink hover:border-ink-faint",
  subtle: "bg-white/[0.04] text-ink border-transparent hover:bg-white/[0.08]",
  danger: "bg-ember/10 text-ember border-ember/35 hover:bg-ember/18 hover:border-ember/70",
};

const SIZES: Record<Size, string> = {
  sm: "gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
  md: "gap-2 rounded-lg px-3.5 py-2 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { icon: Icon, variant = "primary", size = "md", className = "", children, type = "button", ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      className={`inline-flex items-center justify-center border font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {Icon ? <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" /> : null}
      {children}
    </motion.button>
  );
});
