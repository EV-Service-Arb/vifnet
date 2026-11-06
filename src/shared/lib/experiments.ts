import { cookieName, resolveVariant } from "@evinvest/experiments";
import type { MessengerFacts, MessengerVariant } from "@/shared/lib/sites-tools";
import { EXPERIMENTS, type ExperimentKey, LEAD_FORMS, type LiveExperiments, MESSENGER_ARMS, QA_COOKIE, type VariantOf } from "@/shared/config/experiments";
import type { LeadForm } from "@/shared/config/lead";

/** Every experiment's variant, the control where nothing else applies. */
export type Assignment = { [K in ExperimentKey]: VariantOf<K> };

/**
 * The experiments a render runs and the variant of each. An experiment that
 * is absent is not running for that page: it renders the control and sends
 * nothing.
 */
export type Bucket = Partial<Assignment>;

const KEYS = Object.keys(EXPERIMENTS) as ExperimentKey[];
const MARK = "~";

const control = (key: ExperimentKey): VariantOf<typeof key> => EXPERIMENTS[key].variants[0];

/** The control everywhere: a bot's page, a page where no test runs. */
export const CONTROL: Assignment = Object.fromEntries(KEYS.map(k => [k, control(k)])) as Assignment;

/** What a page renders: the bucket's variants, the control for the rest. */
export function variantsOf(bucket: Bucket): Assignment {
  return { ...CONTROL, ...bucket };
}

/** What the quote card draws for a bucket, and the one assignment its own events and post carry. */
export interface CardArms {
  form: LeadForm;
  /** `lead_channel`'s variant; `undefined` → the control. */
  messenger: MessengerVariant | undefined;
  experiment: { name: ExperimentKey; variant: string } | undefined;
  /** `lead_channel` decides the card, `lead_form` does not: its events say so (`superseded`). */
  superseded: boolean;
}

/**
 * The card's arms (MESSENGER-CHANNELS-SPEC §4, precedence). `lead_channel`
 * draws only where the place has WhatsApp — kitstart's rule
 * (`messengerShownOf`): a bot alone leaves every arm inert. There it decides
 * the whole card for every arm, its control `a` too: the compact form, and the
 * card's events (kitstart's `experiment`, one per card) name `lead_channel` —
 * otherwise the channel's effect would be read through two different forms.
 * `lead_form` is superseded there. Elsewhere `lead_form` keeps the form and
 * the events, as before the test.
 */
export function cardArms(bucket: Bucket, messengers: MessengerFacts): CardArms {
  const { lead_form: form, lead_channel: channel } = variantsOf(bucket);
  if (leadChannelOwnsCard(bucket, messengers)) {
    return { form: LEAD_FORMS.a, messenger: MESSENGER_ARMS[channel], experiment: { name: "lead_channel", variant: channel }, superseded: true };
  }
  return {
    form: LEAD_FORMS[form],
    messenger: undefined,
    experiment: bucket.lead_form === undefined ? undefined : { name: "lead_form", variant: form },
    superseded: false,
  };
}

/**
 * Whether `lead_channel` can draw anything at a place: it needs WhatsApp
 * (kitstart's `messengerShownOf`); a bot alone leaves every arm inert. The
 * one rule the card ({@link leadChannelOwnsCard}) and the QA menu's labels
 * both read, so the menu never calls inert a test the card runs, or the reverse.
 */
export function leadChannelOffered(messengers: MessengerFacts): boolean {
  return messengers.whatsapp !== null;
}

/** Whether `lead_channel` draws this bucket's card at the place, `lead_form` superseded ({@link cardArms}). */
export function leadChannelOwnsCard(bucket: Bucket, messengers: MessengerFacts): boolean {
  return bucket.lead_channel !== undefined && leadChannelOffered(messengers);
}

/**
 * The bucket as a suffix of the `[location]` param: `~lead_form.a~booking_provider.b`,
 * one `~key.variant` per experiment the visitor runs, the control spelt out,
 * in config order. Whether a test runs is in the path, not read by the page:
 * the panel can switch one off at any moment, and a cached page must not go
 * on counting it. The page stays ISR — each bucket is its own cache entry.
 * No suffix is the frame's page with no test running, the one bots get.
 */
export function bucketSuffix(bucket: Bucket): string {
  return KEYS.filter(k => bucket[k] !== undefined)
    .map(k => `${MARK}${k}.${bucket[k]}`)
    .join("");
}

const isVariant = (key: ExperimentKey, raw: string): boolean => (EXPERIMENTS[key].variants as readonly string[]).includes(raw);

/**
 * Inverse of {@link bucketSuffix} on a `[location]` param. Only the code's
 * keys and variants are checked — they never change without a deploy, so
 * the page needs no panel to read its own path. `null` when the suffix is not
 * one the proxy writes (unknown key or variant, a key twice, another order):
 * such a path is not a cache entry of ours.
 */
export function parseLocation(param: string): { place: string; bucket: Bucket } | null {
  const [place = "", ...parts] = param.split(MARK);
  const bucket: Record<string, string> = {};
  for (const part of parts) {
    const [key = "", variant = ""] = part.split(".");
    if (!(KEYS as string[]).includes(key) || !isVariant(key as ExperimentKey, variant)) return null;
    bucket[key] = variant;
  }
  const parsed = bucket as Bucket;
  return bucketSuffix(parsed) === param.slice(place.length) ? { place, bucket: parsed } : null;
}

/** The place param alone, for the place loader; a malformed suffix stays and 404s there. */
export function placeOfLocation(param: string): string {
  return parseLocation(param)?.place ?? param;
}

/** The bucket without the experiments `live` has switched off. */
export function runningOf(live: LiveExperiments, bucket: Bucket): Bucket {
  return Object.fromEntries(Object.entries(bucket).filter(([k]) => live[k as ExperimentKey].enabled !== false)) as Bucket;
}

/**
 * The visitor's assignment as the `ab_<key>` cookies record it, under the
 * live config — only the experiments it runs now that the visitor was
 * actually assigned to, so a request with no cookie (a bot, a crawler, a
 * stale form) is in no experiment, and a cookie of a switched-off one counts
 * for nothing.
 */
export function assignedBy(live: LiveExperiments, cookie: (name: string) => string | undefined): { assigned: Bucket; forced: boolean } {
  const assigned: Record<string, string> = {};
  for (const key of KEYS) {
    const raw = cookie(cookieName(key));
    if (live[key].enabled !== false && raw !== undefined) assigned[key] = resolveVariant(live, key, raw);
  }
  return { assigned: assigned as Bucket, forced: isQaMark(cookie(QA_COOKIE)) };
}

/**
 * Whether `QA_COOKIE`'s value marks a test visit: any non-empty value, the
 * rule of kitstart's menu gate and `qaVisit`. Its value is the visitor's own
 * arms ({@link qaSnapshot}), not a flag, so it is never compared to `"1"`.
 */
export function isQaMark(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}

/**
 * Stands for "no arm at all" in `QA_COOKIE`: an empty value would read as no
 * QA visit to kitstart's gate and `qaVisit`, so the menu would vanish on the
 * very visit that forced a variant. `-` is no key, so it never parses as one.
 */
const NO_ARMS = "-";

/**
 * The visitor's own arms, kept in `QA_COOKIE` while a forced visit overrides
 * their `ab_<key>`, so leaving QA gives them back: `lead_form.b~lead_channel.c`,
 * {@link bucketSuffix} without its leading mark — cookie-safe as it stands.
 */
export function qaSnapshot(bucket: Bucket): string {
  return bucketSuffix(bucket).slice(MARK.length) || NO_ARMS;
}

/**
 * Inverse of {@link qaSnapshot}, against the code's keys and variants only: a
 * part naming a key or variant since removed is skipped, the rest still
 * restore. The legacy value `1` (before the snapshot) is no part: no arm.
 */
export function parseQaSnapshot(raw: string): Bucket {
  const bucket: Record<string, string> = {};
  for (const part of raw.split(MARK)) {
    const [key = "", variant = ""] = part.split(".");
    if ((KEYS as string[]).includes(key) && isVariant(key as ExperimentKey, variant)) bucket[key] = variant;
  }
  return bucket as Bucket;
}

/**
 * Every `ab_<key>` that holds one of the code's variants, paused tests too —
 * unlike {@link assignedBy}, which reads them under the live config: this is
 * what the browser stores, for the QA snapshot to keep and give back.
 */
export function storedArms(cookie: (name: string) => string | undefined): Bucket {
  const bucket: Record<string, string> = {};
  for (const key of KEYS) {
    const raw = cookie(cookieName(key));
    if (raw !== undefined && isVariant(key, raw)) bucket[key] = raw;
  }
  return bucket as Bucket;
}

/** The experiments `live` has switched off (paused): their visitors keep their arms. */
export function pausedOf(live: LiveExperiments): ExperimentKey[] {
  return KEYS.filter(key => live[key].enabled === false);
}

/**
 * Crawlers and link previews: always the control, and no cookie, so they are
 * never an exposure. `HeadlessChrome` is not here — it is the e2e browser.
 */
const BOT = /bot\b|bot\/|crawler|spider|slurp|preview|facebookexternalhit|lighthouse|pagespeed/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}
