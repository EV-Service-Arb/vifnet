import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { MESSAGE_REF } from "../../src/shared/lib/sites-tools/index";
import { abState, MESSENGER_PORT, POSTHOG_HOST } from "./env";

// Experiment `lead_channel` (MESSENGER-CHANNELS-SPEC §4, docs/EXPERIMENTS.md):
// a is the control, b–g VF-1 … VF-6 of the Figma page "Lead form A/B",
// messengers v3 (109:3739), each forced by its link. Run against the second
// server, whose place has a phone, a WhatsApp number and the bot
// `vifnet_devis_bot` (env.ts, `MESSENGER_PORT`). The frames' rule: inside an
// arm every state has the card's one height — what a state changes is swapped
// in a fixed slot or laid over the card, never pushed under it.

test.use({ baseURL: `http://localhost:${MESSENGER_PORT}`, storageState: abState("a") });

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "the frames are the phone's (390); a computer draws a QR code for WhatsApp instead");
  // The analytics host resolves nowhere: answered, so a beacon is no console error.
  await page.route(`${POSTHOG_HOST}/**`, route => route.fulfill({ status: 204 }));
});

/**
 * Each arm's card at 390, answered: the frame's card (VF-1 109:3776 is 674,
 * VF-2 753, VF-3 674, VF-4 590, VF-5 684, VF-6 674 — each "Mobile 390" frame
 * is 48 more, its 24 px margins) and 24 for "Détail" on a line of its own,
 * which "env. 77 €" pushes there as it does on the control
 * (`quote-card-layout.spec.ts`).
 */
const CARD_HEIGHT = { b: 698, c: 777, d: 698, e: 614, f: 708, g: 698 } as const;
/** The acceptance's play: a pixel either way is the rasteriser's, not the layout's. */
const SLACK = 2;

/** What the console said, errors and warnings, plus anything thrown. */
function listen(page: Page): string[] {
  const said: string[] = [];
  page.on("console", m => {
    if (m.type() === "error" || m.type() === "warning") said.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", e => said.push(`pageerror: ${e.message}`));
  return said;
}

const card = (page: Page) => page.locator("#devis");

/** The card's height, to the pixel. */
const height = async (page: Page) => Math.round(await card(page).evaluate(node => node.getBoundingClientRect().height));

/** The prefilled message names the lead by the brand's reference (`Réf. VF-7K3F`; its shape is `MESSAGE_REF`). */
const REF = /R%C3%A9f\.%20VF-\w+(&|$)/;
const BOT = /^https:\/\/t\.me\/vifnet_devis_bot\?start=VF-\w+$/;
/** Figma's preview line; kitstart joins a number to its unit with a no-break space (`77 €`, `70 m²`). */
const PREVIEW = /Ménage standard · 2 ch\. · 40–70\sm² · 2 sem\. · env\. 77\s€ · 63130 · Réf\. VF-\w+/;
const MESSENGER_LINKS = 'a[href*="wa.me/"], a[href*="t.me/"]';

/** The message a wa.me link opens WhatsApp with, decoded. */
async function messageOf(link: Locator): Promise<string> {
  const href = await link.getAttribute("href");
  return new URL(href ?? "https://wa.me/").searchParams.get("text") ?? "";
}

/**
 * The arm's page, hydrated, the job answered as the frames draw it — the
 * card's "2", "40–70", "2 sem." and a postcode — the price on the card.
 */
async function open(page: Page, arm: string): Promise<void> {
  await page.goto(`/fr?ab_lead_channel=${arm}#devis`);
  await expect(page.locator("form#devis-form select")).toHaveCount(0);
  for (const answer of ["2 chambres", "40 à 70 m²", "Toutes les 2 semaines"]) await card(page).getByRole("radio", { name: answer, exact: true }).click();
  await card(page).getByRole("textbox", { name: "Code postal" }).fill("63130");
  await expect(card(page).locator("[data-price-cents]")).toHaveText("env. 77 €");
}

/** The card is the frame's height for `arm`, the page no wider than the phone, and the call above the form gone (the sticky bar has it). */
async function asDrawn(page: Page, arm: keyof typeof CARD_HEIGHT): Promise<number> {
  const drawn = await height(page);
  expect(drawn, `card height, the frame's ${CARD_HEIGHT[arm]} ± ${SLACK}`).toBeGreaterThanOrEqual(CARD_HEIGHT[arm] - SLACK);
  expect(drawn, `card height, the frame's ${CARD_HEIGHT[arm]} ± ${SLACK}`).toBeLessThanOrEqual(CARD_HEIGHT[arm] + SLACK);
  await expect(card(page).getByRole("link", { name: "Appeler" })).toBeHidden();
  await fitsThePhone(page);
  return drawn;
}

async function fitsThePhone(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth, "no sideways scroll").toBe(clientWidth);
}

/** The card is still `before` tall, and the page the phone's width, once `shown` is on screen. */
async function heldAt(page: Page, before: number, shown: Locator): Promise<void> {
  await expect(shown).toBeVisible();
  expect(await height(page)).toBe(before);
  await fitsThePhone(page);
}

/** The preview the card shows of the message: the job, the answers in short, the price, the postcode and the reference. */
async function previewSaysTheJob(page: Page): Promise<void> {
  await expect(card(page).getByText(PREVIEW)).toBeVisible();
}

/** The message carries the price per visit, the frequency and the reference. */
async function messageSaysTheJob(link: Locator): Promise<void> {
  await expect(link).toHaveAttribute("href", REF);
  const text = await messageOf(link);
  expect(/Réf\. (\S+)/.exec(text)?.[1]).toMatch(MESSAGE_REF);
  expect(text).toMatch(/env\.\s77\s€ \/ passage/);
  expect(text).toMatch(/Fréquence\s:\s/);
  expect(text).toContain("63130");
}

test("a: the control's card, the call above the form, no messenger arm in it", async ({ page }) => {
  const said = listen(page);
  await open(page, "a");
  await expect(card(page).getByText("Nous vous rappelons en moins de 15 minutes.")).toBeVisible();
  await expect(card(page).getByRole("link", { name: "Appeler" })).toBeVisible();
  await expect(card(page).getByRole("button", { name: "Réserver" })).toBeVisible();
  await expect(card(page).getByRole("group", { name: "Ou contactez-nous" })).toBeVisible();
  await expect(card(page).getByRole("combobox", { name: "Canal de réponse" })).toHaveCount(0);
  await expect(card(page).locator('a[href^="https://wa.me/"][href*="VF-"]')).toHaveCount(0);
  await expect(card(page).locator('a[href^="https://t.me/"]')).toHaveCount(0);
  await fitsThePhone(page);
  expect(said).toEqual([]);
});

test("b (VF-1): the channel select in the phone field; WhatsApp and the call at the frame's height", async ({ page }) => {
  const said = listen(page);
  await open(page, "b");
  const select = card(page).getByRole("combobox", { name: "Canal de réponse" });
  const whatsapp = card(page).getByRole("link", { name: "Recevoir mon devis sur WhatsApp" });
  await expect(select).toHaveText(/WhatsApp/);
  await expect(card(page).getByText("Devis rédigé dans WhatsApp · numéro facultatif.")).toBeVisible();
  await messageSaysTheJob(whatsapp);
  const before = await asDrawn(page, "b");

  await select.click();
  // The menu lies over the card: the card does not grow under it.
  await heldAt(page, before, page.getByRole("option", { name: /^Telegram/ }));
  await page.getByRole("option", { name: /^Appel/ }).click();
  await heldAt(page, before, card(page).getByRole("button", { name: "Réserver" }));
  await expect(card(page).getByText("Numéro gardé entre nous · rappel sous 15 min.")).toBeVisible();

  await select.click();
  await page.getByRole("option", { name: /^WhatsApp/ }).click();
  await heldAt(page, before, whatsapp);
  expect(said).toEqual([]);
});

test("c (VF-2): three tiles over one slot, the frame's height for each", async ({ page }) => {
  const said = listen(page);
  await open(page, "c");
  const tiles = card(page).getByRole("group", { name: "Recevoir mon devis par" });
  await expect(tiles.getByRole("button", { name: "WhatsApp" })).toHaveAttribute("aria-pressed", "true");
  await expect(card(page).getByText("Votre devis est prêt à envoyer")).toBeVisible();
  await previewSaysTheJob(page);
  await messageSaysTheJob(card(page).getByRole("link", { name: "Recevoir mon devis sur WhatsApp" }));
  const before = await asDrawn(page, "c");

  await tiles.getByRole("button", { name: "Telegram" }).click();
  const bot = card(page).getByRole("link", { name: "Ouvrir Telegram" });
  await heldAt(page, before, bot);
  await expect(bot).toHaveAttribute("href", BOT);

  await tiles.getByRole("button", { name: "Appel" }).click();
  await heldAt(page, before, card(page).getByRole("button", { name: "Réserver" }));

  await tiles.getByRole("button", { name: "WhatsApp" }).click();
  await heldAt(page, before, card(page).getByRole("link", { name: "Recevoir mon devis sur WhatsApp" }));
  expect(said).toEqual([]);
});

test("d (VF-3): no phone until «Être rappelé», which swaps in its slot", async ({ page }) => {
  const said = listen(page);
  await open(page, "d");
  await expect(card(page).getByText("Votre devis est prêt : envoyez-le-nous sur WhatsApp.")).toBeVisible();
  await expect(card(page).getByRole("textbox", { name: "Téléphone" })).toHaveCount(0);
  await messageSaysTheJob(card(page).getByRole("link", { name: "Recevoir mon devis sur WhatsApp" }));
  await expect(card(page).getByRole("link", { name: "Telegram" })).toHaveAttribute("href", BOT);
  const before = await asDrawn(page, "d");

  await card(page).getByRole("button", { name: "Être rappelé" }).click();
  await heldAt(page, before, card(page).getByRole("button", { name: "Être rappelé sous 15 min" }));
  await expect(card(page).getByRole("textbox", { name: "Téléphone" })).toBeVisible();

  await card(page).getByRole("button", { name: "Revenir à WhatsApp" }).click();
  await heldAt(page, before, card(page).getByRole("link", { name: "Recevoir mon devis sur WhatsApp" }));
  expect(said).toEqual([]);
});

test("e (VF-4): one button; its drawer, and the call in it, lie over the page and the card keeps its height", async ({ page }) => {
  const said = listen(page);
  await open(page, "e");
  await expect(card(page).getByRole("textbox", { name: "Téléphone" })).toHaveCount(0);
  const before = await asDrawn(page, "e");

  await card(page).getByRole("button", { name: "Recevoir mon devis" }).click();
  const drawer = page.getByRole("dialog");
  await heldAt(page, before, drawer.getByText("Où recevoir votre devis ?"));
  await messageSaysTheJob(drawer.getByRole("link", { name: /^WhatsApp/ }));
  await expect(drawer.getByRole("link", { name: /^Telegram/ })).toHaveAttribute("href", BOT);

  await drawer.getByRole("button", { name: /^Être rappelé/ }).click();
  await heldAt(page, before, drawer.getByRole("textbox", { name: "Téléphone" }));
  await expect(drawer.getByRole("button", { name: "Être rappelé sous 15 min" })).toBeVisible();
  expect(said).toEqual([]);
});

test("e (VF-4): from its call, focus is on the phone and Escape closes the drawer; the card is as it was", async ({ page }) => {
  await open(page, "e");
  const before = await height(page);
  await card(page).getByRole("button", { name: "Recevoir mon devis" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: /^Être rappelé/ }).click();
  // The pressed button leaves; focus goes to the phone, inside the drawer (a frame later, ~20 ms).
  await expect(drawer.getByRole("textbox", { name: "Téléphone" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  expect(await height(page)).toBe(before);
});

test("f (VF-5): the lede is the channel chip; its menu and the call keep the frame's height", async ({ page }) => {
  const said = listen(page);
  await open(page, "f");
  const chip = card(page).getByRole("combobox", { name: "Canal de réponse" });
  await expect(chip).toHaveText("Réponse sur WhatsApp · 15 min");
  await expect(card(page).getByText("Nous vous rappelons en moins de 15 minutes.")).toHaveCount(0);
  await previewSaysTheJob(page);
  await messageSaysTheJob(card(page).getByRole("link", { name: "Recevoir mon devis sur WhatsApp" }));
  const before = await asDrawn(page, "f");

  await chip.click();
  await heldAt(page, before, page.getByRole("option", { name: /^Telegram/ }));
  await page.getByRole("option", { name: /^Appel/ }).click();
  await expect(chip).toHaveText("Réponse par appel · 15 min");
  await heldAt(page, before, card(page).getByRole("button", { name: "Réserver" }));
  expect(said).toEqual([]);
});

test("g (VF-6): the WhatsApp button with the bot and 📞 beside it; the call swaps in its slot", async ({ page }) => {
  const said = listen(page);
  await open(page, "g");
  await previewSaysTheJob(page);
  await messageSaysTheJob(card(page).getByRole("link", { name: "Devis sur WhatsApp" }));
  await expect(card(page).getByRole("link", { name: "Telegram" })).toHaveAttribute("href", BOT);
  const before = await asDrawn(page, "g");

  await card(page).getByRole("button", { name: "Être rappelé" }).click();
  const back = card(page).getByRole("button", { name: "Revenir à WhatsApp" });
  await heldAt(page, before, back);
  await expect(card(page).getByRole("textbox", { name: "Téléphone" })).toBeVisible();

  await back.click();
  await heldAt(page, before, card(page).getByRole("link", { name: "Devis sur WhatsApp" }));
  expect(said).toEqual([]);
});

const SCRIPTS = /\/_next\/static\/chunks\/.+\.js(\?.*)?$/;

/**
 * The page as a visitor sees it while its scripts are still on the way: the
 * server's HTML with its styles, the scripts held back. `hydrate` lets them
 * through and loads the page again.
 */
async function beforeHydration(page: Page, arm: string): Promise<{ hydrate: () => Promise<void> }> {
  const hold = (route: Route) => route.abort();
  await page.route(SCRIPTS, hold);
  await page.goto(`/fr?ab_lead_channel=${arm}#devis`);
  await page.evaluate(() => document.fonts.ready);
  // A part of the card streamed after it (a Suspense boundary, `<template id="B:…">`) is swapped in
  // by React's inline script shortly after load, with or without the page's scripts: measure after.
  await expect(card(page).locator("template")).toHaveCount(0);
  const hydrate = async () => {
    await page.unroute(SCRIPTS, hold);
    await page.reload();
    await expect(page.locator("form#devis-form select")).toHaveCount(0);
    // The forced visit's QA chip mounts with the page's script, past the card's.
    await expect(page.getByRole("button", { name: "A/B test switcher" })).toBeVisible();
    await expect(card(page).locator("template")).toHaveCount(0);
  };
  return { hydrate };
}

/** Each arm's main button, drawn by the server before its link is. */
const CTA = {
  b: "Recevoir mon devis sur WhatsApp",
  c: "Recevoir mon devis sur WhatsApp",
  d: "Recevoir mon devis sur WhatsApp",
  e: "Recevoir mon devis",
  f: "Recevoir mon devis sur WhatsApp",
  g: "Devis sur WhatsApp",
} as const;

for (const arm of ["b", "c", "d", "e", "f", "g"] as const) {
  test(`${arm}: no messenger link before hydration, the reference in it after`, async ({ page }) => {
    // A tap before the script would open WhatsApp with no lead posted, and no reference to join the chat to.
    const { hydrate } = await beforeHydration(page, arm);
    await expect(card(page).getByText(CTA[arm], { exact: true })).toBeVisible();
    await expect(page.locator(MESSENGER_LINKS)).toHaveCount(0);

    await hydrate();
    if (arm === "e") await card(page).getByRole("button", { name: "Recevoir mon devis" }).click();
    await expect(page.locator('a[href*="wa.me/"]').first()).toHaveAttribute("href", REF);
  });

  test(`${arm}: the card keeps its height through hydration`, async ({ page }) => {
    const { hydrate } = await beforeHydration(page, arm);
    const served = await height(page);

    await hydrate();
    // VF-4's links are in its drawer; every other arm's message link is in the card once it has its reference.
    if (arm !== "e") await expect(card(page).locator('a[href*="wa.me/"]').first()).toHaveAttribute("href", REF);
    expect(await height(page), "the hydrated card, against the served one").toBe(served);
  });
}

/**
 * The card's height at every frame from the first paint for `ms`, as the
 * heights it went through in order; `window.__heightsDone` once it is over.
 */
function recordHeights(ms: number): void {
  const w = window as unknown as { __heights: number[]; __heightsDone: boolean };
  w.__heights = [];
  w.__heightsDone = false;
  const start = performance.now();
  const frame = () => {
    const box = document.getElementById("devis")?.getBoundingClientRect();
    const last = w.__heights.at(-1);
    if (box && Math.round(box.height) !== last) w.__heights.push(Math.round(box.height));
    if (performance.now() - start < ms) requestAnimationFrame(frame);
    else w.__heightsDone = true;
  };
  requestAnimationFrame(frame);
}

for (const arm of ["a", "b", "c", "d", "e", "f", "g"] as const) {
  // Hydration used to collapse the arm's block for a frame or two (674 → 526 → 674, 2026-10-07).
  test(`${arm}: the card never shrinks while the page loads and hydrates`, async ({ page }) => {
    await page.addInitScript(recordHeights, 3000);
    await page.goto(`/fr?ab_lead_channel=${arm}#devis`);
    await expect(page.getByRole("button", { name: "A/B test switcher" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __heightsDone: boolean }).__heightsDone), { timeout: 10_000 }).toBe(true);
    const heights = await page.evaluate(() => (window as unknown as { __heights: number[] }).__heights);
    // Sorted ascending, the heights are as they came: the card only ever grew.
    expect(heights, "the card's heights, frame by frame").toEqual([...heights].sort((x, y) => x - y));
  });
}

test("a forced arm is counted under lead_channel, and lead_form's events say it", async ({ page }) => {
  const sent: { event: string; properties: Record<string, unknown> }[] = [];
  page.on("request", request => {
    const body = request.url().startsWith(POSTHOG_HOST) ? request.postData() : null;
    if (body) sent.push(JSON.parse(body) as (typeof sent)[number]);
  });
  await page.goto("/fr?ab_lead_channel=c#devis");
  const exposed = (experiment: string) => sent.filter(s => s.event === "experiment_exposed" && s.properties["experiment"] === experiment).map(s => s.properties);
  const offered = { channels_available: "wa,tg" };
  await expect.poll(() => exposed("lead_channel")).toEqual([expect.objectContaining({ experiment: "lead_channel", variant: "c", forced: true, ...offered })]);
  // lead_channel drew the card: lead_form's exposure says it was superseded, and by which arm.
  await expect.poll(() => exposed("lead_form")).toEqual([expect.objectContaining({ experiment: "lead_form", variant: "a", lead_channel: "c", superseded: true, ...offered })]);
  await expect.poll(() => exposed("booking_provider")).toEqual([expect.objectContaining({ experiment: "booking_provider", ...offered })]);
});

test.describe("a visitor in lead_form's price-first arm", () => {
  test.use({ storageState: abState("c") });

  // Where the place has WhatsApp, lead_channel decides the whole card, its control a too: one form for every arm.
  test("a: lead_channel's control is the compact card under lead_channel's name, not lead_form's price first", async ({ page }) => {
    await page.goto("/fr?ab_lead_channel=a#devis");
    await expect(page.locator("form#devis-form select")).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "Voir les prix" })).toHaveCount(0);
    await expect(card(page).getByRole("radio", { name: "Je ne sais pas" })).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "Réserver" })).toBeVisible();
    await expect(card(page).locator('[data-experiment="lead_channel"][data-variant="a"]').first()).toBeAttached();
    await expect(card(page).locator('[data-experiment="lead_form"]')).toHaveCount(0);
  });
});
