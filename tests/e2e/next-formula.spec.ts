import { expect, test, type Page } from "@playwright/test";
import { goToAnalysis, trackExternalRequests } from "./helpers";

const nav = (page: Page) => page.getByRole("navigation", { name: "Walkthrough stages" });
const NOTE =
  "Synthetic comparison. Measured values only — this does not show that the formula caused any change and does not predict future levels.";

async function toNext(page: Page) {
  await nav(page).getByRole("button", { name: /Your Next Formula/ }).click();
  await page.getByRole("heading", { name: "Your Next Formula", level: 2 }).waitFor();
}

async function loadFollowUp(page: Page) {
  await page.getByRole("button", { name: "Load 8-week follow-up report (synthetic)" }).click();
  await page.getByTestId("comparison-table").waitFor();
}

test("the eight-week follow-up shows measured points and a v2 formula beside v1", async ({ page }) => {
  const external = trackExternalRequests(page);
  await goToAnalysis(page);
  await toNext(page);

  await expect(page.getByRole("link", { name: /Download the synthetic week-8 report/ })).toHaveAttribute(
    "href",
    "/reports/dsp-pill-synthetic-report-week8.pdf",
  );
  await loadFollowUp(page);

  await expect(page.getByTestId("comparison-note")).toHaveText(NOTE);
  await expect(page.getByTestId("comparison-note").first()).toBeVisible();

  const labels = page.getByTestId("sachet-label");
  await expect(labels).toHaveCount(2);
  await expect(labels.nth(0)).toContainText("dsp-pill Formula #1842 · v1");
  await expect(labels.nth(1)).toContainText("dsp-pill Formula #1842 · v2");
  await expect(labels.nth(1)).toContainText("Vitamin B12 25 mcg");
  await expect(labels.nth(1)).not.toContainText("Vitamin D3");
  await expect(labels.nth(1)).not.toContainText("Magnesium");

  const row = (name: string) => page.getByTestId("comparison-table").getByRole("row", { name: new RegExp(name) });
  await expect(row("Vitamin D3")).toContainText("600 IU / 15 mcg");
  await expect(row("Vitamin D3")).toContainText("Not included");
  await expect(row("Magnesium")).toContainText("100 mg");
  await expect(row("Magnesium")).toContainText("Not included");
  await expect(row("Vitamin B12")).toHaveText(/Vitamin B12\s*25 mcg\s*25 mcg/);

  const charts = page.getByTestId("trend-chart");
  await expect(charts).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await expect(charts.nth(i).getByTestId("trend-point")).toHaveCount(2);
    await expect(charts.nth(i)).toContainText("2026-07-01");
    await expect(charts.nth(i)).toContainText("2026-08-26");
  }

  const text = (await page.locator("main").innerText()).replace(NOTE, "");
  expect(text).not.toMatch(/predict|forecast|caused by the formula|because of the formula/i);
  expect(external()).toEqual([]);
});

test("v2 refreshes after an input change and the user returns", async ({ page }) => {
  await goToAnalysis(page);
  await toNext(page);
  await loadFollowUp(page);

  await nav(page).getByRole("button", { name: /Your Context/ }).click();
  await page.getByRole("group", { name: /Relevant medical history/ }).getByText("Yes", { exact: true }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await page.getByRole("heading", { name: "Your Biomarkers", level: 2 }).waitFor();
  await page.getByRole("button", { name: "See my formula" }).click();
  await page.getByRole("heading", { name: "Your Formula", level: 2 }).waitFor();
  await toNext(page);

  const table = page.getByTestId("comparison-table");
  await expect(table).toContainText("Review required");
  await expect(table).not.toContainText("600 IU");
  await expect(page.getByTestId("sachet-label").nth(1)).not.toContainText(/\d+ (IU|mcg|mg)/);
});
