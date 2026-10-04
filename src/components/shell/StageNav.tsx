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
    <nav aria-label="Walkthrough stages" className="mx-auto max-w-5xl px-6 py-5">
      <ol className="flex flex-wrap gap-2">
        {STAGES.map((stage, i) => {
          const isCurrent = stage.id === current;
          const isReachable = reachable.includes(stage.id);
          return (
            <li key={stage.id} className="flex-auto">
              <button
                type="button"
                disabled={!isReachable}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelect(stage.id)}
                className={
                  "flex w-full items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-left text-sm font-semibold transition-colors " +
                  (isCurrent
                    ? "border-teal bg-teal text-ivory"
                    : isReachable
                      ? "border-teal/30 bg-ivory-deep text-teal hover:border-teal"
                      : "cursor-not-allowed border-ink/10 bg-transparent text-ink-muted/60")
                }
              >
                <span aria-hidden className="tabular-nums opacity-60">{i + 1}</span>
                <span>{stage.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
