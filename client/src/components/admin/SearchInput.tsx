"use client";
/**
 * SearchInput: a labelled search box with a clear button. Controlled; pair it
 * with useAdminList, which debounces the URL update:
 *
 *   <SearchInput label="Search products" placeholder="Name or code"
 *                value={list.search} onChange={list.setSearch} />
 *
 * The label is visually hidden unless `showLabel`. Esc clears the field.
 */
import { useId } from "react";
import { CloseIcon, SearchIcon } from "./icons";
import { cx, fieldBase, focusRing } from "./styles";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  showLabel?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChange, label, placeholder, showLabel, className, autoFocus }: SearchInputProps) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={showLabel ? "text-xs font-semibold tracking-wide text-ink/80" : "sr-only"}>
        {label}
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/45" />
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault();
              onChange("");
            }
          }}
          className={cx(fieldBase, "min-h-11 pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden")}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className={cx("absolute inset-y-0 right-0 grid w-11 place-items-center rounded-md text-ink/45 hover:text-ink", focusRing)}
          >
            <CloseIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
