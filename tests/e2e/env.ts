import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * What the server under test is started with, shared by the config (which
 * starts it) and the specs (which read what it wrote). A port of its own, so a
 * `nix run .#dev` on 59082 is never mistaken for the build under test.
 */
export const PORT = Number(process.env["E2E_PORT"] ?? 59089);

/** The panel stand-in (`mock-panel.mjs`), and the base the server under test reads it at. */
export const MOCK_PORT = Number(process.env["E2E_MOCK_PORT"] ?? PORT + 1);
export const SITES_PANEL_INTERNAL_URL = `http://127.0.0.1:${MOCK_PORT}/api/internal`;

/** Emptied when the server starts: an earlier run's rows must not satisfy this one. */
export const LEADS_DB = join(tmpdir(), `vifnet-e2e-${PORT}`, "leads.db");

/**
 * Where the server under test sends analytics: a host that resolves nowhere,
 * so a spec can intercept the beacons (`experiments.spec.ts`) and every other
 * spec's are dropped rather than reaching PostHog.
 */
export const POSTHOG_HOST = "https://posthog.e2e.invalid";

/**
 * The second server under test (`messenger.spec.ts`): the same build, whose
 * panel (`mock-panel.mjs` under `/messengers`) gives the place a WhatsApp
 * number and the bot `vifnet_devis_bot`, so `lead_channel`'s arms draw. The
 * first server's place offers no messenger, and its pages keep the control's
 * geometry. Run from a copy of the build, in a directory of its own: the two
 * servers would otherwise share the ISR cache on disk, and one place's page
 * be served for the other's.
 */
export const MESSENGER_PORT = Number(process.env["E2E_MESSENGER_PORT"] ?? PORT + 2);
export const MESSENGER_DIR = join(tmpdir(), `vifnet-e2e-${MESSENGER_PORT}`);
export const MESSENGER_SITES_PANEL_INTERNAL_URL = `http://127.0.0.1:${MOCK_PORT}/messengers/api/internal`;

/**
 * The A/B cookies pinning a browser to an arm of each experiment
 * (docs/EXPERIMENTS.md): `lead_form`'s `variant`, `booking_provider`'s
 * `booking` and `lead_channel`'s `channel` (each the control unless asked).
 * The screenshots are the Figma frame, and a random bucket would make every
 * spec's page a coin toss. `experiments.spec.ts` sets its own; `null` is a
 * new visitor, no cookie.
 */
export function abState(
  variant: string | null,
  booking = "a",
  channel = "a",
): { cookies: { name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Lax" }[]; origins: [] } {
  const cookie = (name: string, value: string) => ({ name, value, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const });
  const cookies = variant === null ? [] : [cookie("ab_lead_form", variant), cookie("ab_booking_provider", booking), cookie("ab_lead_channel", channel)];
  return { cookies, origins: [] };
}
