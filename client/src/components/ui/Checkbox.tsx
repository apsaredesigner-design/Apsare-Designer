"use client";

import React, { forwardRef, useId } from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className="h-4 w-4 rounded border-sage-300 text-ink accent-ink focus:ring-2 focus:ring-gold-500/30 focus:ring-offset-1 cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm">
            {label && (
              <label
                htmlFor={checkboxId}
                className="font-medium text-ink cursor-pointer select-none"
              >
                {label}
              </label>
            )}
            {description && <p className="text-xs text-ink/60">{description}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
