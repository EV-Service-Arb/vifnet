import { DatabaseSync } from "node:sqlite";
import { MIN_FILL_MS, normalizePhone } from "../../src/shared/lib/sites-tools/index";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { abState, LEADS_DB } from "./env";
import { freshMobile } from "./support/mobile";

// The quote card is kitstart's LeadCapture in the frame's card (experiment
// `lead_form`'s control, `single`, which the suite is pinned to). The selects
// are kitstart's FormSelect: the platform's select until the page hydrates (the
// no-JS post is in funnel.spec.ts), the kit's list after — never the OS menu,
// which ignores the palette — in the same box, so nothing moves when one
// becomes the other.
const SERVICE = "Prestation";

// The card is kitstart's root (`#devis`); its form is `#devis-form`.
const card = (page: Page) => page.locator("#devis");
const hydrated = (page: Page) => expect(page.locator("form#devis-form select")).toHaveCount(0);

function leadRow(mobile: string): unknown {
  const db = new DatabaseSync(LEADS_DB, { readOnly: true });
  try {
    return db.prepare("SELECT job, zip, location_id, spam_verdict, extras, channel FROM leads WHERE mobile = ?").get(normalizePhone(mobile));
  } finally {
    db.close();
  }
}

// The rate limit counts 5 leads per address: each posting test has its own.
test.describe("with JavaScript", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.8.0.1" } });

  test("asks only the postcode and the phone, by placeholder; no name, the bedrooms optional", async ({ page }) => {
    await page.goto("/fr#devis");
    await hydrated(page);
    // A quote: the default job, a regular clean, is priced from answers first (flows.spec.ts).
    await page.getByRole("combobox", { name: SERVICE }).click();
    await page.getByRole("listbox").getByRole("option", { name: "Grand ménage" }).click();
    await card(page).getByRole("button", { name: "Recevoir mon devis gratuit →" }).click();
    const form = page.locator("form#devis-form");
    await expect(form.locator("input[name=locality]")).toBeFocused();
    await expect(form.locator("input[name=mobile]")).toHaveAttribute("required", "");
    await expect(form.locator("input[name=name]")).toHaveCount(0);
    // The frame draws placeholders; the labels still name the fields, unseen.
    await expect(page.getByRole("textbox", { name: "Code postal" })).toHaveAttribute("placeholder", "Code postal");
    await expect(page.getByRole("textbox", { name: "Téléphone" })).toHaveAttribute("placeholder", "Numéro de téléphone");
    await expect(form.locator("label", { hasText: "Téléphone" })).toHaveClass(/sr-only/);
    await expect(page.getByRole("combobox", { name: "Chambres (facultatif)" })).toHaveText("Nombre de chambres");
    await expect(page).toHaveURL(/\/fr#devis$/);
  });

  test("posts every field and says done in the card", async ({ page }, testInfo) => {
    const mobile = freshMobile("06");
    const locality = `75015-${testInfo.project.name}`;
    await page.goto("/fr#devis");
    await hydrated(page);

    const trigger = page.getByRole("combobox", { name: SERVICE });
    await expect(trigger).toHaveText("Ménage standard");
    await trigger.click();
    const list = page.getByRole("listbox");
    await list.getByRole("option", { name: "Fin de chantier" }).click();
    await expect(list).toBeHidden();
    await expect(trigger).toHaveText("Fin de chantier");

    const form = page.locator("form#devis-form");
    await form.locator("input[name=locality]").fill(locality);
    await form.locator("input[name=mobile]").fill(mobile);
    await page.getByRole("combobox", { name: "Chambres (facultatif)" }).click();
    await page.getByRole("listbox").getByRole("option", { name: "2 chambres" }).click();

    // The time trap flags anything faster than a person; this is a person.
    await page.waitForTimeout(MIN_FILL_MS + 500);
    await card(page).getByRole("button", { name: "Recevoir mon devis gratuit →" }).click();
    await expect(card(page).getByRole("status")).toContainText("C’est noté\u00a0!");
    await expect(card(page).getByRole("status")).toContainText(mobile);
    await expect(page).toHaveURL(/\/fr#devis$/);
    expect(leadRow(mobile)).toEqual({
      job: "post-construction",
      zip: locality,
      location_id: "vifnet",
      spam_verdict: null,
      extras: JSON.stringify({ bedrooms: "2" }),
      channel: "form",
    });
  });
});

test.describe("call me back", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.8.0.2" } });

  test("takes a number and a consent, and stores a callback lead", async ({ page }) => {
    const mobile = freshMobile("07");
    await page.goto("/fr#devis");
    await hydrated(page);
    const callback = page.locator("#devis-callback");
    await expect(callback).not.toHaveAttribute("open", "");
    await callback.getByText("Rappel", { exact: true }).click();
    const form = page.locator("form#devis-callback-form");
    await form.locator("input[name=mobile]").fill(mobile);
    await form.getByRole("checkbox").check();
    await page.waitForTimeout(MIN_FILL_MS + 500);
    await form.getByRole("button", { name: "Être rappelé" }).click();
    await expect(card(page).getByRole("status")).toContainText("C’est noté\u00a0!");
    expect(leadRow(mobile)).toMatchObject({ location_id: "vifnet", spam_verdict: null, channel: "callback" });
  });
});

test("the select is the same box before and after hydration", async ({ browser }, testInfo) => {
  const open = async (javaScriptEnabled: boolean) => {
    // A context of its own does not inherit `use`: pin it to the control too.
    const context = await browser.newContext({ javaScriptEnabled, viewport: testInfo.project.use.viewport ?? null, storageState: abState("a") });
    const page = await context.newPage();
    await page.goto(`${testInfo.project.use.baseURL ?? ""}/fr#devis`);
    return page;
  };
  const measure = (control: Locator) =>
    control.evaluate(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return { width: r.width, height: r.height, x: r.x, border: style.borderTopWidth, radius: style.borderTopLeftRadius };
    });

  // The server's select is a combobox of the same name, so until the page
  // hydrates the role finds it — and hydration detaches it, leaving a
  // measurement of zeros. Measure only once the kit's button has replaced it.
  const scripted = await open(true);
  await hydrated(scripted);
  const kit = scripted.getByRole("combobox", { name: SERVICE });
  await expect(kit).toHaveJSProperty("tagName", "BUTTON");
  await expect(kit).toBeVisible();
  const after = await measure(kit);
  await scripted.context().close();

  const bare = await open(false);
  const native = bare.locator("form#devis-form select[name=subject]");
  await expect(native).toBeVisible();
  const before = await measure(native);
  await bare.context().close();

  expect(after).toEqual(before);
});
