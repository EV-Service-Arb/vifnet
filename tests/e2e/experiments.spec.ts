import { DatabaseSync } from "node:sqlite";
import { MIN_FILL_MS, normalizePhone } from "../../src/shared/lib/sites-tools/index";
import { expect, test, type Page } from "@playwright/test";
import { abState, LEADS_DB, POSTHOG_HOST } from "./env";

// Experiment `lead_form` (docs/EXPERIMENTS.md), the same key and a/b arms as
// aquafix's: a is kitstart's LeadCapture on one screen (`single`), b one
// question per screen (`steps`), c — this brand's — the price first (`steps`
// over the size and priced frequency cards). The rest of the suite is pinned to a.

type Sent = { event: string; properties: Record<string, unknown> };

/** Every beacon the page sends to the (unreachable) PostHog host, as sent. */
async function beacons(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];
  page.on("request", request => {
    if (!request.url().startsWith(POSTHOG_HOST)) return;
    const body = request.postData();
    if (body) sent.push(JSON.parse(body) as Sent);
  });
  await page.route(`${POSTHOG_HOST}/**`, route => route.fulfill({ status: 200, body: "1" }));
  return sent;
}

const ours = (sent: Sent[], event: string) => sent.filter(s => s.event === event).map(s => s.properties);
/** One experiment's events: every page carries both tests, each with its own exposure and contacts. */
const of = (sent: Sent[], event: string, experiment = "lead_form") => ours(sent, event).filter(p => p["experiment"] === experiment);

const card = (page: Page) => page.locator("#devis");

// The rate limit counts 5 leads per address; the suite's other submissions
// come from 127.0.0.1, so each test here posts from an address of its own.
test.describe("variant b", () => {
  test.use({ storageState: abState("b"), extraHTTPHeaders: { "x-forwarded-for": "10.9.0.1" } });

  test("asks one question a screen, the phone last, and its events carry the arm", async ({ page }) => {
    const sent = await beacons(page);
    await page.goto("/fr#devis");
    await expect(page.locator("form#devis-form select")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Prestation" })).toHaveCount(0);
    const form = page.locator("form#devis-form");
    await expect(form.locator("input[name=mobile]")).toBeHidden();

    // A quote asks nothing more: one tap, and the postcode and the phone share the last screen.
    await card(page).getByRole("radio", { name: "Entrée / sortie" }).click();
    await expect(form.locator("input[name=locality]")).toBeFocused();
    await form.locator("input[name=locality]").fill("69003");
    await form.locator("input[name=mobile]").fill("06 22 33 44 55");
    await page.waitForTimeout(MIN_FILL_MS + 500);
    await card(page).getByRole("button", { name: "Recevoir mon devis gratuit →" }).click();
    await expect(card(page).getByRole("status")).toBeVisible();

    const arm = { experiment: "lead_form", variant: "b" };
    await expect.poll(() => of(sent, "experiment_exposed")).toEqual([expect.objectContaining({ ...arm, forced: false, brand_id: "vifnet", location_id: "vifnet" })]);
    expect(ours(sent, "lead_form_step")).toEqual([expect.objectContaining({ ...arm, step: "phone", layout: "steps", form_id: "quote" })]);
    expect(ours(sent, "lead_form_start")).toEqual([expect.objectContaining({ ...arm, layout: "steps" })]);
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false, extraHTTPHeaders: { "x-forwarded-for": "10.9.0.2" } });

    test("shows every screen at once, posts, and the lead is stored", async ({ page }, testInfo) => {
      const mobile = (await import("./support/mobile")).freshMobile("07");
      await page.goto("/fr#devis");
      const form = page.locator("form#devis-form");
      await expect(form.locator("input[name=mobile]")).toBeVisible();
      await form.getByRole("radio", { name: "Entrée / sortie" }).click();
      await form.locator("input[name=locality]").fill(`69003-${testInfo.project.name}`);
      await form.locator("input[name=mobile]").fill(mobile);
      await page.waitForTimeout(MIN_FILL_MS + 500);
      await form.locator("button[type=submit]").click();
      await page.waitForURL("**/fr/thanks");

      const db = new DatabaseSync(LEADS_DB, { readOnly: true });
      try {
        const row = db.prepare("SELECT job, location_id, spam_verdict, channel FROM leads WHERE mobile = ?").get(normalizePhone(mobile));
        expect(row).toEqual({ job: "move", location_id: "vifnet", spam_verdict: null, channel: "form" });
      } finally {
        db.close();
      }
    });
  });
});

test.describe("variant c", () => {
  test.use({ storageState: abState("c") });

  test("opens on the size, and each screen moved to is counted under the arm", async ({ page }) => {
    const sent = await beacons(page);
    await page.goto("/fr#devis");
    await expect(page.locator("form#devis-form select")).toHaveCount(0);
    await card(page).getByRole("radio", { name: "2 chambres", exact: true }).click();
    await card(page).getByRole("radio", { name: "40 à 70 m²", exact: true }).click();
    await card(page).getByRole("radio", { name: /^Chaque semaine/ }).click();
    const arm = { experiment: "lead_form", variant: "c", layout: "steps" };
    await expect.poll(() => of(sent, "experiment_exposed")).toEqual([expect.objectContaining({ experiment: "lead_form", variant: "c" })]);
    await expect
      .poll(() => ours(sent, "lead_form_step").map(p => p["step"]))
      .toEqual(["estimate_frequency", "phone"]);
    for (const p of ours(sent, "lead_form_step")) expect(p).toMatchObject(arm);
  });
});

test("the control's events carry the experiment and its variant", async ({ page }) => {
  const sent = await beacons(page);
  await page.goto("/fr#devis");
  await expect(page.locator("form#devis-form select")).toHaveCount(0);
  await page.locator("form#devis-form input[name=mobile]").focus();
  await page.locator("#demande a[data-intent=form_open]").click();
  // A call tap, kept from leaving for the dialer: our listener runs in the capture phase first.
  // The server under test has no panel, so the place shows no number; the
  // link is the one a live place's header would carry, and the listener is
  // on the document, so it is the same tap.
  await page.evaluate(() => {
    document.addEventListener("click", e => e.preventDefault());
    const call = Object.assign(document.createElement("a"), { href: "tel:+33612345678" });
    document.body.append(call);
    call.click();
  });

  const base = { experiment: "lead_form", variant: "a", forced: false, brand_id: "vifnet" };
  // lead_form's events say the visitor's lead_channel arm (pinned to a) and what the card offered: this
  // place has no messenger, so lead_channel is inert and lead_form is not superseded.
  await expect.poll(() => of(sent, "experiment_exposed")).toEqual([expect.objectContaining({ ...base, lead_channel: "a", channels_available: "none" })]);
  expect(of(sent, "experiment_exposed")[0]).not.toHaveProperty("superseded");
  await expect
    .poll(() => of(sent, "experiment_contact").map(p => p["channel"]))
    .toEqual(["form_open", "phone"]);
  for (const p of of(sent, "experiment_contact")) expect(p).toMatchObject(base);
  // booking_provider counts the same page view and taps under its own name.
  const booking = { ...base, experiment: "booking_provider" };
  await expect.poll(() => of(sent, "experiment_exposed", "booking_provider")).toEqual([expect.objectContaining(booking)]);
  await expect.poll(() => of(sent, "experiment_contact", "booking_provider").map(p => p["channel"])).toEqual(["form_open", "phone"]);
  // kitstart's own funnel, on one schema across brands: the arm rides on it too.
  const kit = { experiment: "lead_form", variant: "a", layout: "single", form_id: "quote", brand_id: "vifnet" };
  await expect.poll(() => ours(sent, "lead_form_start")).toEqual([expect.objectContaining(kit)]);
  await expect.poll(() => ours(sent, "lead_form_view")).toEqual([expect.objectContaining(kit)]);
});

test.describe("a forced visit", () => {
  test.use({ storageState: abState("a") });

  test("renders the variant asked for, and marks the browser as QA", async ({ page, context }) => {
    const sent = await beacons(page);
    await page.goto("/fr?ab_lead_form=b#devis");
    await expect(page.locator("form#devis-form [data-need-option]")).toHaveCount(4);
    await expect.poll(() => of(sent, "experiment_exposed")).toEqual([expect.objectContaining({ variant: "b", forced: true })]);
    const jar = Object.fromEntries((await context.cookies()).map(c => [c.name, c.value]));
    // The QA mark holds the visitor's own arms (abState("a")), for leaving QA to give back.
    expect(jar).toMatchObject({ ab_lead_form: "b", ab__qa: "lead_form.a~booking_provider.a~lead_channel.a" });
    // kitstart's own page view says so too (AnalyticsBoundary's qaCookie).
    await expect.poll(() => ours(sent, "location_page_view")).toEqual([expect.objectContaining({ forced: true })]);
  });
});

test.describe("a new visitor", () => {
  test.use({ storageState: abState(null) });

  test("sends its page view with no forced key at all", async ({ page }) => {
    const sent = await beacons(page);
    await page.goto("/fr");
    await expect.poll(() => ours(sent, "location_page_view")).toHaveLength(1);
    expect(ours(sent, "location_page_view")[0]).not.toHaveProperty("forced");
  });

  test("gets a sticky assignment on the home page, and none on a sub-page", async ({ request }) => {
    const home = await request.get("/fr", { headers: { cookie: "" } });
    expect(home.headers()["set-cookie"] ?? "").toMatch(/ab_lead_form=[abc];/);
    // The panel's weights (mock-panel.mjs: booking_provider all on b), not the code's 50/50.
    expect(home.headers()["set-cookie"] ?? "").toMatch(/ab_booking_provider=b;/);
    expect(home.headers()["set-cookie"] ?? "").toMatch(/ab_lead_channel=[a-g];/);
    const sub = await request.get("/fr/prices", { headers: { cookie: "" } });
    expect(sub.headers()["set-cookie"] ?? "").not.toContain("ab_");
  });

  test("a crawler gets the control and no cookie", async ({ request }) => {
    const response = await request.get("/fr", { headers: { cookie: "", "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } });
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"] ?? "").not.toContain("ab_");
    expect(await response.text()).toContain('name="bedrooms"');
  });
});
