"use client";
/**
 * Input: a text input with the admin field chrome (44px). Inside a FormField it
 * inherits id / aria-invalid / aria-describedby / required automatically.
 *
 *   <Input type="email" value={v} onChange={(e) => setV(e.target.value)} />
 *   <Input prefix="₹" type="number" inputMode="decimal" />
 *   <Input suffix={<button …>Show</button>} />
 *
 * `prefix`/`suffix` render inside the field (e.g. a currency sign or a toggle).
 * `invalid` forces the error style outside a FormField.
 */
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormField } from "./FormField";
import { cx, fieldBase } from "./styles";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { prefix, suffix, invalid, className, id, required, ...props },
  ref,
) {
  const field = useFormField();
  const input = (
    <input
      ref={ref}
      id={id ?? field?.id}
      required={required ?? (field?.required || undefined)}
      aria-invalid={invalid ?? field?.invalid ?? undefined}
      aria-describedby={props["aria-describedby"] ?? field?.describedBy}
      className={cx(fieldBase, "min-h-11", prefix ? "pl-8" : "", suffix ? "pr-12" : "", className)}
      {...props}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className="relative">
      {prefix && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink/50">
          {prefix}
        </span>
      )}
      {input}
      {suffix && <span className="absolute inset-y-0 right-0 flex items-center">{suffix}</span>}
    </div>
  );
});
