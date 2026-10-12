"use client";

import React, { forwardRef, useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = "",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs uppercase tracking-wider text-ink/80 font-medium"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-ink/40">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 transition-colors focus:outline-none focus:ring-1 ${
              error
                ? "border-sale focus:border-sale focus:ring-sale/30"
                : "border-sage-300 focus:border-gold-500 focus:ring-gold-500/20"
            } ${leftIcon ? "pl-10" : ""} ${rightIcon ? "pr-10" : ""} ${
              disabled ? "cursor-not-allowed bg-sage-50 opacity-60" : ""
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-ink/40">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-xs text-sale">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1 text-xs text-ink/60">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
