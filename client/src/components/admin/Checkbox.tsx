"use client";
/**
 * Checkbox: a native checkbox with a custom look, optional inline label and
 * `indeterminate` support (used by DataTable's "select all").
 *
 *   <Checkbox label="New arrival" checked={v} onChange={(e) => setV(e.target.checked)} />
 *   <Checkbox aria-label="Select row" checked={…} onChange={…} />
 *
 * The clickable area is at least 44×44px.
 */
import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { CheckIcon, MinusIcon } from "./icons";
import { cx } from "./styles";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
}

export function Checkbox({ label, description, indeterminate = false, className, disabled, ...props }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={cx(
        "group inline-flex min-h-11 min-w-11 items-center gap-3 select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        label ? "" : "justify-center",
        className,
      )}
    >
      <span className="relative grid size-5 shrink-0 place-items-center">
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className="peer absolute inset-0 size-full cursor-[inherit] appearance-none rounded border border-ink/30 bg-white transition-colors checked:border-ink checked:bg-ink indeterminate:border-ink indeterminate:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 group-hover:border-ink/60"
          {...props}
        />
        <CheckIcon className="pointer-events-none relative hidden size-3.5 stroke-[2.5] text-ivory peer-checked:block peer-indeterminate:hidden" />
        <MinusIcon className="pointer-events-none relative hidden size-3.5 stroke-[2.5] text-ivory peer-indeterminate:block" />
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm text-ink">{label}</span>}
          {description && <span className="text-xs text-ink/55">{description}</span>}
        </span>
      )}
    </label>
  );
}
