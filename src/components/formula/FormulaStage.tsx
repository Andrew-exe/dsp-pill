"use client";

import { MotionConfig, motion } from "motion/react";
import { useId } from "react";
import { NOT_PROOF_OF_SAFETY, ReviewNotice } from "@/components/shared/ReviewNotice";
import { useEnsureAssessment } from "@/components/studio/useEnsureAssessment";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
import type { AssessmentResult } from "@/lib/safety/policy";
import { ManufacturingDialog } from "./ManufacturingDialog";
import { Sachet, type SachetMode } from "./Sachet";

function unavailableReason(result: AssessmentResult | null, failed: boolean): string | null {
  if (failed) return "Manufacturing simulation is unavailable because the analysis could not be calculated.";
  if (result === null) return "Manufacturing simulation is unavailable while the formulation is updating.";
  if (result.manufacturingAllowed) return null;
  if (result.status === "incomplete") return "Manufacturing simulation is unavailable because required biomarkers are missing.";
  if (result.status === "review_required") return "Manufacturing simulation is unavailable while clinician review is required.";
  return "Manufacturing simulation is unavailable because no ingredients are proposed.";
}

export function FormulaStage() {
  const { state, dispatch, requestAssessment } = useWalkthrough();
  const { result, resultState } = state;
  const reasonId = useId();
  useEnsureAssessment();

  const failed = resultState === "error";
  const items = result?.formulation?.items ?? [];
  const mode: SachetMode =
    result === null
      ? failed
        ? "unavailable"
        : "pending"
      : items.length === 0
        ? "empty"
        : result.status === "ready"
          ? "final"
          : "draft";
  const reason = unavailableReason(result, failed);

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="stage-heading">
        <h2 id="stage-heading" tabIndex={-1} className="font-display text-4xl font-semibold text-teal outline-none">
          Your Formula
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-ink-muted">
          Your biomarkers, context and supplements, as one simulated daily sachet.
        </p>

        <div className="mt-8 grid items-center gap-10 md:grid-cols-[minmax(0,380px)_1fr]">
          <motion.div
            key={mode === "pending" ? "pending" : "settled"}
            initial={{ y: -14, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
            aria-busy={mode === "pending"}
          >
            <Sachet items={items} version="v1" mode={mode} />
          </motion.div>

          <div className="space-y-6">
            {failed && (
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
            {result && <ReviewNotice result={result} />}

            <div>
              <ManufacturingDialog items={items} disabled={reason !== null} describedBy={reason ? reasonId : undefined} />
              {reason && (
                <p id={reasonId} className="mt-3 max-w-md text-sm text-ink-muted">
                  {reason}
                </p>
              )}
              {result?.status === "ready" && (
                <p data-testid="safety-note" className="mt-3 max-w-md text-sm text-ink-muted">
                  {NOT_PROOF_OF_SAFETY}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dispatch({ type: "goTo", stage: "biomarkers" })}
              className="font-semibold text-teal underline underline-offset-4 hover:text-teal/80"
            >
              Back to biomarkers
            </button>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
