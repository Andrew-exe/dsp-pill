import type { Page } from "@playwright/test";

const APP_ORIGIN = "http://localhost:3100";

/** Starts recording requests; the returned function lists URLs outside the app origin. */
export function trackExternalRequests(page: Page): () => string[] {
  const external: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    if (new URL(url).origin !== APP_ORIGIN) external.push(url);
  });
  return () => [...external];
}

/** Drives the walkthrough with the synthetic patient up to the Biomarkers stage. */
export async function goToAnalysis(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Load synthetic patient" }).click();
  await page.getByRole("button", { name: "Confirm biomarkers" }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await page.getByRole("heading", { name: "Your Biomarkers", level: 2 }).waitFor();
  await page.getByTestId("formula-amount-vitaminD").waitFor();
}
