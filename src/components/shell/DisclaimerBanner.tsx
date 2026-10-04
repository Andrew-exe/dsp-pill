export const DISCLAIMER_TEXT =
  "Synthetic demo data · Hackathon prototype · Not medical advice · Formulations are not clinically validated";

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="sticky top-0 z-50 border-b border-amber/40 bg-amber-soft px-6 py-2.5 text-center text-sm font-semibold tracking-wide text-ink"
    >
      {DISCLAIMER_TEXT}
    </div>
  );
}
