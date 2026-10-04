import type { IngredientDecision } from "@/lib/safety/policy";

type Status = IngredientDecision["status"] | "adequate";

const COPY: Record<Status, { text: string; className: string }> = {
  included: { text: "Included", className: "bg-teal text-ivory" },
  not_included: { text: "Not included", className: "bg-ink/10 text-ink" },
  adequate: { text: "No addition needed", className: "bg-teal-soft text-teal" },
  covered_by_existing: { text: "Covered by existing supplement", className: "bg-teal-soft text-teal" },
  review_required: { text: "Clinician review required", className: "bg-amber-soft text-amber-ink" },
  missing_data: { text: "Missing data", className: "bg-danger-soft text-danger" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { text, className } = COPY[status];
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${className}`}>{text}</span>;
}
