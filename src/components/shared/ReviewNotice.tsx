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

export function ReviewNotice({ result }: { result: AssessmentResult }) {
  const reasons = reviewReasons(result);
  const held = result.status !== "ready";
  return (
    <aside
      data-testid={held ? "review-notice" : "safety-note"}
      className={`rounded-2xl border p-6 ${held ? "border-amber/60 bg-amber-soft" : "border-teal/20 bg-ivory-deep"}`}
    >
      <h3 className="font-display text-2xl font-semibold text-ink">
        {held ? "Clinician review required" : "What passing these screens means"}
      </h3>
      {held && (
        <>
          <p className="mt-2 text-ink">
            {result.formulation === null
              ? "No amounts are proposed until a clinician has reviewed the points below."
              : "Amounts held for review are not proposed; the rest are shown as a fixed demonstration policy."}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-sm text-ink-muted">
        Passing these prototype screens is not proof that anything is safe for you. Amounts come from a fixed
        demonstration policy, not a treatment recommendation.
      </p>
    </aside>
  );
}
