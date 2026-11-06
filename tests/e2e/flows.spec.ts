import { DatabaseSync } from "node:sqlite";
import { MIN_FILL_MS, normalizePhone } from "../../src/shared/lib/sites-tools/index";
import { expect, test, type Page } from "@playwright/test";
import { abState, LEADS_DB } from "./env";
import { freshMobile } from "./support/mobile";

// The form variants (FORM-VARIANTS-SPEC.md): a regular clean is an estimate,
// priced live from its answers and stored at the server's own price; a deep
// clean, a move and after-works are quotes, with the callback (and photos on
// WhatsApp, which this place has not). The mock panel's price list is down
// (`mock-panel.mjs`), so every price here is the baked model's placeholder
// (`src/shared/config/pricing.ts`): 45 € base, bedrooms and surface added,
// the frequency's discount, to the euro, 49 € at least.

const card = (page: Page) => page.locator("#devis");
const form = (page: Page) => page.locator("form#devis-form");
const hydrated = (page: Page) => expect(page.locator("form#devis-form select")).toHaveCount(0);
const price = (page: Page) => form(page).locator("[data-price-cents]");
const answer = (page: Page, label: string) => form(page).getByRole("radio", { name: label, exact: true }).check();
const isQuote = (url: string) => new URL(url).pathname === "/quote";

async function contact(page: Page, mobile: string): Promise<void> {
  await form(page).locator("input[name=locality]").fill("75011");
  await form(page).locator("input[name=mobile]").fill(mobile);
  // The time trap flags anything faster than a person; this is a person.
  await page.waitForTimeout(MIN_FILL_MS + 500);
}

async function pick(page: Page, job: string): Promise<void> {
  await page.getByRole("combobox", { name: "Prestation" }).click();
  await page.getByRole("listbox").getByRole("option", { name: job }).click();
}

function leadRow(mobile: string): unknown {
  const db = new DatabaseSync(LEADS_DB, { readOnly: true });
  try {
    return db
      .prepare("SELECT job, flow, quoted_cents, pricing_valid_from, estimate_inputs, extras FROM leads WHERE mobile = ?")
      .get(normalizePhone(mobile));
  } finally {
    db.close();
  }
}

// The rate limit counts 5 leads per address: each describe posts from its own.
test.describe("a regular clean, priced live", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.7.0.1" } });

  test("the price follows the answers, with how it was reached", async ({ page }) => {
    await page.goto("/fr#devis");
    await hydrated(page);
    await expect(page.getByRole("combobox", { name: "Prestation" })).toHaveText("Ménage standard");
    await expect(form(page).getByText("Répondez aux questions pour voir le prix.")).toBeVisible();
    await expect(price(page)).toHaveCount(0);
    // The estimate asks the bedrooms itself: the optional question is gone.
    await expect(page.getByRole("combobox", { name: "Chambres (facultatif)" })).toHaveCount(0);

    await answer(page, "2 chambres");
    await answer(page, "40 à 70 m²");
    await answer(page, "Toutes les 2 semaines");
    // 45 + 30 + 10 = 85 €, 10 % off = 76,50 €, to the euro: 77 €.
    await expect(price(page)).toHaveAttribute("data-price-cents", "7700");
    await expect(price(page)).toHaveText(/^env\.\s77\s€$/);
    // How it was reached sits behind "Détail" on the compact card: a popover
    // over the page (kitstart's, portalled to <body>), so the card keeps its height.
    const before = await card(page).evaluate(node => node.getBoundingClientRect().height);
    await form(page).getByRole("button", { name: "Détail" }).click();
    const breakdown = page.getByRole("dialog", { name: "Détail" });
    await expect(breakdown.getByRole("listitem").filter({ hasText: "Toutes les 2 semaines" })).toContainText("8,50");
    expect(await card(page).evaluate(node => node.getBoundingClientRect().height)).toBe(before);
    await page.keyboard.press("Escape");
    await expect(breakdown).toBeHidden();
    await expect(form(page).getByRole("button", { name: "Détail" })).toBeFocused();

    await answer(page, "Une fois");
    await expect(price(page)).toHaveAttribute("data-price-cents", "8500");
    await answer(page, "5 et plus");
    await answer(page, "Plus de 100 m²");
    await answer(page, "Chaque semaine");
    // 45 + 75 + 45 = 165 €, 15 % off = 140,25 €: 140 €.
    await expect(price(page)).toHaveAttribute("data-price-cents", "14000");
    await expect(card(page)).not.toContainText(/à partir de|dès /i);
    await expect(card(page).getByRole("button", { name: "Réserver" })).toBeVisible();
  });

  test("the server stores its own price: a posted amount is ignored, a forged answer is confirmed first", async ({ page }) => {
    const mobile = freshMobile("06");
    await page.goto("/fr#devis");
    await hydrated(page);
    await answer(page, "2 chambres");
    await answer(page, "40 à 70 m²");
    await answer(page, "Toutes les 2 semaines");
    await expect(price(page)).toHaveAttribute("data-price-cents", "7700");
    await contact(page, mobile);
    // A tampered page: an amount of its own, and an answer the screen did not price.
    const tamper = () =>
      form(page).evaluate(el => {
        for (const name of ["quoted_cents", "cents", "price"]) {
          if (el.querySelector(`input[name=${name}]`)) continue;
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = "1";
          el.append(input);
        }
        const two = el.querySelector<HTMLInputElement>("input[name=estimate_bedrooms][value='2']");
        if (two) two.value = "3";
      });
    await tamper();
    // The server prices the answers it got: 45 + 45 + 10 = 100 €, 10 % off = 90 €.
    // Not the 77 € the screen showed (kitstart 0.11.0's `shown_cents`), so the
    // lead is not taken at either until the visitor confirms the server's price.
    const refused = page.waitForResponse(r => r.request().method() === "POST" && isQuote(r.url()));
    await card(page).getByRole("button", { name: "Réserver" }).click();
    expect(await (await refused).json()).toMatchObject({ ok: false, field: "price_changed", cents: 9000 });
    await expect(card(page)).toContainText(/Le prix a changé : 90\s€ au lieu de 77\s€\./);
    expect(leadRow(mobile)).toBeUndefined();

    // React drew the card again, the answer's value with it: tampered once more, as a forger would.
    await tamper();
    const answered = page.waitForResponse(r => r.request().method() === "POST" && isQuote(r.url()));
    await card(page).getByRole("button", { name: "Réserver" }).click();
    expect(await (await answered).json()).toMatchObject({ ok: true, cents: 9000 });
    expect(leadRow(mobile)).toEqual({
      job: "standard",
      flow: "estimate",
      quoted_cents: 9000,
      pricing_valid_from: "2026-10-03",
      estimate_inputs: JSON.stringify({ bedrooms: "3", surface: "40-70", frequency: "biweekly" }),
      extras: null,
    });
  });

  test("a priced lead is confirmed in the card at the server's price, and the slot is set by a call", async ({ page }) => {
    const outside: string[] = [];
    page.on("request", r => void (!["localhost", "127.0.0.1"].includes(new URL(r.url()).hostname) && outside.push(r.url())));
    await page.goto("/fr#devis");
    await hydrated(page);
    await answer(page, "Studio");
    await answer(page, "Moins de 40 m²");
    await answer(page, "Une fois");
    // 45 €, under the 49 € minimum.
    await expect(price(page)).toHaveAttribute("data-price-cents", "4900");
    await contact(page, freshMobile("07"));
    await card(page).getByRole("button", { name: "Réserver" }).click();
    const status = card(page).getByRole("status");
    await expect(status).toContainText("C’est noté !");
    await expect(status).toContainText(/Demande enregistrée au prix de 49\s€\./);
    await expect(status).toContainText("Nous vous rappelons pour fixer le créneau.");
    await expect(status).not.toContainText("devis ferme");
    await expect(status).toBeFocused();
    await expect(page.locator("iframe")).toHaveCount(0);
    // Nothing but the site itself: no booking provider, no third party (the analytics host is nowhere).
    expect(outside.filter(u => !u.startsWith("https://posthog.e2e.invalid"))).toEqual([]);
  });

  test("in English too", async ({ page }) => {
    await page.goto("/en#devis");
    await hydrated(page);
    await answer(page, "1 bedroom");
    await answer(page, "Over 100 m²");
    await answer(page, "Every month");
    // 45 + 15 + 45 = 105 €, 5 % off = 99,75 €: 100 €.
    await expect(price(page)).toHaveAttribute("data-price-cents", "10000");
    await expect(card(page).getByRole("button", { name: "Book" })).toBeVisible();
  });
});

test.describe("the jobs priced from a visit", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.7.0.2" } });

  for (const job of ["Grand ménage", "Entrée / sortie", "Fin de chantier"]) {
    test(`${job} is a quote, with the callback and no price`, async ({ page }) => {
      await page.goto("/fr#devis");
      await hydrated(page);
      await pick(page, job);
      await expect(form(page).locator("input[name^=estimate_]")).toHaveCount(0);
      await expect(price(page)).toHaveCount(0);
      await expect(card(page).getByRole("button", { name: "Recevoir mon devis gratuit →" })).toBeVisible();
      // Photos go by WhatsApp, which this place has not: the ask stays out, the callback in.
      await expect(card(page)).not.toContainText("Envoyez des photos");
      await expect(card(page).locator('a[href*="wa.me"]')).toHaveCount(0);
      await expect(page.locator("#devis-callback")).toContainText("Rappel");
      await expect(page.getByRole("combobox", { name: "Chambres (facultatif)" })).toBeVisible();
    });
  }

  test("a quote is stored as one, with no price", async ({ page }) => {
    const mobile = freshMobile("06");
    await page.goto("/fr#devis");
    await hydrated(page);
    await pick(page, "Grand ménage");
    await contact(page, mobile);
    await card(page).getByRole("button", { name: "Recevoir mon devis gratuit →" }).click();
    const status = card(page).getByRole("status");
    await expect(status).toContainText("devis ferme");
    await expect(status).not.toContainText("Demande enregistrée");
    expect(leadRow(mobile)).toEqual({
      job: "deep",
      flow: "quote",
      quoted_cents: null,
      pricing_valid_from: null,
      estimate_inputs: null,
      extras: null,
    });
  });
});

// lead_form b (docs/EXPERIMENTS.md): one question a screen — the job, the
// estimate's answers, then the postcode and the phone.
test.describe("variant b", () => {
  test.use({ storageState: abState("b"), extraHTTPHeaders: { "x-forwarded-for": "10.7.0.3" } });

  test("a regular clean tapped first is priced, booked and confirmed", async ({ page }) => {
    const mobile = freshMobile("07");
    await page.goto("/fr#devis");
    await hydrated(page);
    await expect(form(page).locator("input[name^=estimate_]:visible")).toHaveCount(0);
    await card(page).getByRole("radio", { name: "Ménage standard" }).click();
    // Each tap answers its screen and moves on.
    await card(page).getByRole("radio", { name: "3 chambres", exact: true }).click();
    await card(page).getByRole("radio", { name: "70 à 100 m²", exact: true }).click();
    // A frequency is a card with the total it makes.
    await card(page).getByRole("radio", { name: /^Chaque mois/ }).click();
    // 45 + 45 + 25 = 115 €, 5 % off = 109,25 €: 109 €.
    await expect(price(page)).toHaveAttribute("data-price-cents", "10900");
    await contact(page, mobile);
    await card(page).getByRole("button", { name: "Réserver" }).click();
    await expect(card(page).getByRole("status")).toContainText(/Demande enregistrée au prix de 109\s€\./);
    expect(leadRow(mobile)).toMatchObject({ job: "standard", flow: "estimate", quoted_cents: 10_900 });
  });

  test("a deep clean tapped first stays a quote", async ({ page }) => {
    await page.goto("/fr#devis");
    await hydrated(page);
    await card(page).getByRole("radio", { name: "Grand ménage" }).click();
    await expect(form(page).locator("input[name^=estimate_]")).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "Recevoir mon devis gratuit →" })).toBeVisible();
  });
});

// lead_form c (docs/EXPERIMENTS.md): the regular clean's size first, its
// frequencies as priced cards, then the contact; "Je ne sais pas" makes it a quote.
test.describe("variant c", () => {
  test.use({ storageState: abState("c"), extraHTTPHeaders: { "x-forwarded-for": "10.7.0.5" } });

  test("the size, then a priced frequency, books at the server's price", async ({ page }) => {
    const mobile = freshMobile("07");
    await page.goto("/fr#devis");
    await hydrated(page);
    await card(page).getByRole("radio", { name: "2 chambres", exact: true }).click();
    await card(page).getByRole("radio", { name: "40 à 70 m²", exact: true }).click();
    await card(page).getByRole("radio", { name: /^Chaque semaine/ }).click();
    // 45 + 30 + 10 = 85 €, 15 % off = 72,25 €: 72 €; half back as a tax credit.
    await expect(price(page)).toHaveAttribute("data-price-cents", "7200");
    await expect(form(page).locator("[data-credit-cents]")).toHaveAttribute("data-credit-cents", "3600");
    await contact(page, mobile);
    await card(page).getByRole("button", { name: "Réserver" }).click();
    await expect(card(page).getByRole("status")).toContainText(/Demande enregistrée au prix de 72\s€\./);
    expect(leadRow(mobile)).toMatchObject({ job: "standard", flow: "estimate", quoted_cents: 7_200 });
  });

  test("\"Je ne sais pas\" asks nothing more and stores a quote", async ({ page }) => {
    const mobile = freshMobile("07");
    await page.goto("/fr#devis");
    await hydrated(page);
    await form(page).locator("input[name=estimate_bedrooms][value='?']").check();
    await expect(price(page)).toHaveCount(0);
    await contact(page, mobile);
    await card(page).getByRole("button", { name: "Recevoir mon devis gratuit →" }).click();
    await expect(card(page).getByRole("status")).toBeVisible();
    expect(leadRow(mobile)).toMatchObject({ job: "standard", flow: "quote", quoted_cents: null });
  });
});

// booking_provider b (docs/EXPERIMENTS.md): the place's Google schedule. The
// mock panel serves the place with none, as the panel does today, so the arm
// is inert: kitstart offers the call, exactly as in a.
test.describe("booking_provider b, no Google schedule set", () => {
  test.use({ storageState: abState("a", "b"), extraHTTPHeaders: { "x-forwarded-for": "10.7.0.4" } });

  test("a priced lead is offered the call, not a booking page", async ({ page }) => {
    await page.goto("/fr#devis");
    await hydrated(page);
    await answer(page, "Studio");
    await answer(page, "Moins de 40 m²");
    await answer(page, "Une fois");
    await contact(page, freshMobile("07"));
    await card(page).getByRole("button", { name: "Réserver" }).click();
    const status = card(page).getByRole("status");
    await expect(status).toContainText(/Demande enregistrée au prix de 49\s€\./);
    await expect(status).toContainText("Nous vous rappelons pour fixer le créneau.");
    await expect(card(page).getByRole("link", { name: "Choisir un créneau" })).toHaveCount(0);
    await expect(page.locator('a[href*="calendar.app.google"], a[href*="calendar.google.com"]')).toHaveCount(0);
  });
});
