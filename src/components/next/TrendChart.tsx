import { formatBiomarkerRange, formatBiomarkerValue } from "@/lib/client/formatAmount";
import type { BiomarkerInterpretation } from "@/lib/engine/types";

export interface TrendPoint {
  /** ISO date the sample was collected, or null when the report did not state one. */
  date: string | null;
  interp: BiomarkerInterpretation;
}

const W = 200;
const H = 96;
const PAD_Y = 20;
const X_FIRST = 44;
const X_LAST = 156;

/**
 * Two measured points and nothing else: the segment joins them, and nothing extends beyond either point.
 * The lab range from the report is shaded for context.
 */
export function TrendChart({ first, second }: { first: TrendPoint; second: TrendPoint }) {
  // Each point keeps its own x position, so a missing first reading never moves the second onto its date.
  const points = [
    { p: first, x: X_FIRST },
    { p: second, x: X_LAST },
  ].filter((e) => e.p.interp.value !== null);
  const lab = first.interp.labRange ?? second.interp.labRange;
  const unit = first.interp.unit;
  const values = points.map((e) => e.p.interp.value as number);
  const lo = Math.min(...values, lab?.low ?? Infinity);
  const hi = Math.max(...values, lab?.high ?? -Infinity);
  const span = hi - lo || 1;
  const min = lo - span * 0.12;
  const max = hi + span * 0.12;
  const y = (v: number) => PAD_Y + (1 - (v - min) / (max - min)) * (H - 2 * PAD_Y);
  const fmt = (v: number) => formatBiomarkerValue(first.interp.id, v);
  const dateText = (p: TrendPoint) => p.date ?? "date not stated";
  const ariaLabel =
    `${first.interp.label}, measured values: ` +
    points.map((e) => `${fmt(e.p.interp.value as number)} ${unit} on ${dateText(e.p)}`).join(", ") +
    (lab ? `. Lab range ${formatBiomarkerRange(first.interp.id, lab)} ${unit}.` : ".");

  return (
    <figure data-testid="trend-chart" className="rounded-xl border border-teal/15 bg-ivory-deep/50 p-3">
      <figcaption className="font-display text-base font-semibold leading-tight text-teal">
        {first.interp.label} <span className="block font-sans text-xs font-normal text-ink-muted">{unit}</span>
      </figcaption>
      <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full overflow-visible">
        {lab && (
          <>
            <rect
              data-testid="trend-lab-range"
              x={0}
              width={W}
              y={y(Math.min(max, lab.high ?? max))}
              height={Math.max(2, y(Math.max(min, lab.low ?? min)) - y(Math.min(max, lab.high ?? max)))}
              fill="var(--color-teal-soft)"
              opacity={0.75}
            />
          </>
        )}
        {points.length === 2 && (
          <line
            x1={points[0].x}
            y1={y(values[0])}
            x2={points[1].x}
            y2={y(values[1])}
            stroke="var(--color-ink)"
            strokeWidth={1.5}
          />
        )}
        {points.map(({ p, x }, i) => (
          <g key={i}>
            <circle
              data-testid="trend-point"
              cx={x}
              cy={y(p.interp.value as number)}
              r={5}
              fill="var(--color-ivory)"
              stroke="var(--color-ink)"
              strokeWidth={2}
            />
            <text x={x} y={y(p.interp.value as number) - 10} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--color-ink)">
              {fmt(p.interp.value as number)}
            </text>
          </g>
        ))}
      </svg>
      <dl className="mt-1 grid grid-cols-2 text-center text-[11px] tabular-nums text-ink-muted">
        {[first, second].map((p, i) => (
          <div key={i}>
            <dt className="sr-only">Sample {i + 1}</dt>
            <dd>{dateText(p)}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
