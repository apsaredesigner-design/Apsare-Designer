/**
 * Shared class strings for the admin kit, so every control has the same focus ring,
 * field chrome and card surface. Also `cx()` for joining conditional classes.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600";

/** Text inputs, selects and textareas. 44px min height. */
export const fieldBase =
  "w-full rounded-md border border-ink/15 bg-white px-3 text-sm text-ink placeholder:text-ink/40 transition-colors hover:border-ink/30 focus:border-sage-600 focus:outline-2 focus:outline-offset-0 focus:outline-sage-600/30 disabled:cursor-not-allowed disabled:bg-ivory disabled:text-ink/50 aria-[invalid=true]:border-sale aria-[invalid=true]:focus:outline-sale/25";

/** White card with a hairline border. */
export const card = "rounded-xl border border-ink/10 bg-white";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
