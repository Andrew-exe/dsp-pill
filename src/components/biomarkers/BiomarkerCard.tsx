import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBiomarkerValue, formatQuantity } from "@/lib/client/formatAmount";
import type { BiomarkerId, NutrientId } from "@/lib/domain/types";
import type { BiomarkerInterpretation } from "@/lib/engine/types";
import type { IngredientDecision } from "@/lib/safety/policy";
import { BandLegend, RangeBar } from "./RangeBar";

export const NUTRIENT_FOR: Record<BiomarkerId, NutrientId | null> = {
  vitaminD: "vitaminD",
  b12: "b12",
  folate: "folicAcid",
  ferritin: null,
  magnesium: "magnesium",
};

const dash = "—";
const updating = "Updating…";

/** The visible one-line interpretation: the band sentence, without the policy note and review reasons (both shown elsewhere). */
function headline(summary: string): string {
  return summary.split(/(?<=\.)\s/)[0];
}

export function BiomarkerCard({
  interp,
  decision,
  pending = false,
}: {
  interp: BiomarkerInterpretation;
  decision: IngredientDecision | null;
  /** The shown result is from before the latest edit: amounts are hidden until the fresh one arrives. */
  pending?: boolean;
}) {
  const nutrient = NUTRIENT_FOR[interp.id];
  const fmt = (n: number | null) => (n === null || !nutrient ? dash : formatQuantity(nutrient, n));
  const hasDecision = decision !== null && nutrient !== null;
  const ironStatus = interp.band.startsWith("review_") || interp.band === "missing" ? "review_required" : "adequate";
  const amount = pending ? updating : hasDecision && decision.status === "included" ? fmt(decision.formulaAddition) : dash;
  const showExisting = hasDecision && !pending && decision.existingDaily > 0;

  return (
    <article
      data-testid={`biomarker-card-${interp.id}`}
      aria-busy={pending}
      className="flex flex-col rounded-2xl border border-ink/10 bg-white/70 p-5"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold leading-tight text-teal">{interp.label}</h3>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
            {interp.value === null ? "Not provided" : `${formatBiomarkerValue(interp.id, interp.value)} ${interp.unit}`}
          </p>
          {interp.value !== null && interp.rawValue !== null && interp.rawUnit && interp.rawUnit !== interp.unit && (
            <p className="text-xs text-ink-muted">
              Entered as {interp.rawValue.toLocaleString("en-US", { maximumFractionDigits: 4 })} {interp.rawUnit}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          {pending ? (
            <span className="rounded-full bg-ink/10 px-3 py-1 text-sm font-semibold text-ink-muted">{updating}</span>
          ) : hasDecision ? (
            <StatusBadge status={decision.status} />
          ) : interp.id === "ferritin" ? (
            <StatusBadge status={ironStatus} />
          ) : null}
          {nutrient && (
            <p className="leading-tight">
              <span className="sr-only">{hasDecision ? decision.ingredientName : ""} formula amount: </span>
              <span
                data-testid={`formula-amount-${nutrient}`}
                className={`font-display text-2xl font-semibold tabular-nums ${amount === dash ? "text-ink-muted/60" : "text-teal"}`}
              >
                {amount}
              </span>
            </p>
          )}
        </div>
      </header>

      <RangeBar interp={interp} />

      <p className="mt-3 text-[15px] leading-snug text-ink">{headline(interp.summary)}</p>
      {interp.id === "ferritin" && (
        <p className="mt-1 text-sm text-ink-muted">Iron is never added automatically; it needs a clinician&apos;s judgment.</p>
      )}
      {interp.id === "magnesium" && (
        <p className="mt-1 text-sm text-ink-muted">Serum magnesium does not establish whole-body stores.</p>
      )}
      {showExisting && (
        <p className="mt-1 text-sm tabular-nums text-ink-muted">
          Existing {formatQuantity(nutrient!, decision!.existingDaily)} · Combined {fmt(decision!.combinedDaily)}
        </p>
      )}

      <details className="group mt-auto pt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-teal underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
          Why this amount?
        </summary>
        <div className="mt-3 space-y-4 border-t border-ink/10 pt-3">
          {hasDecision ? (
            <div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-ink-muted">Formula amount</dt>
                  <dd className="font-semibold text-ink">{amount}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Existing supplement, per day</dt>
                  <dd className="font-semibold text-ink">{pending ? updating : formatQuantity(nutrient!, decision!.existingDaily)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Combined daily amount</dt>
                  <dd className="font-semibold text-ink">{pending ? updating : fmt(decision!.combinedDaily)}</dd>
                </div>
              </dl>
              {!pending && <p className="mt-2 text-sm text-ink">{decision!.explanation}</p>}
            </div>
          ) : interp.id === "ferritin" ? (
            <p className="text-sm text-ink">
              Ferritin reflects iron stores. This prototype never adds iron automatically, because iron can build up and
              needs a clinician&apos;s judgment, so there is no iron in any formula here.
            </p>
          ) : (
            <p className="text-sm text-ink-muted">No decision available.</p>
          )}
          {interp.summary.length > headline(interp.summary).length && (
            <p className="text-sm text-ink">{interp.summary.slice(headline(interp.summary).length).trim()}</p>
          )}
          <BandLegend interp={interp} />
          <div className="border-l-4 border-teal/30 pl-3 text-sm">
            <p className="font-semibold text-ink">Clinical context</p>
            <p className="mt-0.5 text-ink-muted">{interp.clinicalContext}</p>
          </div>
        </div>
      </details>
    </article>
  );
}
