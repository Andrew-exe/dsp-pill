import { Sachet, type SachetMode } from "@/components/formula/Sachet";
import { formatQuantity } from "@/lib/client/formatAmount";
import { NUTRIENT_IDS } from "@/lib/domain/types";
import { INGREDIENT_NAMES, type AssessmentResult } from "@/lib/safety/policy";

/** The only states in which amounts may be printed. */
function stateLabel(r: AssessmentResult): string | null {
  if (r.formulation === null) return r.status === "incomplete" ? "Incomplete input" : "Review required";
  return r.status === "ready" ? null : "Review required";
}

function sachetMode(r: AssessmentResult): SachetMode {
  const items = r.formulation?.items ?? [];
  return items.length === 0 ? "empty" : r.status === "ready" ? "final" : "draft";
}

function amountFor(r: AssessmentResult, nutrient: (typeof NUTRIENT_IDS)[number]): string {
  const item = r.formulation?.items.find((i) => i.nutrient === nutrient);
  return item ? formatQuantity(nutrient, item.amount) : "Not included";
}

export function FormulaComparison({ v1, v2 }: { v1: AssessmentResult; v2: AssessmentResult }) {
  const s1 = stateLabel(v1);
  const s2 = stateLabel(v2);
  // If either formula is under review, no amounts are compared at all.
  const blocked = s1 !== null || s2 !== null;

  return (
    <div className="grid items-center gap-x-10 gap-y-6 lg:grid-cols-[auto_1fr]">
      <div className="grid grid-cols-2 justify-items-center gap-4 sm:gap-6">
        {[
          { label: "Formula v1", result: v1, version: "v1" as const },
          { label: "Formula v2", result: v2, version: "v2" as const },
        ].map(({ label, result, version }) => (
          <div key={version} className="w-full max-w-[190px] sm:w-[190px]">
            <p className="mb-2 text-center font-display text-base font-semibold text-teal">{label}</p>
            <Sachet items={result.formulation?.items ?? []} version={version} compact caption={false} mode={sachetMode(result)} />
          </div>
        ))}
      </div>

      <div>
      <div className="relative overflow-x-auto">
        <table data-testid="comparison-table" className="w-full border-collapse text-left">
          <caption className="sr-only">Synthetic comparison of the two simulated daily formulations, per ingredient.</caption>
          <thead>
            <tr className="border-b-2 border-teal/30 text-sm text-ink-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">Ingredient</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Formula v1</th>
              <th scope="col" className="py-2 font-semibold">Formula v2</th>
            </tr>
          </thead>
          <tbody>
            {NUTRIENT_IDS.map((n) => (
              <tr key={n} className="border-b border-teal/15">
                <th scope="row" className="py-2.5 pr-4 font-semibold">{INGREDIENT_NAMES[n]}</th>
                <td className="py-2.5 pr-4 tabular-nums">
                  {blocked ? <ReviewCell text={s1} /> : amountFor(v1, n)}
                </td>
                <td className="py-2.5 tabular-nums">{blocked ? <ReviewCell text={s2} /> : amountFor(v2, n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {blocked && (
        <p className="mt-3 text-sm text-ink-muted">
          Amounts are not compared while either formulation is held for review or incomplete.
        </p>
      )}
      </div>
    </div>
  );
}

function ReviewCell({ text }: { text: string | null }) {
  return <span className="font-semibold text-amber-ink">{text ?? "Not shown"}</span>;
}
