"use client";

import { DisclaimerBanner } from "@/components/shell/DisclaimerBanner";
import { StageNav } from "@/components/shell/StageNav";

export default function Home() {
  return (
    <>
      <DisclaimerBanner />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber">
          Personalized Formulation Studio
        </p>
        <h1 className="mt-4 font-display text-6xl font-semibold leading-[1.05] text-teal sm:text-7xl">
          dsp-pill
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-relaxed text-ink-muted">
          A guided, offline walkthrough from your starting point to a simulated daily formulation.
        </p>
      </main>
      <StageNav current="start" reachable={["start"]} onSelect={() => {}} />
    </>
  );
}
