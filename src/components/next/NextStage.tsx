"use client";

import { useEnsureAssessment } from "@/components/studio/useEnsureAssessment";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
import { BIOMARKER_IDS } from "@/lib/domain/types";
import { FOLLOWUP_V2_BIOMARKERS } from "@/fixtures/scenarios";
import { FormulaComparison } from "./FormulaComparison";
import { TrendChart } from "./TrendChart";

const NOTE =
  "Synthetic comparison. Measured values only — this does not show that the formula caused any change and does not predict future levels.";

export function NextStage() {
  const { state, dispatch, requestAssessment } = useWalkthrough();
  const { result, followUp } = state;
  useEnsureAssessment();

  const v2 = followUp?.result ?? null;
  const dateOf = (id: (typeof BIOMARKER_IDS)[number]) =>
    state.biomarkers?.find((b) => b.id === id)?.collectedOn ?? state.collectedOn ?? null;
  const dateV2 = (id: (typeof BIOMARKER_IDS)[number]) => followUp?.biomarkers.find((b) => b.id === id)?.collectedOn ?? null;

  return (
    <section aria-labelledby="stage-heading">
      <h2 id="stage-heading" tabIndex={-1} className="font-display text-4xl font-semibold text-teal outline-none">
        Your Next Formula
      </h2>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">
        Future tests can inform a revised formulation. Load a synthetic report from eight weeks later to see two
        measured points per biomarker and a second simulated formula, built by the same fixed demonstration policy
        from the same profile and supplements.
      </p>

      <p
        data-testid="comparison-note"
        className="mt-8 max-w-3xl rounded-2xl border-l-4 border-amber bg-amber-soft/60 px-6 py-4 font-display text-xl font-semibold leading-snug text-teal"
      >
        {NOTE}
      </p>

      {!followUp && (
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <button
            type="button"
            onClick={() => dispatch({ type: "loadFollowUp", biomarkers: FOLLOWUP_V2_BIOMARKERS })}
            className="rounded-full bg-teal px-8 py-3.5 text-lg font-semibold text-ivory hover:bg-teal/90"
          >
            Load 8-week follow-up report (synthetic)
          </button>
          <a
            href="/reports/dsp-pill-synthetic-report-week8.pdf"
            download
            className="font-semibold text-teal underline underline-offset-4 hover:text-teal/80"
          >
            Download the synthetic week-8 report (PDF)
          </a>
        </div>
      )}
      {followUp && (
        <p className="mt-6 text-sm text-ink-muted">
          Loaded synthetic 8-week follow-up.{" "}
          <a
            href="/reports/dsp-pill-synthetic-report-week8.pdf"
            download
            className="font-semibold text-teal underline underline-offset-4"
          >
            Download the synthetic week-8 report (PDF)
          </a>
        </p>
      )}

      {followUp?.error && (
        <div role="alert" className="mt-8 rounded-2xl border border-danger/40 bg-danger-soft p-6">
          <p className="text-lg font-semibold text-danger">The follow-up could not be calculated.</p>
          <p className="mt-1 text-ink">{followUp.error}</p>
          <button
            type="button"
            onClick={() => requestAssessment("followUp")}
            className="mt-4 rounded-full bg-teal px-6 py-2.5 font-semibold text-ivory hover:bg-teal/90"
          >
            Try again
          </button>
        </div>
      )}

      {followUp && !followUp.error && !(v2 && result) && (
        <p role="status" className="mt-8 text-lg text-ink-muted">
          Calculating the follow-up…
        </p>
      )}

      {followUp && v2 && result && (
        <div className="mt-10 space-y-12">
          <div>
            <h3 className="font-display text-2xl font-semibold text-teal">Measured values (synthetic)</h3>
            <p className="mt-1 text-ink-muted">Two dated measurements per biomarker; the shaded band is the lab range from the report.</p>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {BIOMARKER_IDS.map((id) => (
                <TrendChart
                  key={id}
                  first={{ date: dateOf(id), interp: result.interpretations.find((i) => i.id === id)! }}
                  second={{ date: dateV2(id), interp: v2.interpretations.find((i) => i.id === id)! }}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-2xl font-semibold text-teal">Formula v1 and Formula v2 (synthetic)</h3>
            <div className="mt-5">
              <FormulaComparison v1={result} v2={v2} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
