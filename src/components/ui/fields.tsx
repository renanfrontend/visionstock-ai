"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { formatBRL, parseBRL } from "@/core/shared/money";

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  aside?: ReactNode;
  error?: string | null;
  errorId?: string;
  children: ReactNode;
}

export function FieldShell({ label, htmlFor, hint, aside, error, errorId, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink-muted">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={errorId} className="text-xs text-ember">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  max?: number;
  multiline?: boolean;
  rows?: number;
  hint?: ReactNode;
  error?: string | null;
  disabled?: boolean;
  mono?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

export function TextField({ label, value, onChange, placeholder, max, multiline, rows = 4, hint, error, disabled, mono, inputMode }: TextFieldProps) {
  const id = useId();
  const errorId = useId();
  const shared = {
    id,
    value,
    placeholder,
    disabled,
    maxLength: max,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: `field ${mono ? "font-mono text-[0.88rem] tracking-wide" : ""}`,
  } as const;
  const counter = max ? (
    <span className="font-mono text-[11px] text-ink-faint">
      {value.length}/{max}
    </span>
  ) : null;

  return (
    <FieldShell label={label} htmlFor={id} hint={hint} aside={counter} error={error} errorId={errorId}>
      {multiline ? (
        <textarea {...shared} rows={rows} className={`${shared.className} resize-y`} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...shared} type="text" inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      )}
    </FieldShell>
  );
}

interface MoneyFieldProps {
  label: string;
  cents: number;
  onChange: (cents: number) => void;
  hint?: ReactNode;
  disabled?: boolean;
}

/** Free typing in Brazilian format; normalized to "R$ 1.234,56" on blur. */
export function MoneyField({ label, cents, onChange, hint, disabled }: MoneyFieldProps) {
  const id = useId();
  const errorId = useId();
  const [text, setText] = useState(cents ? formatBRL(cents) : "");
  const [error, setError] = useState<string | null>(null);
  const [syncedCents, setSyncedCents] = useState(cents);

  // Value changed from outside (e.g. the AI or a reset): adopt it unless the text already says the same.
  if (cents !== syncedCents) {
    setSyncedCents(cents);
    if (parseBRL(text) !== cents) {
      setText(cents ? formatBRL(cents) : "");
      setError(null);
    }
  }

  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} errorId={errorId}>
      <input
        id={id}
        className="field font-mono text-[0.9rem]"
        inputMode="decimal"
        placeholder="R$ 0,00"
        value={text}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setText(event.target.value);
          const parsed = parseBRL(event.target.value);
          if (event.target.value.trim() === "") {
            setError(null);
            onChange(0);
          } else if (parsed === null) {
            setError("Use o formato 1.234,56.");
          } else {
            setError(null);
            onChange(parsed);
          }
        }}
        onBlur={() => {
          if (!error) setText(cents ? formatBRL(cents) : "");
        }}
      />
    </FieldShell>
  );
}

interface StepperFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  hint?: ReactNode;
  disabled?: boolean;
}

/** Integer input with -/+ buttons; holds non-negative integers only. */
export function StepperField({ label, value, onChange, unit, step = 1, hint, disabled }: StepperFieldProps) {
  const id = useId();
  const set = (next: number) => onChange(Math.max(0, Math.round(Number.isFinite(next) ? next : 0)));
  return (
    <FieldShell label={label} htmlFor={id} hint={hint}>
      <div className="field flex items-center gap-1 !p-1">
        <button
          type="button"
          onClick={() => set(value - step)}
          disabled={disabled || value <= 0}
          className="grid size-8 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-30"
          aria-label={`Diminuir ${label.toLowerCase()}`}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={String(value)}
          disabled={disabled}
          onChange={(event) => set(Number(event.target.value.replace(/\D/g, "")))}
          className="w-full min-w-0 bg-transparent text-center font-mono text-[0.92rem] text-ink outline-none"
        />
        {unit ? <span className="pr-1 text-xs text-ink-faint">{unit}</span> : null}
        <button
          type="button"
          onClick={() => set(value + step)}
          disabled={disabled}
          className="grid size-8 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-30"
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </FieldShell>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded border border-b-2 border-line bg-hull px-1.5 font-mono text-[10px] text-ink-muted">
      {children}
    </kbd>
  );
}
