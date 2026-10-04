"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BiomarkersStage } from "@/components/biomarkers/BiomarkersStage";
import { ContextStage } from "@/components/context/ContextStage";
import { FormulaStage } from "@/components/formula/FormulaStage";
import { NextStage } from "@/components/next/NextStage";
import { StartStage } from "@/components/intake/StartStage";
import { DisclaimerBanner } from "@/components/shell/DisclaimerBanner";
import { StageNav, type StageId } from "@/components/shell/StageNav";
import { reachableStages } from "@/lib/client/walkthrough";
import { useWalkthrough } from "./WalkthroughProvider";

export function Studio() {
  return (
    <>
      <DisclaimerBanner />
      <StudioBody />
    </>
  );
}

function StudioBody() {
  const { state, dispatch } = useWalkthrough();
  const stageRef = useRef<HTMLDivElement>(null);
  const previousStage = useRef<StageId>(state.stage);
  const [resets, setResets] = useState(0);

  // Move focus to the new stage heading so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (previousStage.current === state.stage) return;
    previousStage.current = state.stage;
    stageRef.current?.querySelector<HTMLElement>("h2")?.focus();
    window.scrollTo({ top: 0 });
  }, [state.stage]);

  // Reset always lands on the Start heading, even when Start was already showing.
  useEffect(() => {
    if (resets === 0) return;
    stageRef.current?.querySelector<HTMLElement>("h2")?.focus();
    window.scrollTo({ top: 0 });
  }, [resets]);

  return (
    <>
      <header className="mx-auto max-w-5xl px-6 pt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-teal sm:text-5xl">dsp-pill</h1>
            <p className="mt-2 text-lg text-ink-muted">
              Personalized Formulation Studio: from bloodwork to a simulated daily sachet, offline.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/methodology" className="font-semibold text-teal underline underline-offset-4 hover:text-teal/80">
              Methodology
            </Link>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "reset" });
                setResets((n) => n + 1);
              }}
              className="rounded-full border-2 border-teal px-5 py-2 font-semibold text-teal hover:bg-teal hover:text-ivory"
            >
              Reset demo
            </button>
          </div>
        </div>
      </header>
      <StageNav
        current={state.stage}
        reachable={reachableStages(state)}
        onSelect={(stage) => dispatch({ type: "goTo", stage })}
      />
      <main key={resets} ref={stageRef} className="mx-auto max-w-5xl px-6 pb-24 pt-4">
        {state.stage === "start" && <StartStage />}
        {state.stage === "context" && <ContextStage />}
        {state.stage === "biomarkers" && <BiomarkersStage />}
        {state.stage === "formula" && <FormulaStage />}
        {state.stage === "next" && <NextStage />}
      </main>
    </>
  );
}
