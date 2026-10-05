"use client";

import { useEffect, useState } from "react";
import { Button, type ButtonVariant } from "./Button";

interface ConfirmButtonProps {
  icon?: React.ComponentProps<typeof Button>["icon"];
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  className?: string;
  /** Required when `label` is empty (icon-only button). */
  ariaLabel?: string;
}

/** Two-step destructive action: the first click arms it for 3 s, the second confirms. */
export function ConfirmButton({ icon, label, confirmLabel, onConfirm, variant = "danger", size = "md", className, ariaLabel }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      icon={icon}
      size={size}
      variant={armed ? "danger" : variant}
      className={`${armed ? "animate-pulse" : ""} ${className ?? ""}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      aria-label={armed ? confirmLabel : (ariaLabel ?? label)}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}
