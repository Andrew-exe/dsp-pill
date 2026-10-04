import { describe, expect, it } from "vitest";
import { STAGES } from "@/components/shell/StageNav";

describe("shell", () => {
  it("lists the five walkthrough stages in order", () => {
    expect(STAGES.map((s) => s.label)).toEqual([
      "Your Starting Point",
      "Your Context",
      "Your Biomarkers",
      "Your Formula",
      "Your Next Formula",
    ]);
  });
});
