import { createBeaconSink, type AnalyticsSink } from "@evinvest/analytics";
import { contactChannel, type AnalyticsTarget } from "@/shared/lib/sites-tools";
import { EXPERIMENT_EVENTS, EXPERIMENT_PROPS } from "@/shared/config/experiments";

type Props = Record<string, unknown>;

/**
 * The experiments' own sink: kitstart's key and host, cookieless like its
 * sink, but allowed the experiment's props — kitstart's list would drop
 * `variant`. With no key (dev, CI) it sends nothing.
 */
export function experimentSink(target: AnalyticsTarget, locationId: string | null): AnalyticsSink {
  return createBeaconSink({
    key: target.key ?? undefined,
    host: target.host,
    allowedProps: EXPERIMENT_PROPS,
    globalProps: locationId ? { brand_id: target.brandId, location_id: locationId } : { brand_id: target.brandId },
  });
}

/**
 * `@evinvest/experiments` names its events `<experiment>_<action>`; PostHog
 * gets one name per action across experiments (`experiment_exposed`…), with
 * the experiment as a property, so one query reads every test. Every event
 * says `forced`, so a QA browser leaves the report whole. `null`: not one of
 * ours, dropped.
 */
export function experimentEvent(experiment: string, event: string, props: Props, forced: boolean): [string, Props] | null {
  const prefix = `${experiment}_`;
  if (!event.startsWith(prefix)) return null;
  const action = event.slice(prefix.length);
  const name = (EXPERIMENT_EVENTS as Record<string, string>)[action];
  if (!name) return null;
  return [name, { experiment, ...props, forced }];
}

// `telegram`: the bot's link in a `lead_channel` arm (kitstart marks it, `t.me` is no contact link to the marketing kit).
const INTENTS = ["form_open", "booking", "telegram"];

/**
 * The contact a click is, found where kitstart's own tracking finds it: a
 * `tel:` or WhatsApp link, or a `data-intent` of `form_open` / `booking` /
 * `telegram`.
 */
export function contactOf(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const href = target.closest("a[href]")?.getAttribute("href");
  const channel = href ? contactChannel(href) : null;
  if (channel === "phone" || channel === "whatsapp") return channel;
  const intent = target.closest("[data-intent]")?.getAttribute("data-intent");
  return intent && INTENTS.includes(intent) ? intent : null;
}
