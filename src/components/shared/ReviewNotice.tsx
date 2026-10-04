import type { AssessmentResult } from "@/lib/safety/policy";
import { BIOMARKER_LABELS } from "@/lib/client/walkthrough";

/** Every plain-language reason the result is held, deduplicated by message. */
export function reviewReasons(result: AssessmentResult): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (message: string) => {
    const m = message.trim();
    if (m && !seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  };
  result.globalReviewReasons.forEach((r) => add(r.message));
  result.interpretations.forEach((i) => i.reviewReasons.forEach((r) => add(r.message)));
  const interpretationCodes = new Set(result.interpretations.flatMap((i) => i.reviewReasons.map((r) => r.code)));
  for (const d of result.decisions) {
    if (d.status !== "review_required" || d.reasonCodes.includes("global_review")) continue;
    // Decisions that merely restate an interpretation's reasons add nothing new.
    if (d.reasonCodes.every((c) => interpretationCodes.has(c))) continue;
    add(d.explanation);
  }
  result.missingBiomarkers.forEach((id) => add(`${BIOMARKER_LABELS[id]} was not provided, so no complete analysis is possible.`));
  return out;
}

export const NOT_PROOF_OF_SAFETY =
  "Passing these prototype screens is not proof of safety. Amounts follow a fixed demonstration policy.";

/**
 * A held result lists every plain-language reason. A ready result renders nothing: the Formula stage prints
 * the one-line NOT_PROOF_OF_SAFETY note instead of a box.
 */
export function ReviewNotice({ result, compact = false }: { result: AssessmentResult; compact?: boolean }) {
  const reasons = reviewReasons(result);
  if (result.status === "ready") return null;
  return (
    <aside
      data-testid="review-notice"
      className={`rounded-2xl border border-amber/60 bg-amber-soft ${compact ? "px-5 py-4" : "p-6"}`}
    >
      <h3 className={`font-display font-semibold text-ink ${compact ? "text-lg" : "text-2xl"}`}>Clinician review required</h3>
      <p className={`mt-1 text-ink ${compact ? "text-sm" : ""}`}>
        {result.formulation === null
          ? "No amounts are proposed until a clinician has reviewed the points below."
          : "Amounts held for review are not proposed; the rest are shown as a fixed demonstration policy."}
      </p>
      <ul className={`mt-2 list-disc space-y-1 pl-5 text-ink ${compact ? "text-sm" : ""}`}>
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {!compact && <p className="mt-3 text-sm text-ink-muted">{NOT_PROOF_OF_SAFETY}</p>}
    </aside>
  );
}
