"use client";
/**
 * Textarea: multi-line input with the admin field chrome. Inherits FormField wiring.
 *
 *   <Textarea rows={6} value={description} onChange={…} />
 */
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { useFormField } from "./FormField";
import { cx, fieldBase } from "./styles";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, id, required, rows = 4, ...props },
  ref,
) {
  const field = useFormField();
  return (
    <textarea
      ref={ref}
      rows={rows}
      id={id ?? field?.id}
      required={required ?? (field?.required || undefined)}
      aria-invalid={invalid ?? field?.invalid ?? undefined}
      aria-describedby={props["aria-describedby"] ?? field?.describedBy}
      className={cx(fieldBase, "py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
});
