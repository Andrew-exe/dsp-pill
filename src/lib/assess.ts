import type { AssessmentInput } from "@/lib/domain/types";
import { DeterministicDoseEngine } from "@/lib/engine/deterministic";
import type { DoseProposalEngine } from "@/lib/engine/types";
import { DemoSafetyPolicy, type AssessmentResult } from "@/lib/safety/policy";

export function assess(
  input: AssessmentInput,
  engine: DoseProposalEngine = new DeterministicDoseEngine(),
): AssessmentResult {
  const proposals = engine.propose(input);
  return new DemoSafetyPolicy().evaluate(input, proposals, { id: engine.id, version: engine.version });
}
