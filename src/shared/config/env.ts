import "server-only";
import { applyOverrides } from "@evinvest/experiments";
import {
  createExperimentsSource,
  createPlaceSource,
  createPricingSource,
  createServerEnv,
  leadNotifier,
  leadWebhook,
  type LeadNotifier,
  type LeadWebhook,
} from "@/shared/lib/sites-tools/server";
import { EXPERIMENTS, type LiveExperiments } from "./experiments";
import { isSubject, PANEL_NEED } from "./lead";
import { site } from "./site";

/** Parsed once, lazily: `next build` imports this and must need no secrets. */
export const serverEnv = createServerEnv(site);

/** The live place data, when `SITES_PANEL_INTERNAL_URL` is set; baked otherwise. */
export const places = createPlaceSource(site);

/**
 * The live price list from the same panel — its
 * `/api/internal/brands/vifnet/pricing` — over `site.pricing`: unset, down,
 * `{}` or a model that does not validate all price from the baked one.
 */
export const pricing = createPricingSource(site);

/**
 * The operator's weights and kill switches from the same panel — its
 * `/api/internal/brands/vifnet/experiments`. Answered from memory (30 s TTL,
 * stale-while-revalidate); unset, down or never answered is `{}`, the code's.
 */
export const experimentOverrides = createExperimentsSource(site);

/**
 * {@link EXPERIMENTS} as it runs now: wherever a variant is read off a cookie
 * (the proxy, `/quote`), it is read under this, so a cookie of an experiment
 * the panel switched off counts as the control.
 */
export async function liveExperiments(): Promise<LiveExperiments> {
  return applyOverrides(EXPERIMENTS, await experimentOverrides.overrides());
}

let built: LeadNotifier | undefined;

/** Built at boot (`instrumentation.ts`), so SMTP with no sender fails startup. */
export function notifier(): LeadNotifier {
  built ??= leadNotifier(site, serverEnv());
  return built;
}

let hook: LeadWebhook | null | undefined;

/**
 * Each lead as `lead.created` to the Service-Arb panel, through the outbox in
 * the leads file; `null` without `LEAD_WEBHOOK_URL`. Built at boot
 * (`instrumentation.ts`).
 */
export function webhook(): LeadWebhook | null {
  if (hook === undefined) hook = leadWebhook(site, serverEnv(), { needLabel: subject => (isSubject(subject) ? PANEL_NEED[subject] : subject) });
  return hook;
}
