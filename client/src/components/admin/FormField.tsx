"use client";
/**
 * FormField: label + control + hint + error, wired for accessibility.
 *
 *   <FormField label="Coupon code" name="code" errors={save.fieldErrors} hint="3–30 chars" required>
 *     <Input name="code" value={code} onChange={…} />
 *   </FormField>
 *
 * - The child control (Input, Textarea, Select) picks up `id`, `aria-invalid`,
 *   `aria-describedby` and `required` from context, so you don't repeat them.
 * - The error shown is `error` if given, else `errors[name]`, where `errors` is
 *   `ApiError.fieldErrors` (paths like "code" or "variants.0.sku").
 * - For a custom control, use `useFormField()` to read `{ id, describedBy, invalid, required }`.
 */
import { createContext, useContext, useId, type ReactNode } from "react";
import { cx } from "./styles";

interface FieldContext {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const Ctx = createContext<FieldContext | null>(null);

/** Field wiring for the nearest FormField, or null outside one. */
export const useFormField = () => useContext(Ctx);

export interface FormFieldProps {
  label: ReactNode;
  /** Field path used to look up `errors`. */
  name?: string;
  errors?: Record<string, string>;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
  /** Override the generated control id. */
  id?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, name, errors, error, hint, required = false, hideLabel, id, className, children }: FormFieldProps) {
  const autoId = useId();
  const controlId = id ?? `f${autoId}`;
  const message = error ?? (name ? errors?.[name] : undefined);
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = message ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Ctx.Provider value={{ id: controlId, describedBy, invalid: Boolean(message), required }}>
      <div className={cx("flex flex-col gap-1.5", className)}>
        <label htmlFor={controlId} className={cx("text-xs font-semibold tracking-wide text-ink/80", hideLabel && "sr-only")}>
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-sale">
              *
            </span>
          )}
        </label>
        {children}
        {hint && !message && (
          <p id={hintId} className="text-xs text-ink/55">
            {hint}
          </p>
        )}
        {hint && message && (
          <p id={hintId} className="sr-only">
            {hint}
          </p>
        )}
        {message && (
          <p id={errorId} className="text-xs font-semibold text-sale">
            {message}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}
