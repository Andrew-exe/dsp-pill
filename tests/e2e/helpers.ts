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
