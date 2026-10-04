"use client";

import { MotionConfig } from "motion/react";
import { useState } from "react";
import { ReviewNotice } from "@/components/shared/ReviewNotice";
import { useEnsureAssessment } from "@/components/studio/useEnsureAssessment";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
import { BIOMARKER_IDS } from "@/lib/domain/types";
import { BiomarkerCard, NUTRIENT_FOR } from "./BiomarkerCard";
import { TryAChange } from "./TryAChange";

export function BiomarkersStage() {
  const { state, dispatch, requestAssessment } = useWalkthrough();
  const { result, resultState } = state;
  // Cards from the previous result stay mounted (marked pending, amounts hidden) so markers glide instead of remounting.
  const [last, setLast] = useState(result);
  if (result && result !== last) setLast(result);
  const shown = result ?? last;
  const pending = result === null;

  useEnsureAssessment();

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="stage-heading">
        <h2 id="stage-heading" tabIndex={-1} className="font-display text-4xl font-semibold text-teal outline-none">
          Your Biomarkers
        </h2>
        <p className="mt-2 max-w-3xl text-lg text-ink-muted">
          Each value against your lab range and our demo decision band, and the amount that follows.
        </p>

        <div className="mt-6 space-y-5">
          <TryAChange />

          {result && <ReviewNotice result={result} compact />}

          {resultState === "error" && (
            <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-soft p-6">
              <p className="text-lg font-semibold text-danger">The analysis could not be calculated.</p>
              <p className="mt-1 text-ink">{state.resultError}</p>
              <button
                type="button"
                onClick={() => requestAssessment()}
                className="mt-4 rounded-full bg-teal px-6 py-2.5 font-semibold text-ivory hover:bg-teal/90"
              >
                Try again
              </button>
            </div>
          )}

          {!shown && resultState !== "error" && (
            <div aria-busy="true" className="space-y-5">
              <p role="status" className="text-lg text-ink-muted">
                Calculating your analysis…
              </p>
              {BIOMARKER_IDS.map((id) => (
                <div key={id} aria-hidden className="h-48 animate-pulse rounded-2xl bg-ink/5" />
              ))}
            </div>
          )}

          {shown && resultState !== "error" && (
            <div className="grid gap-4 lg:grid-cols-2">
              {BIOMARKER_IDS.map((id) => {
                const interp = shown.interpretations.find((i) => i.id === id)!;
                const nutrient = NUTRIENT_FOR[id];
                const decision = nutrient ? (shown.decisions.find((d) => d.nutrient === nutrient) ?? null) : null;
                return <BiomarkerCard key={id} interp={interp} decision={decision} pending={pending} />;
              })}
              {result && (
                <div className="flex items-center justify-end lg:justify-center">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "goTo", stage: "formula" })}
                    className="rounded-full bg-teal px-7 py-3 text-lg font-semibold text-ivory hover:bg-teal/90"
                  >
                    See my formula
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </MotionConfig>
  );
}
