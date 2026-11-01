import { dirname, join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { BREAKPOINTS } from "@evinvest/kitstart/testing/e2e";
import { abState, LEADS_DB, MESSENGER_DIR, MESSENGER_PORT, MESSENGER_SITES_PANEL_INTERNAL_URL, MOCK_PORT, PORT, POSTHOG_HOST, SITES_PANEL_INTERNAL_URL } from "./env";

// Run through the flake (`nix run .#test`), which supplies `@playwright/test`
// and the nixpkgs-pinned browsers — the pin is what makes a screenshot render
// alike on every machine of one OS. Baselines are Linux's, where CI runs, and
// come from CI's `visual-snapshots` artifact only (README); elsewhere the
// pixel comparison is skipped rather than failed against another OS's font
// rasteriser.
const linux = process.platform === "linux";

export default defineConfig({
  testDir: ".",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  ignoreSnapshots: !linux,
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  outputDir: "../../test-results",
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", stylePath: "./screenshot-section.css" } },
  use: { baseURL: `http://localhost:${PORT}`, deviceScaleFactor: 1, colorScheme: "light", locale: "fr-FR", storageState: abState("a") },
  // The two breakpoints the design draws: 1440 and 390.
  projects: BREAKPOINTS.map(b => ({ name: b.name, use: { ...devices["Desktop Chrome"], viewport: b.viewport } })),
  // The artefact that ships, not `next dev`: `npm run build` first.
  webServer: [
    // The panel, with its price list down: the page and the route price from the baked model.
    {
      command: "node mock-panel.mjs",
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      reuseExistingServer: false,
      env: { E2E_MOCK_PORT: String(MOCK_PORT) },
    },
    {
      command: `rm -rf "${dirname(LEADS_DB)}" && mkdir -p "${dirname(LEADS_DB)}" && node .next/standalone/server.js`,
      cwd: "../..",
      url: `http://localhost:${PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      // The standalone server runs as production, which refuses to boot without
      // knowing whose address the rate limit counts.
      // A key, so the experiments' events are sent — to a host that is nowhere.
      env: {
        PORT: String(PORT),
        HOSTNAME: "127.0.0.1",
        LEADS_DB_PATH: LEADS_DB,
        TRUSTED_PROXY: "xff:1",
        POSTHOG_KEY: "phc_e2e",
        POSTHOG_HOST,
        SITES_PANEL_INTERNAL_URL,
      },
    },
    // The same build with a place that offers both messengers (env.ts,
    // `MESSENGER_PORT`), for `messenger.spec.ts` only: its own copy of the
    // build (the ISR cache on disk) and its own leads file.
    {
      command: `rm -rf "${MESSENGER_DIR}" && mkdir -p "${MESSENGER_DIR}" && cp -R .next/standalone "${MESSENGER_DIR}/app" && cd "${MESSENGER_DIR}/app" && node server.js`,
      cwd: "../..",
      url: `http://localhost:${MESSENGER_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(MESSENGER_PORT),
        HOSTNAME: "127.0.0.1",
        LEADS_DB_PATH: join(MESSENGER_DIR, "leads.db"),
        TRUSTED_PROXY: "xff:1",
        POSTHOG_KEY: "phc_e2e",
        POSTHOG_HOST,
        SITES_PANEL_INTERNAL_URL: MESSENGER_SITES_PANEL_INTERNAL_URL,
      },
    },
  ],
});
