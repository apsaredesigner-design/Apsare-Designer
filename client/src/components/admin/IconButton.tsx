/**
 * IconButton: a square 44px button with only an icon. `label` is required and
 * becomes the aria-label and the tooltip (title).
 *
 *   <IconButton label="Delete image" onClick={remove}><TrashIcon /></IconButton>
 *   <IconButton label="Open menu" variant="ghost" tone="light">…</IconButton>
 *
 * variant: "ghost" (default) | "secondary" (hairline border) | "danger"
 */
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx, focusRing } from "./styles";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
  variant?: "ghost" | "secondary" | "danger";
  /** "light" for use on the dark sidebar. */
  tone?: "dark" | "light";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", tone = "dark", className, type = "button", title, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        "inline-grid size-11 shrink-0 place-items-center rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5",
        focusRing,
        variant === "ghost" && (tone === "light" ? "text-ivory/80 hover:bg-white/10 hover:text-ivory" : "text-ink/65 hover:bg-ink/5 hover:text-ink"),
        variant === "secondary" && "border border-ink/15 bg-white text-ink/75 hover:border-ink/30 hover:text-ink",
        variant === "danger" && "text-sale hover:bg-sale/10",
        className,
      )}
      {...props}
    />
  );
});
