/**
 * Button and ButtonLink: the admin kit's actions. 44px tall.
 *
 *   <Button onClick={save} loading={pending}>Save</Button>
 *   <Button variant="secondary" size="sm" icon={<PlusIcon />}>Add variant</Button>
 *   <Button variant="danger">Delete</Button>
 *   <ButtonLink href="/admin/products/new" icon={<PlusIcon />}>New product</ButtonLink>
 *
 * variant: "primary" (ink) | "secondary" (white, hairline) | "ghost" | "danger" | "gold"
 * size:    "md" (default) | "sm" (tighter padding, still a 44px target)
 * `loading` disables the button, shows a spinner and sets aria-busy.
 */
import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { Spinner } from "./icons";
import { cx, focusRing } from "./styles";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink/85",
  secondary: "border border-ink/15 bg-white text-ink hover:border-ink/30 hover:bg-ivory",
  ghost: "text-ink/75 hover:bg-ink/5 hover:text-ink",
  danger: "bg-sale text-white hover:bg-sale/90",
  gold: "bg-gold-500 text-ink hover:bg-gold-400",
};
const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-xs gap-1.5",
  md: "min-h-11 px-5 text-sm gap-2",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(
    "inline-flex select-none items-center justify-center rounded-md font-semibold tracking-wide whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    focusRing,
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading = false, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function ButtonLink({ variant, size, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
