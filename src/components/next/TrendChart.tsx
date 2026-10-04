import type { BiomarkerInterpretation } from "@/lib/engine/types";

export interface TrendPoint {
  /** ISO date the sample was collected, or null when the report did not state one. */
  date: string | null;
  interp: BiomarkerInterpretation;
}

const W = 600;
const H = 150;
const PAD_Y = 22;
const X_FIRST = 150;
const X_LAST = 450;

/**
 * Two measured points and nothing else: the segment joins them, and nothing extends beyond either point.
 * The lab range from the report is shaded for context.
 */
export function TrendChart({ first, second }: { first: TrendPoint; second: TrendPoint }) {
  const points = [first, second].filter((p) => p.interp.value !== null);
  const lab = first.interp.labRange ?? second.interp.labRange;
  const unit = first.interp.unit;
  const values = points.map((p) => p.interp.value as number);
  const lo = Math.min(...values, lab?.low ?? Infinity);
  const hi = Math.max(...values, lab?.high ?? -Infinity);
  const span = hi - lo || 1;
  const min = lo - span * 0.12;
  const max = hi + span * 0.12;
  const y = (v: number) => PAD_Y + (1 - (v - min) / (max - min)) * (H - 2 * PAD_Y);
  const xs = [X_FIRST, X_LAST];
  const dateText = (p: TrendPoint) => p.date ?? "date not stated";
  const ariaLabel =
    `${first.interp.label}, measured values: ` +
    points.map((p) => `${p.interp.value} ${unit} on ${dateText(p)}`).join(", ") +
    (lab ? `. Lab range ${lab.low ?? "no lower limit"} to ${lab.high ?? "no upper limit"} ${unit}.` : ".");

  return (
    <figure data-testid="trend-chart" className="rounded-2xl border border-teal/15 bg-ivory-deep/50 p-5">
      <figcaption className="font-display text-xl font-semibold text-teal">
        {first.interp.label} <span className="text-base font-normal text-ink-muted">({unit})</span>
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
            <text x={W - 6} y={y(Math.min(max, lab.high ?? max)) + 14} textAnchor="end" fontSize={12} fill="var(--color-ink-muted)">
              Lab range {lab.low ?? "…"}–{lab.high ?? "…"}
            </text>
          </>
        )}
        {points.length === 2 && (
          <line
            x1={xs[0]}
            y1={y(values[0])}
            x2={xs[1]}
            y2={y(values[1])}
            stroke="var(--color-ink)"
            strokeWidth={2}
          />
        )}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              data-testid="trend-point"
              cx={xs[i]}
              cy={y(p.interp.value as number)}
              r={8}
              fill="var(--color-ivory)"
              stroke="var(--color-ink)"
              strokeWidth={3}
            />
            <text x={xs[i]} y={y(p.interp.value as number) - 16} textAnchor="middle" fontSize={16} fontWeight={600} fill="var(--color-ink)">
              {p.interp.value}
            </text>
          </g>
        ))}
      </svg>
      <dl className="mt-1 grid grid-cols-2 text-center text-sm text-ink-muted">
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
