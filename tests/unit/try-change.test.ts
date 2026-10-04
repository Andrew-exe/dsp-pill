import { describe, expect, it } from "vitest";
import { canChangeSupplements, supplementsStatusAfterChange } from "@/lib/client/tryChange";

describe("supplementsStatusAfterChange", () => {
  it("derives none or some from an answered status", () => {
    expect(supplementsStatusAfterChange("none", 1)).toBe("some");
    expect(supplementsStatusAfterChange("some", 0)).toBe("none");
  });
  it("never resolves an unknown or blank answer", () => {
    expect(supplementsStatusAfterChange("unknown", 1)).toBeNull();
    expect(supplementsStatusAfterChange("unknown", 0)).toBeNull();
    expect(supplementsStatusAfterChange(null, 1)).toBeNull();
    expect(canChangeSupplements("unknown")).toBe(false);
    expect(canChangeSupplements(null)).toBe(false);
  });
});
