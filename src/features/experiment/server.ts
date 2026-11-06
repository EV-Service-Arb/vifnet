import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { AnalyticsSink } from "@evinvest/analytics";
import { CHANNEL_FIELD, SITE_CHANNELS, submitTagsOf, type SiteChannel } from "@/shared/lib/sites-tools";
import { EXPERIMENT_EVENTS, type LiveExperiments } from "@/shared/config/experiments";
import { assignedBy } from "@/shared/lib/experiments";

export { experimentSink } from "./model/events";

type Defer = (task: () => Promise<void> | void) => void;

/** One per request: did kitstart's funnel accept this one as a lead? */
const accepted = new AsyncLocalStorage<{ lead: boolean }>();

/**
 * kitstart's `defer` with a witness. The funnel defers work (the owner's
 * notification, `lead_form_submit`) only for a lead it stored and does not
 * suspect — never for a validation failure, a honeypot or the rate limit — so
 * a deferral is the one outside sign that the request was a real lead.
 */
export function witnessedDefer(defer: Defer): Defer {
  return task => {
    const state = accepted.getStore();
    if (state) state.lead = true;
    defer(task);
  };
}

function cookieReader(header: string | null): (name: string) => string | undefined {
  const jar = new Map<string, string>();
  for (const pair of (header ?? "").split(";")) {
    const at = pair.indexOf("=");
    if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
  return name => jar.get(name);
}

const isChannel = (value: unknown): value is SiteChannel => typeof value === "string" && (SITE_CHANNELS as readonly string[]).includes(value);

/**
 * What a lead's `experiment_lead` says beyond its arm, from the post: its
 * `channel` (`form` unless the card said otherwise — a messenger lead is
 * posted on the tap, before any message) and the messengers the card offered;
 * on `lead_form`'s, the visitor's `lead_channel` arm and whether that test
 * drew the card (it posted under `lead_channel`), as the page's events say.
 */
function postedProps(form: FormData | null, leadChannel: string | undefined): { all: Record<string, string>; leadForm: Record<string, string | boolean> } {
  const posted = form?.get(CHANNEL_FIELD);
  const tags = form ? submitTagsOf(form) : {};
  return {
    all: { channel: isChannel(posted) ? posted : "form", ...(tags.channels_available ? { channels_available: tags.channels_available } : {}) },
    leadForm: { ...(leadChannel === undefined ? {} : { lead_channel: leadChannel }), ...(tags.experiment === "lead_channel" ? { superseded: true } : {}) },
  };
}

/**
 * `/quote` with `experiment_lead`: once kitstart has accepted the lead, one
 * event per experiment the visitor's `ab_<key>` cookies put them in, after
 * the response. Both the no-JS POST and the card's `fetch` land here with the
 * cookies, so both count; a request with no cookie (a bot posting straight
 * here) is in no experiment. The cookies are read under the live config
 * (`experiments`, the proxy's), so a test the panel switched off counts no
 * lead. The route must be built with {@link witnessedDefer}.
 */
export function withExperimentLead(
  route: (request: Request) => Promise<Response>,
  deps: { sink: () => AnalyticsSink; defer: Defer; experiments: () => Promise<LiveExperiments> },
): (request: Request) => Promise<Response> {
  return async request => {
    const state = { lead: false };
    // Read before the route takes the body: what the card posted says how the lead came.
    const posted = request.clone().formData().catch(() => null);
    const response = await accepted.run(state, () => route(request));
    if (state.lead) {
      const { assigned, forced } = assignedBy(await deps.experiments(), cookieReader(request.headers.get("cookie")));
      const entries = Object.entries(assigned);
      if (entries.length) {
        const props = postedProps(await posted, assigned.lead_channel);
        deps.defer(() => {
          const sink = deps.sink();
          for (const [experiment, variant] of entries) {
            sink.capture(EXPERIMENT_EVENTS.lead, { experiment, variant, forced, ...props.all, ...(experiment === "lead_form" ? props.leadForm : {}) });
          }
        });
      }
    }
    return response;
  };
}
