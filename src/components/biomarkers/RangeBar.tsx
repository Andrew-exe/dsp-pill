"use client";

import { motion } from "motion/react";
import { formatBiomarkerRange, formatBiomarkerValue } from "@/lib/client/formatAmount";
import type { BiomarkerId } from "@/lib/domain/types";
import type { BiomarkerInterpretation, PolicyBand } from "@/lib/engine/types";

/** Sensible drawing axis per biomarker; widened if the value or a range falls outside it. */
const AXIS: Record<BiomarkerId, [number, number]> = {
  vitaminD: [0, 80],
  b12: [0, 1000],
  folate: [0, 25],
  ferritin: [0, 450],
  magnesium: [0.5, 1.1],
};

const BAND_FILL: Record<PolicyBand, string> = {
  review_low: "var(--color-amber)",
  support: "var(--color-teal-soft)",
  adequate: "var(--color-teal)",
  review_high: "var(--color-amber)",
  review_range: "var(--color-amber)",
  missing: "var(--color-ink-muted)",
};

const BAND_WORDS: Record<PolicyBand, string> = {
  review_low: "below the demo decision band, held for review",
  support: "in the illustrative support band",
  adequate: "in the no-addition band",
  review_high: "above the demo decision band, held for review",
  review_range: "held for review because of the lab range",
  missing: "not provided",
};

const LAB_WORDS: Record<BiomarkerInterpretation["labStatus"], string> = {
  below: "below the lab range",
  within: "within the lab range",
  above: "above the lab range",
  no_range: "no lab range supplied",
  ambiguous_range: "lab range is ambiguous",
};

export interface DrawnSegment {
  band: PolicyBand;
  label: string;
  from: number;
  to: number;
}

export function layout(interp: BiomarkerInterpretation) {
  const [a0, a1] = AXIS[interp.id];
  const lab = interp.labRange;
  const known = [interp.value, lab?.low ?? null, lab?.high ?? null].filter((v): v is number => v !== null);
  const min = Math.min(a0, ...known);
  const max = Math.max(a1, ...known.map((v) => (v === interp.value ? v * 1.1 : v)));
  const labHigh = lab?.high ?? null;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  // Null edges depend on the lab range: walk the bands, closing each open edge at the lab range's upper limit.
  const segments: DrawnSegment[] = [];
  let cursor = min;
  interp.demoBands.forEach((b, i) => {
    const last = i === interp.demoBands.length - 1;
    const from = clamp(b.low ?? cursor);
    const to = clamp(b.high ?? (last ? max : (labHigh ?? max)));
    segments.push({ band: b.band, label: b.label, from, to: Math.max(from, to) });
    cursor = Math.max(from, to);
  });
  return { min, max, segments, lab: lab ? { from: clamp(lab.low ?? min), to: clamp(lab.high ?? max) } : null };
}

const W = 600;

const swatch = (band: PolicyBand) => ({ background: BAND_FILL[band], opacity: band.startsWith("review_") ? 0.55 : 1 });

/** The label of the demo decision band the value currently sits in. */
function currentBandLabel(interp: BiomarkerInterpretation): string {
  if (interp.band === "missing") return "not provided";
  if (interp.band === "review_range") return "held for review (lab range)";
  return interp.demoBands.find((b) => b.band === interp.band)?.label ?? BAND_WORDS[interp.band];
}

/** Every demo decision band, for the card's "Why this amount?" disclosure. */
export function BandLegend({ interp }: { interp: BiomarkerInterpretation }) {
  const { segments } = layout(interp);
  return (
    <div className="text-sm text-ink-muted">
      <p>
        <strong className="text-ink">Demo decision band</strong> (this prototype&apos;s fixed policy, not a lab range):
      </p>
      <ul className="mt-1 grid gap-x-4 sm:grid-cols-2">
        {segments.map((s) => (
          <li key={s.band} className="flex items-start gap-2">
            <span aria-hidden className="mt-1.5 inline-block h-2.5 w-4 shrink-0" style={swatch(s.band)} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RangeBar({ interp }: { interp: BiomarkerInterpretation }) {
  const { min, max, segments, lab } = layout(interp);
  const x = (n: number) => ((n - min) / (max - min)) * W;
  const ariaLabel =
    interp.value === null
      ? `${interp.label}: not provided.`
      : `${interp.label}: ${formatBiomarkerValue(interp.id, interp.value)} ${interp.unit}. ` +
        (interp.labRange
          ? `Lab range ${formatBiomarkerRange(interp.id, interp.labRange)} ${interp.unit}, ${LAB_WORDS[interp.labStatus]}. `
          : `${LAB_WORDS[interp.labStatus]}. `) +
        `Demo decision band: ${BAND_WORDS[interp.band]}.`;

  return (
    <figure className="mt-3">
      <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${W} 74`} className="w-full overflow-visible">
        {/* Lab range, supplied by the report */}
        <rect x={0} y={8} width={W} height={10} rx={5} fill="var(--color-ink)" opacity={0.06} />
        {lab && (
          <rect x={x(lab.from)} y={8} width={Math.max(2, x(lab.to) - x(lab.from))} height={10} rx={5} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
        )}
        {/* Demo decision band */}
        {segments.map((s) => (
          <rect key={s.band} data-band={s.band} x={x(s.from)} y={34} width={Math.max(0, x(s.to) - x(s.from))} height={20} fill={BAND_FILL[s.band]} opacity={s.band.startsWith("review_") ? 0.55 : 1} />
        ))}
        {interp.value !== null && (
          <motion.g initial={{ x: x(min) }} animate={{ x: x(interp.value) }} transition={{ type: "spring", stiffness: 140, damping: 22 }}>
            <line x1={0} x2={0} y1={2} y2={66} stroke="var(--color-ink)" strokeWidth={3} />
            <circle cx={0} cy={44} r={9} fill="var(--color-ivory)" stroke="var(--color-ink)" strokeWidth={3} />
          </motion.g>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-5 rounded-full border-2 border-ink" />
          <span>
            <strong className="font-semibold text-ink">Lab range</strong>{" "}
            {interp.labRange ? `${formatBiomarkerRange(interp.id, interp.labRange)} ${interp.unit}` : "none usable"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-4" style={swatch(interp.band)} />
          <span>
            <strong className="font-semibold text-ink">Demo band</strong>: {currentBandLabel(interp)}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
