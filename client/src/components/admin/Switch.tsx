"use client";
/**
 * Switch: an on/off toggle (role="switch"). Give it a visible `label` or an `aria-label`.
 *
 *   <Switch label="Active" checked={isActive} onChange={setActive} />
 *   <Switch aria-label={`Active: ${p.name}`} checked={p.isActive} onChange={(v) => toggle(p.id, v)} size="sm" />
 */
import { useId, type ReactNode } from "react";
import { cx, focusRing } from "./styles";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
  size?: "sm" | "md";
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, size = "md", className, ...aria }: SwitchProps) {
  const id = useId();
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const thumb = size === "sm" ? "size-4 data-[on=true]:translate-x-4" : "size-5 data-[on=true]:translate-x-5";

  return (
    <div className={cx("inline-flex min-h-11 items-center gap-3", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${id}-l` : undefined}
        aria-describedby={description ? `${id}-d` : undefined}
        aria-label={label ? undefined : aria["aria-label"]}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50",
          "rounded-full",
          focusRing,
        )}
      >
        <span
          aria-hidden
          className={cx(
            "relative inline-flex items-center rounded-full p-0.5 transition-colors duration-200",
            track,
            checked ? "bg-sage-600" : "bg-ink/20",
          )}
        >
          <span
            data-on={checked}
            className={cx("rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none", thumb)}
          />
        </span>
      </button>
      {(label || description) && (
        <span className="flex flex-col">
          {label && (
            <span id={`${id}-l`} className="cursor-pointer text-sm text-ink" onClick={() => !disabled && onChange(!checked)}>
              {label}
            </span>
          )}
          {description && (
            <span id={`${id}-d`} className="text-xs text-ink/55">
              {description}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
