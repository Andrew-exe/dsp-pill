"use client";

export const STAGES = [
  { id: "start", label: "Your Starting Point" },
  { id: "context", label: "Your Context" },
  { id: "biomarkers", label: "Your Biomarkers" },
  { id: "formula", label: "Your Formula" },
  { id: "next", label: "Your Next Formula" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export interface StageNavProps {
  current: StageId;
  reachable: StageId[];
  onSelect(id: StageId): void;
}

export function StageNav({ current, reachable, onSelect }: StageNavProps) {
  return (
    <nav aria-label="Walkthrough stages" className="mx-auto max-w-5xl px-6 py-6">
      <ol className="flex flex-wrap gap-3">
        {STAGES.map((stage, i) => {
          const isCurrent = stage.id === current;
          const isReachable = reachable.includes(stage.id);
          return (
            <li key={stage.id} className="flex-1 basis-40">
              <button
                type="button"
                disabled={!isReachable}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelect(stage.id)}
                className={
                  "w-full rounded-xl border px-4 py-3 text-left transition-colors " +
                  (isCurrent
                    ? "border-teal bg-teal text-ivory"
                    : isReachable
                      ? "border-teal/30 bg-ivory-deep text-teal hover:border-teal"
                      : "cursor-not-allowed border-ink/10 bg-transparent text-ink-muted/60")
                }
              >
                <span className="block text-xs font-semibold uppercase tracking-widest opacity-70">
                  Step {i + 1}
                </span>
                <span className="block font-display text-lg leading-tight">{stage.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
