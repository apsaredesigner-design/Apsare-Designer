"use client";
/**
 * Select: a styled native <select> (keyboard and screen-reader friendly by default).
 * Inherits FormField wiring.
 *
 *   <Select value={status} onChange={(e) => setStatus(e.target.value)}
 *           options={[{ value: "", label: "All statuses" }, { value: "PLACED", label: "Placed" }]} />
 *
 * Pass `options` or your own <option> children.
 */
import { forwardRef, type SelectHTMLAttributes } from "react";
import { useFormField } from "./FormField";
import { ChevronDownIcon } from "./icons";
import { cx, fieldBase } from "./styles";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, invalid, className, id, required, children, ...props },
  ref,
) {
  const field = useFormField();
  return (
    <div className={cx("relative", className)}>
      <select
        ref={ref}
        id={id ?? field?.id}
        required={required ?? (field?.required || undefined)}
        aria-invalid={invalid ?? field?.invalid ?? undefined}
        aria-describedby={props["aria-describedby"] ?? field?.describedBy}
        className={cx(fieldBase, "min-h-11 cursor-pointer appearance-none pr-9")}
        {...props}
      >
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink/50" />
    </div>
  );
});
