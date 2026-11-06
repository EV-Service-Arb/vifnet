import { DatabaseSync } from "node:sqlite";
import { MIN_FILL_MS, normalizePhone } from "../../src/shared/lib/sites-tools/index";
import { expect, test, type Page } from "@playwright/test";
import { abState, LEADS_DB } from "./env";
import { freshMobile } from "./support/mobile";

// A lead the server refuses, or that gets no answer, is never lost and never
// sent twice (LEAD-FORMS-REVIEW-2026-10-03 #1–#5): the card says so in the
// page's words, keeps what was typed, and a retry sends the same lead —
// which, taken, still ends in the card's own Done state.

const SUBMIT = "Recevoir mon devis gratuit →";
const INVALID = "Ce numéro n’est pas valide. Exemple : 06 12 34 56 78 ou +33 6 12 34 56 78.";
const NO_NETWORK = "Pas de réponse du serveur. Vérifiez votre connexion et réessayez : votre demande ne sera pas envoyée deux fois.";
const NO_ANSWER = "Le serveur ne répond pas. Réessayez : votre demande ne sera pas envoyée deux fois.";

const card = (page: Page) => page.locator("#devis");
const form = (page: Page) => page.locator("form#devis-form");
const hydrated = (page: Page) => expect(page.locator("form#devis-form select")).toHaveCount(0);
const isQuote = (url: string) => new URL(url).pathname === "/quote";

/** Every row stored for the number: a lead sent twice would be two. */
function leadRows(mobile: string): unknown[] {
  const db = new DatabaseSync(LEADS_DB, { readOnly: true });
  try {
    return db.prepare("SELECT job, location_id, submission_id FROM leads WHERE mobile = ?").all(normalizePhone(mobile));
  } finally {
    db.close();
  }
}

async function fill(page: Page, mobile: string): Promise<void> {
  await form(page).locator("input[name=locality]").fill("75015");
  await form(page).locator("input[name=mobile]").fill(mobile);
  // The time trap flags anything faster than a person; this is a person.
  await page.waitForTimeout(MIN_FILL_MS + 500);
}

/**
 * A deep clean: a quote, so the card asks only the contact. The default job,
 * a regular clean, is an estimate whose answers the script requires
 * (flows.spec.ts).
 */
async function pickQuote(page: Page): Promise<void> {
  await page.getByRole("combobox", { name: "Prestation" }).click();
  await page.getByRole("listbox").getByRole("option", { name: "Grand ménage" }).click();
}

const done = (page: Page) => expect(card(page).getByRole("status")).toContainText("C’est noté !");

test.describe("a refused lead, at 390", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.8.1.1" } });
  const phoneOnly = (project: string) => test.skip(project !== "mobile", "the phone's layout, where a wrong anchor lost the card");

  // #2: the 303 named `#quote`, an anchor this page lacks, and a phone landed
  // at the top. Without a script the form posts as it is; the route sends the
  // visitor back to the card, which shows why once its script runs.
  test("rejected_submission_lands_on_the_card_with_an_error", async ({ browser, page }, testInfo) => {
    phoneOnly(testInfo.project.name);
    const bare = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: "reduce",
      viewport: testInfo.project.use.viewport ?? null,
      storageState: abState("a"),
      extraHTTPHeaders: { "x-forwarded-for": "10.8.1.2" },
    });
    const noScript = await bare.newPage();
    await noScript.goto(`${testInfo.project.use.baseURL ?? ""}/fr#devis`);
    await fill(noScript, "06 12 34 56 7");
    const answered = noScript.waitForResponse(r => r.request().method() === "POST" && isQuote(r.url()));
    await form(noScript).locator("button[type=submit]").click();
    expect((await answered).status()).toBe(303);
    // `lead_card` names the card for a server that reads the query: the fragment never reaches it.
    await expect(noScript).toHaveURL(/\/fr\?lead_error=phone(&need=[a-z-]+)?&lead_card=devis#devis$/);
    await expect(card(noScript).getByRole("heading", { name: "Votre devis gratuit" })).toBeInViewport();
    const landing = noScript.url();
    await bare.close();

    // The same landing with the script: the error at the field, the card in view.
    await page.goto(landing);
    const phone = form(page).locator("input[name=mobile]");
    await expect(form(page).getByRole("alert")).toHaveText(INVALID);
    await expect(phone).toBeFocused();
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(card(page).getByRole("heading", { name: "Votre devis gratuit" })).toBeInViewport();
    // Shown once: a reload does not bring it back.
    await expect(page).not.toHaveURL(/lead_error/);
  });

  test("refused by the server with a script, shows why at the field and keeps what was typed", async ({ page }, testInfo) => {
    phoneOnly(testInfo.project.name);
    await page.goto("/fr#devis");
    await hydrated(page);
    await pickQuote(page);
    // Past the form's own check, as a page cached before a rule change would be.
    await form(page).evaluate(el => el instanceof HTMLFormElement && (el.noValidate = true));
    await fill(page, "0000000000");
    const answered = page.waitForResponse(r => isQuote(r.url()));
    await card(page).getByRole("button", { name: SUBMIT }).click();
    expect((await answered).status()).toBe(422);
    const phone = form(page).locator("input[name=mobile]");
    await expect(form(page).getByRole("alert")).toHaveText(INVALID);
    await expect(phone).toBeFocused();
    await expect(phone).toHaveValue("0000000000");
    await expect(form(page).locator("input[name=locality]")).toHaveValue("75015");
    await expect(page).toHaveURL(/\/fr#devis$/);
  });

  // Vifnet's own rule: a bedrooms value the list never offers.
  test("a refused bedrooms value is said above the submit", async ({ page }, testInfo) => {
    phoneOnly(testInfo.project.name);
    await page.goto("/fr#devis");
    await hydrated(page);
    await pickQuote(page);
    await page.route(
      url => isQuote(url.href),
      route => {
        const body = new URLSearchParams(route.request().postData() ?? "");
        body.set("bedrooms", "9");
        return route.continue({ postData: body.toString() });
      },
    );
    await fill(page, freshMobile("06"));
    const answered = page.waitForResponse(r => isQuote(r.url()));
    await card(page).getByRole("button", { name: SUBMIT }).click();
    expect((await answered).status()).toBe(422);
    await expect(form(page).getByRole("alert")).toHaveText("Vérifiez ce champ.");
    await expect(form(page).locator("input[name=locality]")).toHaveValue("75015");
  });
});

test.describe("no answer", () => {
  test("offline, the card says so, keeps what was typed and the retry ends in the card", async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": "10.8.2.1" });
    const mobile = freshMobile("06");
    await page.goto("/fr#devis");
    await hydrated(page);
    await pickQuote(page);
    await fill(page, mobile);
    await context.setOffline(true);
    await card(page).getByRole("button", { name: SUBMIT }).click();
    const alert = form(page).getByRole("alert");
    await expect(alert).toContainText(NO_NETWORK);
    await expect(page).toHaveURL(/\/fr#devis$/);
    await expect(form(page).locator("input[name=mobile]")).toHaveValue(mobile);
    expect(leadRows(mobile)).toHaveLength(0);

    await context.setOffline(false);
    await alert.getByRole("button", { name: "Réessayer" }).click();
    await done(page);
    expect(leadRows(mobile)).toHaveLength(1);
  });

  // #3: the server took the lead, the answer was lost. The retry carries the
  // same submission id, and the server answers it with the first one's row.
  test("an answer lost after the lead was stored: the retry is the same lead, stored once", async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": "10.8.2.2" });
    const mobile = freshMobile("07");
    const ids: (string | null)[] = [];
    await page.route(
      url => isQuote(url.href),
      async route => {
        ids.push(new URLSearchParams(route.request().postData() ?? "").get("submission_id"));
        if (ids.length > 1) return route.continue();
        await route.fetch();
        return route.abort("connectionreset");
      },
    );
    await page.goto("/fr#devis");
    await hydrated(page);
    await pickQuote(page);
    await fill(page, mobile);
    await card(page).getByRole("button", { name: SUBMIT }).click();
    const alert = form(page).getByRole("alert");
    await expect(alert).toContainText(NO_NETWORK);
    expect(leadRows(mobile)).toHaveLength(1);

    await alert.getByRole("button", { name: "Réessayer" }).click();
    await done(page);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).toBe(ids[0]);
    expect(leadRows(mobile)).toEqual([{ job: "deep", location_id: "vifnet", submission_id: ids[0] }]);
  });

  // #5: a server that never answers. The page's clock is the kit's timer.
  test("the server hangs: the button says it is sending, then the card says no answer, and the retry ends in the card", async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": "10.8.2.3" });
    const mobile = freshMobile("06");
    let posts = 0;
    await page.route(
      url => isQuote(url.href),
      async route => {
        posts++;
        if (posts > 1) return route.continue();
        // Stored, and never answered.
        await route.fetch();
      },
    );
    await page.clock.install();
    await page.goto("/fr#devis");
    await hydrated(page);
    await pickQuote(page);
    await fill(page, mobile);
    await card(page).getByRole("button", { name: SUBMIT }).click();
    const sending = form(page).locator("button[type=submit]");
    await expect(sending).toHaveAttribute("aria-busy", "true");
    await expect(sending).toHaveText("Envoi…");
    await expect(sending).toBeDisabled();

    await page.clock.fastForward(15_000);
    const alert = form(page).getByRole("alert");
    await expect(alert).toContainText(NO_ANSWER);
    await expect(form(page).locator("input[name=mobile]")).toHaveValue(mobile);
    await alert.getByRole("button", { name: "Réessayer" }).click();
    await done(page);
    expect(posts).toBe(2);
    expect(leadRows(mobile)).toHaveLength(1);
    // The first post's forward is still waiting on a page that gave up on it.
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });
});
