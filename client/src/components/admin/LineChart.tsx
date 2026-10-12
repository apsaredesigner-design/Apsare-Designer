"use client";
/**
 * LineChart: a single-series area/line chart in inline SVG.
 *
 *   <LineChart
 *     title="Sales, last 30 days" description="Daily sales in INR, excluding cancelled orders."
 *     data={stats.salesOverTime.map((d) => ({ label: formatDay(d.date), value: d.sales }))}
 *     valueLabel="Sales" formatValue={formatINR} formatAxis={formatCompactINR}
 *   />
 *
 * Accessibility: the SVG is role="img" with <title>/<desc>; a visually hidden table
 * holds every data point; the plot is focusable and ←/→ (Home/End) step through
 * points, announced via a live region. Hover shows a crosshair + tooltip.
 * Width follows the container (ResizeObserver); `height` is fixed (default 240).
 */
import { useEffect, useId, useRef, useState } from "react";
import { cx, focusRing } from "./styles";

export interface LinePoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  title: string;
  description?: string;
  data: LinePoint[];
  valueLabel?: string;
  formatValue?: (v: number) => string;
  formatAxis?: (v: number) => string;
  height?: number;
  /** Show the title visually above the chart (default true). */
  showTitle?: boolean;
  className?: string;
}

const PAD = { top: 16, right: 16, bottom: 30, left: 56 };

function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

export function LineChart({
  title,
  description,
  data,
  valueLabel = "Value",
  formatValue = (v) => v.toLocaleString("en-IN"),
  formatAxis,
  height = 240,
  showTitle = true,
  className,
}: LineChartProps) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const axis = formatAxis ?? formatValue;
  const n = data.length;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const rawMax = Math.max(0, ...data.map((d) => d.value));
  const step = rawMax > 0 ? niceStep(rawMax / 4) : 1;
  const max = rawMax > 0 ? Math.ceil(rawMax / step) * step : 4;
  const ticks = rawMax > 0 ? Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) : [0];

  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = n > 0 ? `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 90))));

  const point = active !== null ? data[active] : null;

  const onPointer = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const rel = (clientX - rect.left - PAD.left) / (innerW || 1);
    setActive(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (n === 0) return;
    const cur = active ?? -1;
    const next = e.key === "ArrowRight" ? Math.min(n - 1, cur + 1) : e.key === "ArrowLeft" ? Math.max(0, cur === -1 ? n - 1 : cur - 1) : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  };

  return (
    <figure className={cx("m-0", className)}>
      {showTitle && (
        <figcaption className="mb-4">
          <p className="font-display text-xl font-semibold text-ink">{title}</p>
          {description && <p className="text-xs text-ink/55">{description}</p>}
        </figcaption>
      )}
      <div
        ref={wrapRef}
        tabIndex={0}
        aria-label={`${title}. Use left and right arrow keys to read each point.`}
        aria-describedby={`${id}-live`}
        onKeyDown={onKey}
        onPointerMove={(e) => onPointer(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        className={cx("relative w-full touch-pan-y rounded-md", focusRing)}
        style={{ height }}
      >
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-labelledby={`${id}-t ${id}-d`} className="block overflow-visible">
            <title id={`${id}-t`}>{title}</title>
            <desc id={`${id}-d`}>
              {description ?? ""} {n} points from {data[0]?.label} to {data[n - 1]?.label}; highest {formatValue(rawMax)}.
            </desc>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7f8f5e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#7f8f5e" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#1b1b18" strokeOpacity={t === 0 ? 0.18 : 0.06} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink/50 text-[11px] tabular-nums">
                  {axis(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              // Every `labelEvery`-th label, plus the last one (skipping any label too close to it).
              const show = i === n - 1 || (i % labelEvery === 0 && n - 1 - i >= labelEvery / 2);
              if (!show) return null;
              return (
                <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-ink/50 text-[11px]">
                  {d.label}
                </text>
              );
            })}
            <path d={area} fill={`url(#${id}-fill)`} />
            <path d={line} fill="none" stroke="#63714a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {point && active !== null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} stroke="#1b1b18" strokeOpacity={0.25} strokeDasharray="3 3" />
                <circle cx={x(active)} cy={y(point.value)} r={5} fill="#63714a" stroke="#fff" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {rawMax === 0 && n > 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-ink/45">No sales in this period yet</p>
        )}
        {point && active !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-ink/10 bg-white px-3 py-2 text-xs whitespace-nowrap shadow-[0_8px_24px_-12px_rgba(27,27,24,0.35)]"
            style={{ left: Math.min(Math.max(x(active), 70), width - 70), top: y(point.value) - 12 }}
          >
            <p className="text-ink/55">{point.label}</p>
            <p className="font-semibold text-ink tabular-nums">
              {valueLabel}: {formatValue(point.value)}
            </p>
          </div>
        )}
      </div>
      <p id={`${id}-live`} aria-live="polite" className="sr-only">
        {point ? `${point.label}: ${formatValue(point.value)}` : ""}
      </p>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
