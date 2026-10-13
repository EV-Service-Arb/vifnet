import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isLeadRef, leadRef, type Lead } from "@evinvest/kitstart";
import { leadWebhook, parseServerEnv, type LeadWebhookContext } from "@evinvest/kitstart/server";
import { afterEach, describe, expect, it } from "vitest";
import { TEXT } from "@/entities/content";
import { PANEL_NEED, SUBJECTS } from "@/shared/config/lead";
import { site } from "@/shared/config/site";
import { isOpaqueId, leadCreatedBody, PANEL_ANALYTICS_ID, PANEL_FLOW, PANEL_MESSENGER, PANEL_SUSPECT, panelLeadId, panelWebhookOptions, SA_INGEST_SIGNING, uuidV7 } from "@/shared/lib/funnel-event";

const lead: Lead = {
  subject: "deep",
  locality: "10001",
  mobile: "(212) 555-0147",
  extras: { name: "Jane Doe", bedrooms: "3" },
  placeSlug: "vifnet",
  spamVerdict: null,
};

const ctx: LeadWebhookContext = {
  leadId: 42,
  brandId: "vifnet",
  locale: "en",
  formId: "quote",
  at: new Date("2026-10-01T09:30:00.123Z"),
  idempotencyKey: "0b5c1f0e-7d1a-4e8b-9c2d-3f4a5b6c7d8e",
  leadRef: "lead-42-9f8e7d6c",
};

// The kit's reference for the lead, the one its page was answered with.
const LEAD_ID = "lead-42-9f8e7d6c";

/**
 * The proto3 JSON names of each message's fields, read from the panel's
 * contract: the lowerCamelCase name and the field's own snake_case one, which
 * protojson accepts too (the kit writes the sale's properties that way).
 */
function protoFields(): Map<string, Set<string>> {
  // Without its comments: one quotes a regex (`{2,4}`), and its brace would end the message there.
  const proto = readFileSync(new URL("./support/sa-events.proto", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  const messages = new Map<string, Set<string>>();
  for (const [, name, body] of proto.matchAll(/^message (\w+) \{([^}]*)\}/gm)) {
    const fields = new Set<string>();
    for (const [, field = ""] of (body ?? "").matchAll(/^\s*(?:optional |repeated )?(?:map<[\w.]+, ?[\w.]+>|[\w.]+) (\w+) = \d+;/gm)) {
      fields.add(field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()));
      fields.add(field);
    }
    messages.set(name ?? "", fields);
  }
  return messages;
}

const keysWithin = (value: object, message: string): void => {
  const allowed = protoFields().get(message);
  expect(allowed, message).toBeDefined();
  for (const key of Object.keys(value)) expect(allowed, `${message}.${key}`).toContain(key);
};

describe("lead.created for the panel", () => {
  it("builds one sa.funnel.v1 event from a lead", () => {
    const body = leadCreatedBody(lead, ctx, "vifnet-site");
    expect(body).toEqual({
      events: [
        {
          id: uuidV7(ctx.at, ctx.idempotencyKey),
          schema: "sa.funnel.v1",
          type: "lead.created",
          typeVersion: 1,
          occurredAt: "2026-10-01T09:30:00.123Z",
          source: { kind: "site", id: "vifnet-site" },
          subject: { brandId: "vifnet", locationId: "vifnet", leadId: LEAD_ID },
          properties: { channel: "form" },
          pii: { name: "Jane Doe", bedrooms: "3", phone: "(212) 555-0147", need: "Grand ménage", locality: "10001" },
        },
      ],
    });
  });

  it("names only fields the proto declares, in their protojson spelling", () => {
    const body = leadCreatedBody(lead, ctx, "vifnet-site");
    keysWithin(body, "IngestRequest");
    const [event] = body.events;
    keysWithin(event, "Event");
    keysWithin(event.source, "Source");
    keysWithin(event.subject, "Subject");
    // The panel checks registered properties strictly: an unknown field rejects the event.
    keysWithin(event.properties, "LeadCreatedV1");
    // With every switch as the site ships it and each property set: the suspect
    // mark, the visit's analytics id (panel v0.4.0) and the sale (panel v0.3.0).
    const flow = { flow: "estimate" as const, quotedCents: 7700, pricingValidFrom: "2026-10-03", estimateInputs: { bedrooms: "2" } };
    const visit = { analyticsId: "0b5c1f0e-7d1a-4e8b-9c2d-3f4a5b6c7d8e" };
    const [full] = leadCreatedBody(lead, { ...ctx, ...visit, suspect: "too_fast", flow }, "vifnet-site").events;
    expect(Object.keys(full.properties)).toEqual(["channel", "suspect", "analytics_id", "flow", "quoted_cents", "pricing_valid_from", "estimate_inputs"]);
    keysWithin(full.properties, "LeadCreatedV1");
  });

  // On since the panel v0.4.0 takes `analytics_id`; off, for a panel that refuses it.
  it("sends the visit's analytics id as the site ships, and never an empty one", () => {
    expect(PANEL_ANALYTICS_ID).toBe(true);
    const visited = { ...ctx, analyticsId: "a1.b2:c3-d4" };
    expect(leadCreatedBody(lead, visited, "vifnet-site").events[0].properties).toEqual({ channel: "form", analytics_id: "a1.b2:c3-d4" });
    expect(leadCreatedBody(lead, ctx, "vifnet-site").events[0].properties).toEqual({ channel: "form" });
    expect(leadCreatedBody(lead, { ...ctx, analyticsId: "" }, "vifnet-site").events[0].properties).toEqual({ channel: "form" });
    expect(leadCreatedBody(lead, visited, "vifnet-site", false).events[0].properties).toEqual({ channel: "form" });
  });

  it("meets the panel's checks on the envelope", () => {
    const [event] = leadCreatedBody(lead, ctx, "vifnet-site").events;
    expect(event.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(event.occurredAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/);
    expect(event.subject.brandId).toMatch(/^[a-z0-9][a-z0-9_-]{0,63}$/);
    expect(isOpaqueId(event.subject.leadId)).toBe(true);
    expect(isOpaqueId(event.subject.locationId ?? "")).toBe(true);
  });

  it("keeps a UUIDv7's time in its first 48 bits and is a function of the context", () => {
    const id = uuidV7(ctx.at, ctx.idempotencyKey);
    expect(Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16)).toBe(ctx.at.getTime());
    expect(uuidV7(ctx.at, ctx.idempotencyKey)).toBe(id);
    expect(uuidV7(ctx.at, "another key")).not.toBe(id);
  });

  it("keeps what the customer typed out of properties, and NUL out of everything", () => {
    const [event] = leadCreatedBody({ ...lead, mobile: "212\u0000555", subject: "move", locality: "", extras: { name: "Jane\u0000" } }, ctx, "vifnet-site").events;
    expect(event.properties).toEqual({ channel: "form" });
    expect(event.pii).toEqual({ name: "Jane", phone: "212555", need: "Entrée / sortie" });
    expect(JSON.stringify(event)).not.toContain("\\u0000");
  });

  it("sends a callback as the panel's callback, without its consent", () => {
    const consent = { text: "J’accepte d’être rappelé·e à ce numéro au sujet de ma demande.", at: "2026-10-01T09:30:00.000Z" };
    const [event] = leadCreatedBody({ ...lead, channel: "callback", consent }, ctx, "vifnet-site").events;
    expect(event.properties).toEqual({ channel: "callback" });
    expect(JSON.stringify(event)).not.toContain(consent.text);
  });

  // LEAD-FORMS-REVIEW-2026-10-03 #13: the operator read `deep`, `standard`.
  it("names the job in the operator's words: the French service card's name", () => {
    for (const subject of SUBJECTS) {
      expect(PANEL_NEED[subject], subject).toBe(TEXT.fr.services.items[subject].name);
      const [event] = leadCreatedBody({ ...lead, subject }, ctx, "vifnet-site").events;
      expect(event.pii?.["need"], subject).toBe(TEXT.fr.services.items[subject].name);
    }
  });

  it("keeps a job that is none of ours as it was posted", () => {
    const [event] = leadCreatedBody({ ...lead, subject: "windows" }, ctx, "vifnet-site").events;
    expect(event.pii?.["need"]).toBe("windows");
  });

  // MESSENGER-CHANNELS-SPEC §2.1: the kit decides the channel (`ctx.channel`) and passes the chat's reference.
  it("sends a messenger lead as the kit names it, with the chat's reference, in the proto's spelling", () => {
    const whatsapp = { ...lead, channel: "whatsapp" as const, messageRef: "VF-7K3F" };
    const [wa] = leadCreatedBody(whatsapp, { ...ctx, channel: "whatsapp", messageRef: "VF-7K3F" }, "vifnet-site").events;
    expect(wa.properties).toEqual({ channel: "whatsapp", message_ref: "VF-7K3F" });
    keysWithin(wa.properties, "LeadCreatedV1");
    const [tg] = leadCreatedBody({ ...whatsapp, channel: "telegram" }, { ...ctx, channel: "telegram", messageRef: "VF-7K3F" }, "vifnet-site").events;
    expect(tg.properties).toEqual({ channel: "telegram", message_ref: "VF-7K3F" });
  });

  it("keeps the kit's word over the lead's own: a messenger lead the panel cannot take yet is a form", () => {
    const whatsapp = { ...lead, channel: "whatsapp" as const, messageRef: "VF-7K3F" };
    expect(leadCreatedBody(whatsapp, { ...ctx, channel: "form" }, "vifnet-site").events[0].properties).toEqual({ channel: "form" });
  });

  it("names the lead's channel itself for a context built by hand, and no empty reference", () => {
    expect(leadCreatedBody({ ...lead, channel: "callback" }, ctx, "vifnet-site").events[0].properties).toEqual({ channel: "callback" });
    expect(leadCreatedBody(lead, { ...ctx, messageRef: "" }, "vifnet-site").events[0].properties).toEqual({ channel: "form" });
  });

  it("marks a suspect lead only when the kit says it is one", () => {
    const [clean] = leadCreatedBody(lead, ctx, "vifnet-site").events;
    expect(clean.properties).toEqual({ channel: "form" });
    for (const suspect of ["rate_limited", "too_fast"] as const) {
      const [event] = leadCreatedBody(lead, { ...ctx, suspect }, "vifnet-site").events;
      expect(event.properties).toEqual({ channel: "form", suspect });
    }
  });

  it("leaves the location out for a lead from no point", () => {
    const [event] = leadCreatedBody({ ...lead, placeSlug: null }, ctx, "vifnet-site").events;
    expect(event.subject).toEqual({ brandId: "vifnet", leadId: LEAD_ID });
  });

  // FORM-VARIANTS-SPEC "Booking providers contract": a booking names its lead by kitstart's leadRef.
  it("sends kitstart's leadRef as the panel's lead id, not one of its own", () => {
    expect(panelLeadId(ctx)).toBe(ctx.leadRef);
    expect(leadCreatedBody(lead, ctx, "vifnet-site").events[0].subject.leadId).toBe(ctx.leadRef);
    expect(isLeadRef(LEAD_ID)).toBe(true);
    expect(isOpaqueId(LEAD_ID)).toBe(true);
  });

  it("derives the kit's shape of reference for a context built by hand", () => {
    const bare: LeadWebhookContext = { ...ctx };
    delete bare.leadRef;
    expect(panelLeadId(bare)).toBe(leadRef(ctx.leadId, ctx.idempotencyKey));
    expect(panelLeadId(bare)).toMatch(/^lead-42-[0-9a-f]{8}$/);
    expect(isOpaqueId(panelLeadId({ leadId: 12345678, idempotencyKey: ctx.idempotencyKey }))).toBe(true);
  });

  it("refuses ids the panel takes for phone numbers", () => {
    expect(isOpaqueId("lead-1234567")).toBe(true);
    expect(isOpaqueId("1234567")).toBe(false);
    expect(isOpaqueId("06.12.34.56.78")).toBe(false);
    expect(isOpaqueId("+33612345678")).toBe(false);
  });

  it("gives every point a slug the panel accepts as a location id", () => {
    for (const slug of site.placeSlugs) expect(isOpaqueId(slug), slug).toBe(true);
  });
});

describe("the lead webhook, wired as the site wires it", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  /** What the panel would receive for each lead, through kitstart's webhook built with `options`. */
  async function delivered(
    options: ReturnType<typeof panelWebhookOptions>,
    leads: readonly Lead[],
    meta: { analyticsId?: string } = {},
  ): Promise<{ panelSuspect: boolean; bodies: unknown[] }> {
    dir = mkdtempSync(join(tmpdir(), "vifnet-hook-"));
    const env = parseServerEnv(site, {
      LEADS_DB_PATH: join(dir, "leads.db"),
      LEAD_WEBHOOK_URL: "http://127.0.0.1:59120/api/ingest/v1/events",
      LEAD_WEBHOOK_KEY_ID: "vifnet-site",
      LEAD_WEBHOOK_SECRET: "test-secret",
    });
    const bodies: unknown[] = [];
    const hook = leadWebhook(site, env, {
      ...options,
      fetch: async (input, init) => {
        bodies.push(JSON.parse(await new Request(input, init).text()));
        return new Response(JSON.stringify({ results: [{ index: 0, status: "accepted" }] }), { status: 207 });
      },
      log: { info: () => {}, warn: () => {}, error: () => {} },
    });
    if (!hook) throw new Error("the webhook should be on");
    try {
      leads.forEach((l, i) => hook.enqueue(l, i + 1, { locale: "fr", formId: "quote", ...meta }));
      await hook.tick();
      return { panelSuspect: hook.panelSuspect, bodies };
    } finally {
      hook.close();
    }
  }

  /** One event whose properties are exactly these: a `suspect` key that should not be there fails it. */
  const withProperties = (properties: Record<string, unknown>) => ({ events: [expect.objectContaining({ properties })] });
  const fast: Lead = { ...lead, spamVerdict: "too-fast" };
  const limited: Lead = { ...lead, spamVerdict: "rate-limited" };
  const trapped: Lead = { ...lead, spamVerdict: "honeypot" };

  // LEAD-FORMS-REVIEW-2026-10-03 #18; on since panel v0.3.0 accepts `suspect`.
  it("says why a lead is suspect — never for the honeypot", async () => {
    expect(PANEL_SUSPECT).toBe(true);
    const { panelSuspect, bodies } = await delivered(panelWebhookOptions("vifnet-site"), [lead, fast, limited, trapped]);
    expect(panelSuspect).toBe(true);
    expect(bodies).toEqual([
      withProperties({ channel: "form" }),
      withProperties({ channel: "form", suspect: "too_fast" }),
      withProperties({ channel: "form", suspect: "rate_limited" }),
      withProperties({ channel: "form" }),
    ]);
  });

  // A regular clean sold as an estimate, and a deep clean asked as a quote.
  const estimated: Lead = {
    ...lead,
    subject: "standard",
    flow: "estimate",
    price: { cents: 7700, validFrom: "2026-10-03", inputs: { bedrooms: "2", surface: "40-70", frequency: "biweekly" } },
  };
  const quoted: Lead = { ...lead, flow: "quote" };

  // The switch, for a panel that cannot take the property: nothing of it is sent.
  it("switched off, sends no suspect marker", async () => {
    const { panelSuspect, bodies } = await delivered(panelWebhookOptions("vifnet-site", { panelSuspect: false }), [fast, limited, trapped]);
    expect(panelSuspect).toBe(false);
    expect(bodies).toEqual([fast, limited, trapped].map(() => withProperties({ channel: "form" })));
  });

  // FORM-VARIANTS-SPEC.md, "Contract amendments" 1; on since panel v0.3.0.
  it("sends the flow, the server's price, the model's date and the answers", async () => {
    expect(PANEL_FLOW).toBe(true);
    const { bodies } = await delivered(panelWebhookOptions("vifnet-site"), [estimated, quoted, { ...lead, channel: "callback" }]);
    expect(bodies).toEqual([
      withProperties({
        channel: "form",
        flow: "estimate",
        quoted_cents: 7700,
        pricing_valid_from: "2026-10-03",
        estimate_inputs: { bedrooms: "2", surface: "40-70", frequency: "biweekly" },
      }),
      // A quote carries no price; a lead with no flow (a callback) carries nothing.
      withProperties({ channel: "form", flow: "quote" }),
      withProperties({ channel: "callback" }),
    ]);
  });

  // The id the page posted reaches the body through the kit's queue with the
  // production wiring; switched off, it does not.
  it("carries the posted analytics id through the outbox under its switch", async () => {
    const meta = { analyticsId: "0b5c1f0e-7d1a-4e8b-9c2d-3f4a5b6c7d8e" };
    const on = await delivered(panelWebhookOptions("vifnet-site"), [lead], meta);
    expect(on.bodies).toEqual([withProperties({ channel: "form", analytics_id: meta.analyticsId })]);
    const off = await delivered(panelWebhookOptions("vifnet-site", { panelAnalyticsId: false }), [lead], meta);
    expect(off.bodies).toEqual([withProperties({ channel: "form" })]);
  });

  // MESSENGER-CHANNELS-SPEC §2.1, §5: on, since the panel with the messenger channels ships first.
  it("sends a messenger lead's channel and reference through the outbox, and a form with neither when switched off", async () => {
    expect(PANEL_MESSENGER).toBe(true);
    const whatsapp: Lead = { ...lead, channel: "whatsapp", messageRef: "VF-7K3F" };
    const telegram: Lead = { ...lead, channel: "telegram", messageRef: "VF-9QX2" };
    const on = await delivered(panelWebhookOptions("vifnet-site"), [whatsapp, telegram, lead]);
    expect(on.bodies).toEqual([
      withProperties({ channel: "whatsapp", message_ref: "VF-7K3F" }),
      withProperties({ channel: "telegram", message_ref: "VF-9QX2" }),
      withProperties({ channel: "form" }),
    ]);
    const off = await delivered(panelWebhookOptions("vifnet-site", { panelMessenger: false }), [whatsapp, telegram]);
    expect(off.bodies).toEqual([withProperties({ channel: "form" }), withProperties({ channel: "form" })]);
  });

  it("switched off, sends no sale", async () => {
    const { bodies } = await delivered(panelWebhookOptions("vifnet-site", { panelFlow: false }), [estimated, quoted]);
    expect(bodies).toEqual([withProperties({ channel: "form" }), withProperties({ channel: "form" })]);
  });

  it("is off without LEAD_WEBHOOK_URL", () => {
    dir = mkdtempSync(join(tmpdir(), "vifnet-hook-"));
    const env = parseServerEnv(site, { LEADS_DB_PATH: join(dir, "leads.db") });
    expect(env.leadWebhook).toBeNull();
  });

  it("posts the event signed the way the panel verifies it", async () => {
    dir = mkdtempSync(join(tmpdir(), "vifnet-hook-"));
    const env = parseServerEnv(site, {
      LEADS_DB_PATH: join(dir, "leads.db"),
      LEAD_WEBHOOK_URL: "http://127.0.0.1:59120/api/ingest/v1/events",
      LEAD_WEBHOOK_KEY_ID: "vifnet-site",
      LEAD_WEBHOOK_SECRET: "test-secret",
    });
    const target = env.leadWebhook;
    if (!target) throw new Error("the webhook should be on");
    const sent: Request[] = [];
    const hook = leadWebhook(site, env, {
      signing: SA_INGEST_SIGNING,
      buildBody: (l, c) => leadCreatedBody(l, c, target.keyId),
      fetch: async (input, init) => {
        sent.push(new Request(input, init));
        return new Response(JSON.stringify({ results: [{ index: 0, status: "accepted" }] }), { status: 207 });
      },
      log: { info: () => {}, warn: () => {}, error: () => {} },
    });
    if (!hook) throw new Error("the webhook should be on");
    try {
      hook.enqueue(lead, 7, { locale: "en", formId: "quote" });
      expect(await hook.tick()).toMatchObject({ delivered: 1 });
    } finally {
      hook.close();
    }

    const [request] = sent;
    if (!request) throw new Error("nothing was sent");
    const raw = await request.text();
    const timestamp = request.headers.get("x-sa-timestamp") ?? "";
    expect(request.headers.get("x-sa-key-id")).toBe("vifnet-site");
    expect(request.headers.get("x-sa-signature")).toBe(
      createHmac("sha256", "test-secret").update(`sa-ingest/v1.${timestamp}.${raw}`).digest("hex"),
    );
    const body: unknown = JSON.parse(raw);
    // An array in toMatchObject must match in length: one event, no more.
    expect(body).toMatchObject({
      events: [
        {
          source: { kind: "site", id: "vifnet-site" },
          subject: { brandId: "vifnet", locationId: "vifnet", leadId: expect.stringMatching(/^lead-7-[0-9a-f]{8}$/) },
        },
      ],
    });
  });
});
