/**
 * Formatting helpers for the admin panel (Indian locale).
 *
 *   formatINR(52999)          → "₹52,999"
 *   formatINR(1234.5, true)   → "₹1,234.50"
 *   formatCompactINR(250000)  → "₹2.5L"
 *   formatNumber(12000)       → "12,000"
 *   formatDate(iso)           → "26 Sept 2026"
 *   formatDateTime(iso)       → "26 Sept 2026, 5:16 pm"
 */
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-IN");
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const shortDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export const formatINR = (value: number, paise = false) => (paise ? inrPaise : inr).format(value);
export const formatNumber = (value: number) => num.format(value);
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** For a plain `YYYY-MM-DD` store day (already IST): "26 Sept". */
export const formatDay = (ymd: string) => shortDay.format(new Date(`${ymd}T00:00:00Z`));

/** Short INR for axes: ₹950, ₹12K, ₹2.5L, ₹1.2Cr. */
export function formatCompactINR(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => (Math.round(n * 10) / 10).toString();
  if (abs >= 1e7) return `₹${trim(value / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(value / 1e5)}L`;
  if (abs >= 1e3) return `₹${trim(value / 1e3)}K`;
  return `₹${Math.round(value)}`;
}

/** "PENDING_REVIEW" → "Pending review". */
export const humanize = (value: string) => {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
