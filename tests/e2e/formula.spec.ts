import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { goToAnalysis, trackExternalRequests } from "./helpers";

const SCENARIO_B = path.join(process.cwd(), "public/reports/dsp-pill-synthetic-report-scenario-b.pdf");
const LINES = ["Vitamin D3 600 IU / 15 mcg", "Vitamin B12 25 mcg", "Magnesium (elemental) 100 mg"];
const nav = (page: Page) => page.getByRole("navigation", { name: "Walkthrough stages" });
const simulate = (page: Page) => page.getByRole("button", { name: "Simulate manufacturing" });

async function toFormula(page: Page) {
  await page.getByRole("button", { name: "See my formula" }).click();
  await page.getByRole("heading", { name: "Your Formula", level: 2 }).waitFor();
}

async function chooseInContext(page: Page, group: RegExp, option: string) {
  await nav(page).getByRole("button", { name: /Your Context/ }).click();
  await page.getByRole("heading", { name: "Your Context", level: 2 }).waitFor();
  await page.getByRole("group", { name: group }).getByText(option, { exact: true }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await page.getByRole("heading", { name: "Your Biomarkers", level: 2 }).waitFor();
}

test("the sachet shows the formula and the simulation steps through to a demo confirmation", async ({ page }) => {
  const external = trackExternalRequests(page);
  await goToAnalysis(page);
  await toFormula(page);

  const label = page.getByTestId("sachet-label");
  await expect(label).toContainText("dsp-pill Formula #1842 · v1");
  for (const line of LINES) await expect(label).toContainText(line);
  await expect(page.getByText("Total daily formulation: one simulated sachet")).toBeVisible();

  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\b(mg|g) total|excipient|capsule/i);

  await expect(simulate(page)).toBeEnabled();
  await simulate(page).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Formulation specification" })).toBeVisible();
  const spec = await dialog.getByTestId("order-spec").locator("li").allInnerTexts();
  expect(spec.map((s) => s.trim())).toEqual(LINES);
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "Simulated blending" })).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "Simulated packaging" })).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "Demo confirmation" })).toBeVisible();
  await expect(dialog).toContainText("SIM-1842-v1");
  await expect(dialog).toContainText("No real product is manufactured or shipped.");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(simulate(page)).toBeFocused();
  expect(external()).toEqual([]);
});

test("a nutrient-level review disables manufacturing until the input changes", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Upload a lab report PDF").setInputFiles(SCENARIO_B);
  await page.getByRole("button", { name: "Confirm biomarkers" }).click();
  await page.getByRole("button", { name: "Fill synthetic profile" }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await page.getByRole("heading", { name: "Your Biomarkers", level: 2 }).waitFor();
  await toFormula(page);

  await expect(simulate(page)).toBeDisabled();
  const reason = page.getByText("Manufacturing simulation is unavailable while clinician review is required.");
  await expect(reason).toBeVisible();
  await expect(simulate(page)).toHaveAttribute("aria-describedby", (await reason.getAttribute("id")) ?? "missing");
  await expect(page.getByTestId("sachet-label")).toContainText("Draft — review required");

  await chooseInContext(page, /Sex used for lab context/, "Male");
  await toFormula(page);
  await expect(simulate(page)).toBeEnabled();
  await expect(page.getByTestId("sachet-label")).not.toContainText("Draft — review required");
});

test("an unresolved safety answer shows no sachet amounts", async ({ page }) => {
  await goToAnalysis(page);
  await chooseInContext(page, /Relevant medical history/, "Yes");
  await toFormula(page);

  await expect(page.getByText("No formulation proposed")).toBeVisible();
  await expect(page.getByTestId("review-notice")).toBeVisible();
  await expect(page.getByTestId("sachet-label")).not.toContainText(/\d+ (IU|mcg|mg)/);
  await expect(simulate(page)).toBeDisabled();
  await expect(page.getByText(/unavailable while clinician review is required/)).toBeVisible();
});
