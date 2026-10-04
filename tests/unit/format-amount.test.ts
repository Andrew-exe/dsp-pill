import { describe, expect, it } from "vitest";
import { formatBiomarkerRange, formatBiomarkerValue, formatItem, formatQuantity } from "@/lib/client/formatAmount";

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

describe("formatBiomarkerValue", () => {
  it("rounds converted values to one decimal and drops trailing zeros", () => {
    expect(formatBiomarkerValue("vitaminD", 18.028846153846153)).toBe("18");
    expect(formatBiomarkerValue("vitaminD", 20.03205128205128)).toBe("20");
    expect(formatBiomarkerValue("b12", 1234.56)).toBe("1,234.6");
  });
  it("keeps two decimals for magnesium", () => {
    expect(formatBiomarkerValue("magnesium", 0.7816599999999999)).toBe("0.78");
  });
});

describe("formatBiomarkerRange", () => {
  it("formats both limits and names missing ones", () => {
    expect(formatBiomarkerRange("vitaminD", { low: 20.03205128205128, high: 50.080128205128204 })).toBe("20 to 50.1");
    expect(formatBiomarkerRange("vitaminD", { low: null, high: 50 })).toBe("no lower limit to 50");
    expect(formatBiomarkerRange("vitaminD", { low: 20, high: null })).toBe("20 to no upper limit");
  });
});
