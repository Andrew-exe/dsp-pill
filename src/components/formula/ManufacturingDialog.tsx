"use client";

import { motion } from "motion/react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { formatItem } from "@/lib/client/formatAmount";
import type { FormulationItem } from "@/lib/safety/policy";

const STEPS = ["Formulation specification", "Simulated blending", "Simulated packaging", "Demo confirmation"] as const;
const ORDER_ID = "SIM-1842-v1";

interface Props {
  items: FormulationItem[];
  disabled: boolean;
  /** Id of the visible text explaining why the trigger is disabled. */
  describedBy?: string;
}

export function ManufacturingDialog({ items, disabled, describedBy }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setStep(0);
      }}
    >
      <Dialog.Trigger
        disabled={disabled}
        aria-describedby={describedBy}
        className="rounded-full bg-teal px-8 py-3.5 text-lg font-semibold text-ivory hover:bg-teal/90 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-muted"
      >
        Simulate manufacturing
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-ivory p-8 shadow-2xl">
          <p className="text-sm font-semibold text-amber-ink">
            Step {step + 1} of {STEPS.length}
          </p>
          <Dialog.Title className="mt-1 font-display text-3xl font-semibold text-teal">{STEPS[step]}</Dialog.Title>
          <Dialog.Description className="mt-2 text-ink-muted">
            A walk-through of what manufacturing would involve. Nothing is made, ordered or shipped.
          </Dialog.Description>

          <div className="mt-6 min-h-48" aria-live="polite">
            {step === 0 && (
              <ul data-testid="order-spec" className="space-y-2 text-lg">
                {items.map((item) => (
                  <li key={item.nutrient} className="rounded-xl border-l-4 border-amber bg-white px-4 py-3 font-medium">
                    {formatItem(item)}
                  </li>
                ))}
              </ul>
            )}
            {step === 1 && <Blending count={items.length} />}
            {step === 2 && <Packaging />}
            {step === 3 && (
              <div className="rounded-2xl border border-teal/25 bg-white p-6">
                <p className="text-sm text-ink-muted">Demo order reference</p>
                <p className="mt-1 font-display text-4xl font-semibold text-teal">{ORDER_ID}</p>
                <p className="mt-4 text-lg font-semibold text-ink">No real product is manufactured or shipped.</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <Dialog.Close className="rounded-full border border-teal/40 px-6 py-2.5 font-semibold text-teal hover:border-teal">
              {last ? "Done" : "Close"}
            </Dialog.Close>
            {!last && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-teal px-8 py-2.5 font-semibold text-ivory hover:bg-teal/90"
              >
                Next
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const DOTS = ["#c98a1b", "#15625e", "#8a5a0b", "#0f4c4a"];

/** Ingredient particles drift together into one mix. Static under reduced motion (via MotionConfig). */
function Blending({ count }: { count: number }) {
  return (
    <div>
      <svg viewBox="0 0 400 130" role="img" aria-label="Ingredients drawn together into a single blend" className="w-full">
        {Array.from({ length: count }).map((_, i) => {
          const y = 25 + (i * 80) / Math.max(1, count - 1 || 1);
          return (
            <motion.circle
              key={i}
              r={11}
              fill={DOTS[i % DOTS.length]}
              initial={{ cx: 40, cy: count === 1 ? 65 : y }}
              animate={{ cx: 290, cy: 65 }}
              transition={{ duration: 1.6, delay: i * 0.25, ease: "easeInOut" }}
            />
          );
        })}
        <motion.circle
          cx={320}
          cy={65}
          r={34}
          fill="#d9e8e5"
          stroke="#0f4c4a"
          strokeWidth={2}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        />
      </svg>
      <p className="mt-2 text-ink">The listed ingredients are combined into one daily mix.</p>
    </div>
  );
}

function Packaging() {
  return (
    <div>
      <div className="h-4 overflow-hidden rounded-full bg-teal-soft" role="img" aria-label="Simulated packaging progress">
        <motion.div
          className="h-full rounded-full bg-teal"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-4 text-ink">The mix is sealed into one simulated sachet.</p>
    </div>
  );
}
