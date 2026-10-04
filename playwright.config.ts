import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  // In this sandbox a freshly launched headless Chromium paints its first frame only after
  // ~28 s (even for a blank page), so the first test per worker waits that long for its
  // first "stable" click; keep headroom over the 30 s default.
  timeout: 90_000,
  use: { baseURL: "http://localhost:3100" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
