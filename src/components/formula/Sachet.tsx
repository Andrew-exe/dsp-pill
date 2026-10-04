import { useId } from "react";
import { formatItem } from "@/lib/client/formatAmount";
import type { FormulationItem } from "@/lib/safety/policy";

export type SachetMode = "final" | "draft" | "empty" | "pending" | "unavailable";

interface SachetProps {
  items: FormulationItem[];
  version: "v1" | "v2";
  compact?: boolean;
  /** Print "Total daily formulation: one simulated sachet" under the pouch (the main sachet always does). */
  caption?: boolean;
  /** final: ready formula. draft: review required, remaining items only. empty/pending/unavailable: no amounts are printed. */
  mode?: SachetMode;
}

const W = 320;
const H = 440;
const TOOTH = 10;

/** A horizontal crimped edge: a zigzag of small teeth running from x0 to x1 at height y. */
function crimp(y: number, x0: number, x1: number) {
  const pts: string[] = [];
  const n = Math.round(Math.abs(x1 - x0) / TOOTH);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push(`L${x.toFixed(1)} ${(y + (i % 2 === 0 ? 0 : 5)).toFixed(1)}`);
  }
  return pts.join(" ");
}

const POUCH_PATH =
  `M14 16 ${crimp(16, 14, 306)} ` +
  `C314 120 316 320 306 424 ` +
  `${crimp(424, 306, 14)} ` +
  `C4 320 6 120 14 16 Z`;

/** The decorative pouch. The printed label is HTML laid over it so text wraps and stays selectable. */
function Pouch({ ghost }: { ghost: boolean }) {
  // Several sachets can share a page (v1 and v2), so the SVG ids must be unique per instance.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const foil = `sachet-foil-${uid}`;
  const sheen = `sachet-sheen-${uid}`;
  const clip = `sachet-clip-${uid}`;
  const seal = `sachet-seal-${uid}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={foil} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0a3836" />
          <stop offset="0.22" stopColor="#15625e" />
          <stop offset="0.5" stopColor="#0f4c4a" />
          <stop offset="0.85" stopColor="#0b3f3d" />
          <stop offset="1" stopColor="#082f2e" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.16" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.24" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={POUCH_PATH} />
        </clipPath>
        <pattern id={seal} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 6 L6 0" stroke="#fff" strokeOpacity="0.16" strokeWidth="1" />
        </pattern>
      </defs>
      <ellipse cx="160" cy="432" rx="130" ry="7" fill="#1d2b2a" opacity={ghost ? 0.05 : 0.14} />
      <g opacity={ghost ? 0.35 : 1}>
        <path d={POUCH_PATH} fill={`url(#${foil})`} />
        <g clipPath={`url(#${clip})`}>
          <rect x="0" y="0" width={W} height="52" fill={`url(#${seal})`} />
          <rect x="0" y="388" width={W} height="52" fill={`url(#${seal})`} />
          <line x1="0" y1="52" x2={W} y2="52" stroke="#fff" strokeOpacity="0.28" />
          <line x1="0" y1="388" x2={W} y2="388" stroke="#fff" strokeOpacity="0.28" />
          <rect x="0" y="0" width={W} height={H} fill={`url(#${sheen})`} />
          <rect x="0" y="52" width="14" height="336" fill="#000" opacity="0.1" />
          <rect x={W - 14} y="52" width="14" height="336" fill="#000" opacity="0.14" />
          <rect x="0" y="40" width={W} height="3" fill="#c98a1b" />
          <path d="M0 78 L9 84 L0 90 Z" fill="#082f2e" />
        </g>
        <path d={POUCH_PATH} fill="none" stroke="#082f2e" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function Sachet({ items, version, compact = false, caption = true, mode = "final" }: SachetProps) {
  const showAmounts = (mode === "final" || mode === "draft") && items.length > 0;
  const ghost = !showAmounts;
  const text = compact ? "text-[11px] leading-snug" : "text-sm leading-snug sm:text-base";

  return (
    <figure className="m-0 flex flex-col items-center">
      <div
        className={`relative w-full ${compact ? "max-w-[190px]" : "max-w-[360px]"}`}
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <Pouch ghost={ghost} />
        <div
          data-testid="sachet-label"
          className="absolute flex flex-col [container-type:inline-size] rounded-md bg-ivory px-[5%] py-[5%] text-ink shadow-[inset_0_0_0_1px_rgba(15,76,74,0.18)]"
          style={{ left: "9%", right: "9%", top: "17.5%", bottom: "16%" }}
        >
          {/* Sized from the label width (cqw) so the title never wraps before "· v1". */}
          <p data-testid="sachet-title" className="whitespace-nowrap font-display text-[6.2cqw] font-semibold leading-tight text-teal">
            dsp-pill Formula #1842 · {version}
          </p>
          <div className="my-[4%] h-px bg-teal/25" />
          {showAmounts ? (
            <ul className={`flex-1 space-y-[4%] ${text} font-medium`}>
              {items.map((item) => (
                <li key={item.nutrient} className="border-l-2 border-amber pl-2">
                  {formatItem(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`flex-1 ${text} text-ink-muted`} role={mode === "pending" ? "status" : undefined}>
              {mode === "pending" ? "Updating your formulation…" : mode === "unavailable" ? "Formulation unavailable" : "No formulation proposed"}
            </p>
          )}
          {mode === "draft" && showAmounts && (
            <p className={`mt-2 rounded bg-amber-soft px-2 py-1 font-semibold text-amber-ink ${compact ? "text-[10px]" : "text-xs"}`}>
              Draft — review required
            </p>
          )}
        </div>
      </div>
      {caption && (
        <figcaption className={`mt-4 text-center text-ink-muted ${compact ? "text-xs" : "text-sm"}`}>
          Total daily formulation: one simulated sachet
        </figcaption>
      )}
    </figure>
  );
}
