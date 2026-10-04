import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatQuantity } from "@/lib/client/formatAmount";
import type { BiomarkerId, NutrientId } from "@/lib/domain/types";
import type { BiomarkerInterpretation } from "@/lib/engine/types";
import type { IngredientDecision } from "@/lib/safety/policy";
import { RangeBar } from "./RangeBar";

export const NUTRIENT_FOR: Record<BiomarkerId, NutrientId | null> = {
  vitaminD: "vitaminD",
  b12: "b12",
  folate: "folicAcid",
  ferritin: null,
  magnesium: "magnesium",
};

const dash = "—";

export function BiomarkerCard({
  interp,
  decision,
}: {
  interp: BiomarkerInterpretation;
  decision: IngredientDecision | null;
}) {
  const nutrient = NUTRIENT_FOR[interp.id];
  const fmt = (n: number | null) => (n === null || !nutrient ? dash : formatQuantity(nutrient, n));
  return (
    <article data-testid={`biomarker-card-${interp.id}`} className="rounded-2xl border border-ink/10 bg-white/70 p-6 sm:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-teal">{interp.label}</h3>
        <p className="text-xl font-semibold text-ink">
          {interp.value === null ? "Not provided" : `${interp.value} ${interp.unit}`}
        </p>
      </header>
      <RangeBar interp={interp} />
      <p className="mt-4 text-lg leading-relaxed text-ink">{interp.summary}</p>
      <div className="mt-4 border-l-4 border-teal/30 pl-4">
        <p className="font-semibold text-ink">Clinical context</p>
        <p className="mt-1 text-ink-muted">{interp.clinicalContext}</p>
      </div>

      <div className="mt-6 rounded-xl bg-ivory-deep p-5">
        {decision && nutrient ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-ink">{decision.ingredientName}</p>
              <StatusBadge status={decision.status} />
            </div>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-ink-muted">Formula amount</dt>
                <dd data-testid={`formula-amount-${nutrient}`} className="font-display text-2xl text-teal">
                  {decision.status === "included" ? fmt(decision.formulaAddition) : dash}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">Existing supplement, per day</dt>
                <dd className="text-xl text-ink">{formatQuantity(nutrient, decision.existingDaily)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">Combined daily amount</dt>
                <dd className="text-xl text-ink">{fmt(decision.combinedDaily)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-ink">{decision.explanation}</p>
            {interp.id === "magnesium" && (
              <p className="mt-2 text-ink-muted">
                Serum magnesium does not establish whole-body magnesium stores, so this is one data point, not a full picture.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-ink">Iron</p>
              <StatusBadge status={interp.band.startsWith("review_") || interp.band === "missing" ? "review_required" : "adequate"} />
            </div>
            <p className="mt-3 text-ink">
              Ferritin reflects iron stores. This prototype never adds iron automatically, because iron can build up
              and needs a clinician&apos;s judgment, so there is no iron in any formula here.
            </p>
          </>
        )}
      </div>
    </article>
  );
}
