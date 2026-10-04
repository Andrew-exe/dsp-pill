import { describe, expect, it } from "vitest";
import { formatItem, formatQuantity } from "@/lib/client/formatAmount";

describe("formatQuantity", () => {
  it("shows vitamin D in IU and mcg with thousands separators", () => {
    expect(formatQuantity("vitaminD", 600)).toBe("600 IU / 15 mcg");
    expect(formatQuantity("vitaminD", 1000)).toBe("1,000 IU / 25 mcg");
  });
  it("uses each nutrient's own unit", () => {
    expect(formatQuantity("b12", 25)).toBe("25 mcg");
    expect(formatQuantity("magnesium", 100)).toBe("100 mg");
    expect(formatQuantity("folicAcid", 200)).toBe("200 mcg");
  });
});

describe("formatItem", () => {
  it("prefixes the ingredient name", () => {
    expect(formatItem({ nutrient: "vitaminD", ingredientName: "Vitamin D3", amount: 600, unit: "IU" })).toBe("Vitamin D3 600 IU / 15 mcg");
    expect(formatItem({ nutrient: "b12", ingredientName: "Vitamin B12", amount: 25, unit: "mcg" })).toBe("Vitamin B12 25 mcg");
    expect(formatItem({ nutrient: "magnesium", ingredientName: "Magnesium (elemental)", amount: 100, unit: "mg" })).toBe("Magnesium (elemental) 100 mg");
  });
});
