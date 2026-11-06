import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MIN_FILL_MS } from "@/shared/lib/sites-tools";
import { bookingRoute, quoteRoute } from "@/shared/lib/sites-tools/next";
import { leadNotifier, leadWebhook, parseServerEnv } from "@/shared/lib/sites-tools/server";
import { site } from "@/shared/config/site";
import { panelWebhookOptions, type PanelSwitches } from "@/shared/lib/funnel-event";

export interface PanelHarness {
  /** A lead through the real quote route, as the card's script posts it; the JSON answer. */
  post(fields: Record<string, string>): Promise<{ status: number; body: { ok: boolean; lead?: unknown; cents?: unknown } }>;
  /** A booking request through the real booking route. */
  book(body: Record<string, unknown>): Promise<{ status: number; body: { ok: boolean; queued?: boolean } }>;
  /** Runs the outbox until it has nothing due; every body the panel received, in order. */
  deliver(): Promise<unknown[]>;
  close(): void;
}

const RENDERED_AT = Date.UTC(2026, 9, 4, 9);

/**
 * The site's quote and booking routes over one leads file and the lead
 * webhook wired as `env.ts` wires it (`panelWebhookOptions`), the panel a
 * fetch that accepts everything and keeps the bodies.
 */
export function panelHarness(switches: Partial<PanelSwitches> = {}): PanelHarness {
  const dir = mkdtempSync(join(tmpdir(), "vifnet-panel-"));
  const env = parseServerEnv(site, {
    LEADS_DB_PATH: join(dir, "leads.db"),
    LEAD_WEBHOOK_URL: "http://127.0.0.1:59120/api/ingest/v1/events",
    LEAD_WEBHOOK_KEY_ID: "vifnet-site",
    LEAD_WEBHOOK_SECRET: "test-secret",
  });
  const bodies: unknown[] = [];
  const quiet = { info: () => {}, warn: () => {}, error: () => {} };
  const hook = leadWebhook(site, env, {
    ...panelWebhookOptions("vifnet-site", switches),
    fetch: async (input, init) => {
      bodies.push(JSON.parse(await new Request(input, init).text()));
      return new Response(JSON.stringify({ results: [{ index: 0, status: "accepted" }] }), { status: 207 });
    },
    log: quiet,
  });
  if (!hook) throw new Error("the webhook should be on");
  const deferred: Promise<void>[] = [];
  const now = () => RENDERED_AT + MIN_FILL_MS + 5_000;
  const quote = quoteRoute(site, {
    env: () => env,
    notifier: () => leadNotifier(site, env),
    webhook: () => hook,
    defer: task => void deferred.push(Promise.resolve(task())),
    now,
    unavailable: () => ({ title: "", heading: "", body: "", callLabel: "" }),
  });
  const booking = bookingRoute({ env: () => env, webhook: () => hook, now, log: quiet });

  return {
    async post(fields) {
      const form = new FormData();
      const all = { location: "vifnet", locale: "fr", form_id: "quote", t: String(RENDERED_AT), ...fields };
      for (const [k, v] of Object.entries(all)) form.set(k, v);
      const response = await quote(new Request("http://localhost/quote", { method: "POST", body: form, headers: { accept: "application/json" } }));
      return { status: response.status, body: (await response.json()) as { ok: boolean } };
    },
    async book(body) {
      const response = await booking(
        new Request("http://localhost/quote/booking", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
      );
      return { status: response.status, body: (await response.json()) as { ok: boolean } };
    },
    async deliver() {
      await Promise.all(deferred);
      // A booking row waits for its lead's row: a tick or two delivers both.
      for (let i = 0; i < 3; i++) await hook.tick();
      return bodies;
    },
    close() {
      hook.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
