import type { AnalyticsSink } from "@evinvest/analytics";
import { applyOverrides } from "@evinvest/experiments";
import { declarationProblem } from "@/shared/lib/sites-tools/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contactOf, experimentEvent } from "@/features/experiment/model/events";
import { withExperimentLead, witnessedDefer } from "@/features/experiment/server";
import { BOOKING_EXPERIMENT, bookingOf, messengerFacts, type MessengerFacts } from "@/shared/lib/sites-tools";
import { messengerRuleDisagreements } from "@/shared/lib/sites-tools/testing";
import { abSwitcherExperiments, BOOKING_ARMS, EXPERIMENT_SUMMARIES, EXPERIMENTS } from "@/shared/config/experiments";
import { LEAD } from "@/shared/config/lead";
import { site } from "@/shared/config/site";
import { assignedBy, type Bucket, bucketSuffix, cardArms, CONTROL, isBot, isQaMark, leadChannelOffered, leadChannelOwnsCard, parseLocation, parseQaSnapshot, placeOfLocation, qaSnapshot, runningOf, variantsOf } from "@/shared/lib/experiments";

/** The config as the panel serves it: none of its overrides, or lead_form switched off. */
const AS_CODED = applyOverrides(EXPERIMENTS, {});
const LAYOUT_OFF = applyOverrides(EXPERIMENTS, { lead_form: { enabled: false } });

describe("the bucket in the place param", () => {
  it("spells out every running test, the control too; no test running is no suffix", () => {
    expect(bucketSuffix({})).toBe("");
    expect(bucketSuffix(CONTROL)).toBe("~lead_form.a~booking_provider.a~lead_channel.a");
    expect(bucketSuffix({ ...CONTROL, lead_form: "b" })).toBe("~lead_form.b~booking_provider.a~lead_channel.a");
    expect(bucketSuffix({ booking_provider: "b" })).toBe("~booking_provider.b");
    expect(bucketSuffix({ lead_form: "c", lead_channel: "g" })).toBe("~lead_form.c~lead_channel.g");
  });

  it("round-trips, and the place is what the loader gets", () => {
    expect(parseLocation("_vifnet~lead_form.b~booking_provider.a")).toEqual({ place: "_vifnet", bucket: { lead_form: "b", booking_provider: "a" } });
    expect(parseLocation("_vifnet~lead_form.a")).toEqual({ place: "_vifnet", bucket: { lead_form: "a" } });
    expect(parseLocation("_vifnet")).toEqual({ place: "_vifnet", bucket: {} });
    expect(parseLocation("_vifnet~lead_form.a~booking_provider.a~lead_channel.e")).toEqual({
      place: "_vifnet",
      bucket: { lead_form: "a", booking_provider: "a", lead_channel: "e" },
    });
    expect(placeOfLocation("_vifnet~lead_form.b~booking_provider.b")).toBe("_vifnet");
  });

  it("renders a test that is not in the path as its control, and counts it as not running", () => {
    expect(variantsOf({ booking_provider: "b" })).toEqual({ lead_form: "a", booking_provider: "b", lead_channel: "a" });
    expect(variantsOf({})).toEqual(CONTROL);
  });

  it("refuses a suffix the proxy never writes: no second cache entry for the same page", () => {
    for (const bad of [
      "_vifnet~lead_form",
      "_vifnet~lead_form.z",
      "_vifnet~nope.b",
      "_vifnet~lead_form.b~lead_form.b",
      "_vifnet~booking_provider.b~lead_form.b",
      "_vifnet~lead_channel.h",
      "_vifnet~lead_channel.b~lead_form.a",
    ]) {
      expect(parseLocation(bad)).toBeNull();
      expect(placeOfLocation(bad)).toBe(bad);
    }
  });

  it("keeps variants to what a path segment can carry", () => {
    for (const [key, spec] of Object.entries(EXPERIMENTS)) {
      expect(key).toMatch(/^[a-z0-9_]+$/);
      for (const v of spec.variants) expect(v).toMatch(/^[a-z0-9_]+$/);
    }
  });
});

describe("booking_provider", () => {
  const first = site.places[0];
  if (!first) throw new Error("the site has no place");

  it("is kitstart's key, so the arms pool across brands, and names kitstart's providers", () => {
    expect(BOOKING_EXPERIMENT).toBe("booking_provider");
    expect(EXPERIMENTS[BOOKING_EXPERIMENT]).toMatchObject({ variants: ["a", "b"], weights: [0.5, 0.5] });
    expect(BOOKING_ARMS).toEqual({ a: "manual", b: "google_calendar" });
  });

  // docs/EXPERIMENTS.md: inert until the panel sets a Google schedule for the place.
  it("offers both arms the call while the place has no Google schedule", () => {
    expect(first.booking).toBeUndefined();
    expect(bookingOf(first, BOOKING_ARMS.a)).toEqual({ provider: "manual" });
    expect(bookingOf(first, BOOKING_ARMS.b)).toEqual({ provider: "manual" });
  });

  it("splits once the panel gives the place a schedule", () => {
    const url = "https://calendar.app.google/AbCdEf123";
    const live = { ...first, booking: { default: "manual" as const, providers: { google_calendar: { url } } } };
    expect(bookingOf(live, BOOKING_ARMS.a)).toEqual({ provider: "manual" });
    expect(bookingOf(live, BOOKING_ARMS.b)).toEqual({ provider: "google_calendar", url });
  });
});

describe("lead_channel over lead_form on the quote card", () => {
  const BOTH: MessengerFacts = { whatsapp: "+33 6 12 34 56 78", telegram: "vifnet_devis_bot" };
  const WHATSAPP_ONLY: MessengerFacts = { whatsapp: "+33 6 12 34 56 78", telegram: null };
  const TELEGRAM_ONLY: MessengerFacts = { whatsapp: null, telegram: "vifnet_devis_bot" };
  const NONE: MessengerFacts = { whatsapp: null, telegram: null };

  it("draws a messenger arm on the compact form where the place has WhatsApp, whatever lead_form says", () => {
    expect(cardArms({ lead_form: "b", lead_channel: "c" }, WHATSAPP_ONLY)).toEqual({
      form: "compact",
      messenger: { kind: "tiles" },
      experiment: { name: "lead_channel", variant: "c" },
      superseded: true,
    });
    expect(cardArms({ lead_form: "c", booking_provider: "b", lead_channel: "b" }, BOTH)).toEqual({
      form: "compact",
      messenger: { kind: "select", side: "suffix" },
      experiment: { name: "lead_channel", variant: "b" },
      superseded: true,
    });
  });

  // The channel's effect is read on one form: the control is lead_channel's too, compact, under its name.
  it("draws its control a there too: the compact card, no messenger, lead_channel's name, lead_form superseded", () => {
    expect(cardArms({ lead_form: "c", lead_channel: "a" }, BOTH)).toEqual({
      form: "compact",
      messenger: undefined,
      experiment: { name: "lead_channel", variant: "a" },
      superseded: true,
    });
  });

  // kitstart's rule (`messengerShownOf`): no arm draws without WhatsApp.
  it("is inert on a place with the bot alone: lead_form keeps its form and its name", () => {
    expect(cardArms({ lead_form: "c", lead_channel: "g" }, TELEGRAM_ONLY)).toEqual({
      form: "price-first",
      messenger: undefined,
      experiment: { name: "lead_form", variant: "c" },
      superseded: false,
    });
  });

  it("is inert on a place with no messenger", () => {
    expect(cardArms({ lead_form: "b", lead_channel: "c" }, NONE)).toEqual({
      form: "steps",
      messenger: undefined,
      experiment: { name: "lead_form", variant: "b" },
      superseded: false,
    });
  });

  it("leaves lead_form alone when lead_channel does not run, WhatsApp or not", () => {
    expect(cardArms({ lead_form: "b" }, BOTH)).toEqual({ form: "steps", messenger: undefined, experiment: { name: "lead_form", variant: "b" }, superseded: false });
  });

  it("is the bare control with no test running", () => {
    expect(cardArms({}, BOTH)).toEqual({ form: "compact", messenger: undefined, experiment: undefined, superseded: false });
  });

  // The QA menu's labels read `leadChannelOwnsCard`; the card reads `cardArms`: they must never disagree.
  it.each<[string, Bucket, MessengerFacts, boolean]>([
    ["WhatsApp alone", { lead_form: "b", lead_channel: "c" }, WHATSAPP_ONLY, true],
    ["both messengers", { lead_form: "c", booking_provider: "b", lead_channel: "b" }, BOTH, true],
    ["both messengers, lead_channel's control", { lead_form: "c", lead_channel: "a" }, BOTH, true],
    ["the bot alone", { lead_form: "c", lead_channel: "g" }, TELEGRAM_ONLY, false],
    ["no messenger", { lead_form: "b", lead_channel: "c" }, NONE, false],
    ["lead_channel not running", { lead_form: "b" }, BOTH, false],
    ["no test running", {}, BOTH, false],
  ])("gives the card to lead_channel exactly when the menu says it owns it: %s", (_, bucket, messengers, owns) => {
    expect(leadChannelOwnsCard(bucket, messengers)).toBe(owns);
    expect(cardArms(bucket, messengers).superseded).toBe(owns);
  });

  it("offers lead_channel only where the place has WhatsApp", () => {
    expect(leadChannelOffered(WHATSAPP_ONLY)).toBe(true);
    expect(leadChannelOffered(BOTH)).toBe(true);
    expect(leadChannelOffered(TELEGRAM_ONLY)).toBe(false);
    expect(leadChannelOffered(NONE)).toBe(false);
  });
});

describe("the place's messengers", () => {
  const first = site.places[0];
  if (!first) throw new Error("the site has no place");
  const live = { ...first, channels: { phone: "+33 6 12 34 56 78", whatsapp: "+33 6 12 34 56 78", telegram: "vifnet_devis_bot" } };

  it("offers the place's own WhatsApp and its bot", () => {
    expect(messengerFacts(site, live)).toEqual({ whatsapp: "+33 6 12 34 56 78", telegram: "vifnet_devis_bot" });
  });

  it("offers neither while the panel gives the baked place none", () => {
    expect(messengerFacts(site, first)).toEqual({ whatsapp: null, telegram: null });
  });

  it("drops the one the panel switched off", () => {
    expect(messengerFacts(site, { ...live, messengers: { telegram: false } })).toEqual({ whatsapp: "+33 6 12 34 56 78", telegram: null });
    expect(messengerFacts(site, { ...live, messengers: { whatsapp: false } })).toEqual({ whatsapp: null, telegram: "vifnet_devis_bot" });
  });

  // MESSENGER-CHANNELS-SPEC §1: a messenger lead carries the subject alone; the chat brings the rest.
  it("is taken by the brand's lead rule with the subject alone", () => {
    expect(messengerRuleDisagreements(LEAD)).toEqual([]);
  });
});

describe("who is in the experiment", () => {
  it("is whoever carries an ab_ cookie; the QA cookie marks it forced", () => {
    const jar: Record<string, string> = { ab_lead_form: "b", ab__qa: "1" };
    expect(assignedBy(AS_CODED, n => jar[n])).toEqual({ assigned: { lead_form: "b" }, forced: true });
    expect(assignedBy(AS_CODED, () => undefined)).toEqual({ assigned: {}, forced: false });
    expect(assignedBy(AS_CODED, n => (n === "ab_lead_form" ? "garbage" : undefined)).assigned).toEqual({ lead_form: "a" });
  });

  it("is nobody for a test the panel switched off, whatever the cookie says", () => {
    const jar: Record<string, string> = { ab_lead_form: "b", ab_booking_provider: "b" };
    expect(assignedBy(LAYOUT_OFF, n => jar[n]).assigned).toEqual({ booking_provider: "b" });
    expect(runningOf(LAYOUT_OFF, { lead_form: "b", booking_provider: "a" })).toEqual({ booking_provider: "a" });
    expect(runningOf(AS_CODED, { lead_form: "b" })).toEqual({ lead_form: "b" });
  });

  it("never counts crawlers and previews", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "AdsBot-Google (+http://www.google.com/adsbot.html)",
      "facebookexternalhit/1.1",
      "Mozilla/5.0 (compatible; SemrushBot/7; crawler)",
      "Slackbot-LinkExpanding 1.0",
      null,
    ]) {
      expect(isBot(ua)).toBe(true);
    }
    expect(isBot("Mozilla/5.0 (Linux; Android 14; CUBOT_X30) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36")).toBe(false);
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/131 Safari/537.36")).toBe(false);
  });
});

describe("the QA mark", () => {
  it("is any non-empty value: the snapshot, or the legacy 1", () => {
    expect(isQaMark("lead_form.b~lead_channel.e")).toBe(true);
    expect(isQaMark("-")).toBe(true);
    expect(isQaMark("1")).toBe(true);
    expect(isQaMark("")).toBe(false);
    expect(isQaMark(undefined)).toBe(false);
  });

  it("holds the own arms in the bucket's order, and reads them back", () => {
    expect(qaSnapshot({ lead_channel: "e", lead_form: "b" })).toBe("lead_form.b~lead_channel.e");
    expect(parseQaSnapshot("lead_form.b~lead_channel.e")).toEqual({ lead_form: "b", lead_channel: "e" });
  });

  it("says no arm with a dash, never an empty value the menu would read as no QA", () => {
    expect(qaSnapshot({})).toBe("-");
    expect(parseQaSnapshot("-")).toEqual({});
  });

  it("keeps the valid pairs of a snapshot that mixes them with broken ones", () => {
    expect(parseQaSnapshot("lead_form.b~nonsense~lead_channel.z~.a~booking_provider.~booking_provider.b~lead_channel.f")).toEqual({ lead_form: "b", booking_provider: "b", lead_channel: "f" });
  });

  it("skips a part naming a key or variant the code no longer has, and the legacy 1", () => {
    expect(parseQaSnapshot("lead_form.z~hero.b~booking_provider.b")).toEqual({ booking_provider: "b" });
    expect(parseQaSnapshot("1")).toEqual({});
  });
});

describe("the QA menu's experiments", () => {
  it("calls lead_channel inactive on a place with no WhatsApp, and leaves the rest as labelled", () => {
    expect(abSwitcherExperiments({ whatsapp: false }).map(e => e.label)).toEqual(["Lead form", "Booking", "Lead channel — inactive here (no WhatsApp)"]);
  });

  it("calls lead_channel plainly on a place with WhatsApp", () => {
    expect(abSwitcherExperiments({ whatsapp: true }).map(e => e.label)).toEqual(["Lead form", "Booking", "Lead channel"]);
  });

  it("calls lead_form inactive where lead_channel owns the card, and lead_channel plainly", () => {
    expect(abSwitcherExperiments({ whatsapp: true, leadChannelOwnsCard: true }).map(e => e.label)).toEqual([
      "Lead form — inactive here (lead channel owns the card)",
      "Booking",
      "Lead channel",
    ]);
  });

  it("calls lead_form plainly where the card is its own", () => {
    expect(abSwitcherExperiments({ whatsapp: true, leadChannelOwnsCard: false }).map(e => e.label)).toEqual(["Lead form", "Booking", "Lead channel"]);
  });

  it("offers every variant either way: a tap still forces it", () => {
    const channel = abSwitcherExperiments({ whatsapp: false }).find(e => e.key === "lead_channel");
    expect(channel?.variants.map(v => v.value)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
  });
});

describe("event names", () => {
  it("map the library's `<key>_<action>` to one name per action", () => {
    expect(experimentEvent("lead_form", "lead_form_exposed", { variant: "b" }, false)).toEqual([
      "experiment_exposed",
      { experiment: "lead_form", variant: "b", forced: false },
    ]);
    expect(experimentEvent("lead_form", "lead_form_step", { variant: "a", step: 2 }, true)).toEqual([
      "experiment_step",
      { experiment: "lead_form", variant: "a", step: 2, forced: true },
    ]);
    expect(experimentEvent("lead_form", "lead_form_clicked", {}, false)).toBeNull();
    expect(experimentEvent("lead_form", "other_exposed", {}, false)).toBeNull();
  });
});

describe("the contact a click is", () => {
  /**
   * The suite runs in Node, with no DOM: an element as `contactOf` reads one —
   * its attributes, and `closest` for the two selectors it asks (`a[href]`,
   * `[data-intent]`) up its parents.
   */
  class FakeElement extends EventTarget {
    constructor(
      private readonly attrs: Record<string, string>,
      private readonly parent: FakeElement | null = null,
    ) {
      super();
    }
    getAttribute(name: string): string | null {
      return this.attrs[name] ?? null;
    }
    closest(selector: string): FakeElement | null {
      const attr = selector === "a[href]" ? "href" : selector.slice(1, -1);
      return attr in this.attrs ? this : (this.parent?.closest(selector) ?? null);
    }
  }
  beforeEach(() => vi.stubGlobal("Element", FakeElement));
  afterEach(() => vi.unstubAllGlobals());
  const click = (target: FakeElement) => contactOf(target);

  it("is telegram for the bot's link the card marks, from its icon too", () => {
    const link = new FakeElement({ href: "https://t.me/vifnet_devis_bot?start=VF-7K3F", "data-intent": "telegram" });
    expect(click(link)).toBe("telegram");
    expect(click(new FakeElement({}, link))).toBe("telegram");
  });

  it("is whatsapp for a wa.me link and phone for a tel: one, as before", () => {
    expect(click(new FakeElement({ href: "https://wa.me/33612345678?text=R%C3%A9f.%20VF-7K3F" }))).toBe("whatsapp");
    expect(click(new FakeElement({ href: "tel:+33612345678" }))).toBe("phone");
  });

  it("is nothing for an unmarked t.me link, or an intent that is no contact", () => {
    expect(click(new FakeElement({ href: "https://t.me/vifnet_devis_bot" }))).toBeNull();
    expect(click(new FakeElement({ "data-intent": "share" }))).toBeNull();
  });
});

describe("experiment_lead on /quote", () => {
  /** What the route read of the post, as kitstart's route reads it. */
  type Read = Record<string, string>;
  const setup = (accepts: boolean, live = AS_CODED) => {
    const captured: [string, Record<string, unknown> | undefined][] = [];
    const read: Read[] = [];
    const tasks: (() => unknown)[] = [];
    const defer = (task: () => unknown) => void tasks.push(task);
    const sink: AnalyticsSink = { capture: (e, p) => void captured.push([e, p]) };
    const deferInRoute = witnessedDefer(defer);
    // kitstart's route takes the body and defers work only for a lead it accepted.
    const route = async (request: Request) => {
      read.push(Object.fromEntries([...(await request.formData())].map(([k, v]) => [k, String(v)])));
      if (accepts) deferInRoute(() => undefined);
      return new Response(null, { status: 303 });
    };
    const post = withExperimentLead(route, { sink: () => sink, defer, experiments: async () => live });
    const run = async (cookie?: string, body: Read = { subject: "standard", mobile: "06 12 34 56 78" }) => {
      const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" };
      if (cookie) headers["cookie"] = cookie;
      await post(new Request("http://x/quote", { method: "POST", headers, body: new URLSearchParams(body) }));
      for (const task of tasks.splice(0)) task();
      return { captured, read };
    };
    return run;
  };
  const events = async (...args: Parameters<ReturnType<typeof setup>>) => (await setup(true)(...args)).captured;

  it("is sent once per experiment for an accepted lead, forced or not, as a form lead", async () => {
    expect(await events("lang=fr; ab_lead_form=b")).toEqual([["experiment_lead", { experiment: "lead_form", variant: "b", forced: false, channel: "form" }]]);
    expect(await events("ab_lead_form=a; ab__qa=1")).toEqual([["experiment_lead", { experiment: "lead_form", variant: "a", forced: true, channel: "form" }]]);
  });

  it("is not sent for a rejected or suspected submission, nor without a cookie", async () => {
    expect((await setup(false)("ab_lead_form=b")).captured).toEqual([]);
    expect(await events()).toEqual([]);
  });

  it("leaves the whole post to the route", async () => {
    const body = { subject: "standard", mobile: "06 12 34 56 78", channel: "whatsapp", message_ref: "VF-7K3F", channels_available: "wa,tg", experiment: "lead_channel", variant: "c" };
    expect((await setup(true)("ab_lead_form=b; ab_lead_channel=c", body)).read).toEqual([body]);
  });

  it("says the lead's channel and the messengers the card posted, on every test's lead", async () => {
    const body = { subject: "standard", channel: "whatsapp", message_ref: "VF-7K3F", channels_available: "wa,tg", experiment: "lead_channel", variant: "c" };
    expect(await events("ab_booking_provider=a; ab_lead_channel=c", body)).toEqual([
      ["experiment_lead", { experiment: "booking_provider", variant: "a", forced: false, channel: "whatsapp", channels_available: "wa,tg" }],
      ["experiment_lead", { experiment: "lead_channel", variant: "c", forced: false, channel: "whatsapp", channels_available: "wa,tg" }],
    ]);
    expect(await events("ab_lead_channel=b", { subject: "standard", mobile: "06 12 34 56 78", channel: "callback" })).toEqual([
      ["experiment_lead", { experiment: "lead_channel", variant: "b", forced: false, channel: "callback" }],
    ]);
  });

  it("takes a channel that is none of the lead's for a form, and drops messengers that are none of the four", async () => {
    expect(await events("ab_lead_channel=b", { subject: "standard", channel: "pigeon", channels_available: "wa,fax" })).toEqual([
      ["experiment_lead", { experiment: "lead_channel", variant: "b", forced: false, channel: "form" }],
    ]);
  });

  // EXPERIMENT_PROPS: lead_form reads with `superseded` not true; its lead names the visitor's lead_channel arm.
  it("marks lead_form's lead superseded when the card posted under lead_channel", async () => {
    const body = { subject: "standard", mobile: "06 12 34 56 78", channels_available: "wa", experiment: "lead_channel", variant: "a" };
    expect(await events("ab_lead_form=b; ab_lead_channel=a", body)).toEqual([
      ["experiment_lead", { experiment: "lead_form", variant: "b", forced: false, channel: "form", channels_available: "wa", lead_channel: "a", superseded: true }],
      ["experiment_lead", { experiment: "lead_channel", variant: "a", forced: false, channel: "form", channels_available: "wa" }],
    ]);
  });

  it("names the visitor's lead_channel arm on lead_form's lead, not superseded, when lead_form drew the card", async () => {
    const body = { subject: "standard", mobile: "06 12 34 56 78", channels_available: "tg", experiment: "lead_form", variant: "b" };
    expect(await events("ab_lead_form=b; ab_lead_channel=d", body)).toEqual([
      ["experiment_lead", { experiment: "lead_form", variant: "b", forced: false, channel: "form", channels_available: "tg", lead_channel: "d" }],
      ["experiment_lead", { experiment: "lead_channel", variant: "d", forced: false, channel: "form", channels_available: "tg" }],
    ]);
  });

  it("is not sent for a test the panel switched off, even with its cookie", async () => {
    expect((await setup(true, LAYOUT_OFF)("ab_lead_form=b; ab_booking_provider=a")).captured).toEqual([
      ["experiment_lead", { experiment: "booking_provider", variant: "a", forced: false, channel: "form" }],
    ]);
  });
});

describe("the declaration to the panel", () => {
  it("has a one-line hypothesis for every test, and the panel would take each", () => {
    for (const [key, spec] of Object.entries(EXPERIMENTS)) {
      const summary = EXPERIMENT_SUMMARIES[key as keyof typeof EXPERIMENTS];
      expect(summary.length, key).toBeLessThanOrEqual(200);
      expect(summary, key).not.toContain("\n");
      expect(declarationProblem(key, spec, summary), key).toBeNull();
    }
  });
});
