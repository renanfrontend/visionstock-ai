"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

interface ChipListFieldProps {
  label: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  max?: number;
  placeholder: string;
  /** Prefix rendered inside each chip, e.g. "#" for tags. */
  chipPrefix?: string;
}

/** Editable token list: Enter or comma adds, Backspace on an empty input removes the last chip. */
export function ChipListField({ label, values, onChange, disabled, max, placeholder, chipPrefix }: ChipListFieldProps) {
  const inputId = useId();
  const counterId = useId();
  const [draft, setDraft] = useState("");
  const full = max !== undefined && values.length >= max;

  const commit = () => {
    const next = draft.trim();
    if (!next || full) return;
    if (!values.some((v) => v.toLowerCase() === next.toLowerCase())) onChange([...values, next]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-muted">
          {label}
        </label>
        {max !== undefined ? (
          <span id={counterId} className={`font-mono text-xs ${full ? "text-ice" : "text-ink-faint"}`}>
            {values.length}/{max}
          </span>
        ) : null}
      </div>

      <div
        className={`field flex min-h-12 flex-wrap items-center gap-1.5 !py-2 focus-within:border-ice/70 focus-within:shadow-[0_0_0_3px_rgb(110_231_249/0.14)] ${
          disabled ? "pointer-events-none opacity-55" : ""
        }`}
      >
        <ul className="contents" aria-label={label}>
          <AnimatePresence initial={false}>
            {values.map((value) => (
              <motion.li
                key={value}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.16 }}
                className="flex items-center gap-1 rounded-md border border-ice/25 bg-ice/8 py-0.5 pl-2 pr-1 text-sm text-ink"
              >
                <span>
                  {chipPrefix ? <span className="text-ice/70">{chipPrefix}</span> : null}
                  {value}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((v) => v !== value))}
                  className="grid size-5 place-items-center rounded text-ink-faint transition-colors hover:bg-ember/15 hover:text-ember"
                  aria-label={`Remover ${value}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <input
          id={inputId}
          value={draft}
          disabled={disabled || full}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={full ? "Limite atingido" : placeholder}
          aria-describedby={max !== undefined ? counterId : undefined}
          className="min-w-28 flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
