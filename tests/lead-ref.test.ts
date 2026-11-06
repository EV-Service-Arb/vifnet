import { isLeadRef } from "@/shared/lib/sites-tools";
import { afterEach, describe, expect, it } from "vitest";
import { panelHarness, type PanelHarness } from "./support/panel-harness";

const QUOTE = { subject: "deep", locality: "75015", mobile: "06 12 34 56 78", name: "Amanda Reyes" };
// A regular clean is an estimate: answered, it is a priced lead, which books.
const ESTIMATE = { ...QUOTE, subject: "standard", estimate_bedrooms: "2", estimate_surface: "40-70", estimate_frequency: "biweekly" };
const SUBMISSION = "3f2b7c1e-8a4d-4e6f-9b0a-1c2d3e4f5a6b";

let harness: PanelHarness | undefined;
afterEach(() => {
  harness?.close();
  harness = undefined;
});

const eventOf = (body: unknown) => (body as { events: [{ type: string; subject: { leadId: string }; properties: Record<string, unknown> }] }).events[0];

/**
 * The join a booking depends on, through the real route: the reference the
 * page is answered with is the lead id the panel receives in `lead.created`.
 */
describe("a lead's reference, from the page to the panel", () => {
  it("is the same on the script's answer and in lead.created", async () => {
    harness = panelHarness();
    const { status, body } = await harness.post({ ...QUOTE, submission_id: SUBMISSION });
    expect(status).toBe(200);
    expect(isLeadRef(body.lead)).toBe(true);
    const sent = await harness.deliver();
    expect(sent).toHaveLength(1);
    expect(eventOf(sent[0])).toMatchObject({ type: "lead.created", subject: { leadId: body.lead } });
  });
});

/** FORM-VARIANTS-SPEC "Booking amendments" 3: `booking.requested@1`. */
describe("a priced lead's booking request", () => {
  async function bookedLead(h: PanelHarness): Promise<string> {
    const { body } = await h.post({ ...ESTIMATE, submission_id: SUBMISSION });
    expect(body.ok).toBe(true);
    expect(typeof body.cents).toBe("number");
    if (typeof body.lead !== "string") throw new Error("no lead reference");
    return body.lead;
  }

  it("goes after its lead's lead.created, joined by the lead's reference", async () => {
    harness = panelHarness();
    const ref = await bookedLead(harness);
    const answer = await harness.book({ submission: SUBMISSION, lead_ref: ref, provider: "manual", preferred_part: "morning" });
    expect(answer).toEqual({ status: 200, body: { ok: true, queued: true } });
    // Once per lead: a second request is answered and not queued.
    expect((await harness.book({ submission: SUBMISSION, lead_ref: ref, provider: "manual" })).body).toEqual({ ok: true, queued: false });

    const [created, requested, ...rest] = (await harness.deliver()).map(eventOf);
    expect(rest).toEqual([]);
    expect(created).toMatchObject({ type: "lead.created", subject: { leadId: ref } });
    expect(requested).toMatchObject({
      type: "booking.requested",
      typeVersion: 1,
      source: { kind: "site", id: "vifnet-site" },
      subject: { brandId: "vifnet", leadId: ref },
      properties: { lead_ref: ref, provider: "manual", preferred_part: "morning" },
    });
    expect(requested).not.toHaveProperty("pii");
  });

  it("books nothing for a reference the page was not answered with", async () => {
    harness = panelHarness();
    await bookedLead(harness);
    const answer = await harness.book({ submission: SUBMISSION, lead_ref: "lead-1-00000000", provider: "manual" });
    expect(answer.status).toBe(404);
  });
});
