"use client";
/**
 * DonutChart: a part-to-whole ring in inline SVG, with a legend that carries
 * every label, value and share (so colour is never the only cue).
 *
 *   <DonutChart
 *     title="Orders by status"
 *     data={stats.ordersByStatus.map((s) => ({ label: ORDER_STATUS_TEXT[s.status], value: s.count, color: ORDER_STATUS_COLOR[s.status] }))}
 *     centerLabel="orders"
 *   />
 *
 * Accessibility: role="img" SVG with <title>/<desc> and a visually hidden data table.
 * Hovering a segment or legend row highlights it and shows its value in the centre
 * (the legend is decorative for screen readers, which get the table instead). Segments are separated by a 2px surface gap.
 */
import { useId, useState } from "react";
import { cx } from "./styles";

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  title: string;
  description?: string;
  data: DonutDatum[];
  centerLabel?: string;
  formatValue?: (v: number) => string;
  size?: number;
  showTitle?: boolean;
  className?: string;
}

export function DonutChart({
  title,
  description,
  data,
  centerLabel = "total",
  formatValue = (v) => v.toLocaleString("en-IN"),
  size = 184,
  showTitle = true,
  className,
}: DonutChartProps) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = data.filter((d) => d.value > 0).length > 1 ? 2 : 0;
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  const lengths = data.map((d) => (total ? (d.value / total) * c : 0));
  const arcs = data.map((d, i) => ({
    i,
    d,
    start: lengths.slice(0, i).reduce((a, b) => a + b, 0),
    len: Math.max(0, lengths[i] - gap),
  }));

  const shown = active !== null ? data[active] : null;

  return (
    <figure className={cx("m-0 @container", className)}>
      {showTitle && (
        <figcaption className="mb-4">
          <p className="font-display text-xl font-semibold text-ink">{title}</p>
          {description && <p className="text-xs text-ink/55">{description}</p>}
        </figcaption>
      )}
      <div className="flex flex-col items-center gap-6 @md:flex-row @md:items-center">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
            <title id={`${id}-t`}>{title}</title>
            <desc id={`${id}-d`}>
              {data.map((d) => `${d.label}: ${formatValue(d.value)} (${pct(d.value)}%)`).join("; ")}. Total {formatValue(total)}.
            </desc>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1b1b18" strokeOpacity={0.06} strokeWidth={stroke} />
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              {arcs.map(({ i, d, start, len }) =>
                len > 0 ? (
                  <circle
                    key={d.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={active === i ? stroke + 4 : stroke}
                    strokeDasharray={`${len} ${c - len}`}
                    strokeDashoffset={-start}
                    opacity={active === null || active === i ? 1 : 0.35}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    className="transition-[opacity,stroke-width] duration-150"
                  />
                ) : null,
              )}
            </g>
          </svg>
          <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-3xl leading-none font-semibold text-ink lining-nums tabular-nums">
              {formatValue(shown ? shown.value : total)}
            </span>
            <span className="mt-1 max-w-[7rem] text-[11px] tracking-wide text-ink/55 uppercase">{shown ? shown.label : centerLabel}</span>
          </div>
        </div>

        <ul aria-hidden className="grid w-full grid-cols-1 gap-0.5 text-sm">
          {data.map((d, i) => (
            <li key={d.label}>
              <span
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                className={cx(
                  "flex min-h-8 items-center gap-2.5 rounded px-2 transition-colors",
                  active === i ? "bg-ink/5" : "",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 text-ink/75">{d.label}</span>
                <span className="font-semibold text-ink tabular-nums">{formatValue(d.value)}</span>
                <span className="w-10 text-right text-xs text-ink/45 tabular-nums">{pct(d.value)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Value</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{formatValue(d.value)}</td>
              <td>{pct(d.value)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
