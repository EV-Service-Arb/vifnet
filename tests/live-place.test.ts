import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { site } from "@/shared/config/site";
import { CONTROL } from "@/shared/lib/experiments";
import { PlaceHome } from "@/views/home";
import { loadPlace } from "@/views/place/server";
import { PlaceSubpage } from "@/views/subpage";
import { SURFACES, surfaces } from "./support/surfaces";

// sites_panel's place source (`nix run .#local-stack` in the conductor repo, or
// SITES_PANEL_INTERNAL_URL in a deploy): what it says about vifnet/vifnet is merged
// over the baked place, and every number on the page follows it.
const INTERNAL = "http://panel.test/api/internal";
const LIVE = "+33612345678";

beforeAll(() => {
  // Read once, lazily, by the first page load (`serverEnv`).
  process.env["SITES_PANEL_INTERNAL_URL"] = INTERNAL;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function answer(body: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const DIAL = 'href="tel:+33612345678"';

const params = Promise.resolve({ locale: "fr", location: "vifnet" });
const target = { key: null, host: "https://us.i.posthog.com", brandId: "vifnet" };

async function homeHtml() {
  const { view, copy, renderedAt } = await loadPlace(params);
  return renderToStaticMarkup(createElement(PlaceHome, { view, copy, renderedAt, pricing: site.pricing ?? null, experiments: { bucket: CONTROL, target } }));
}

describe("a phone from the panel", () => {
  it("is asked for at the source, for vifnet", async () => {
    const fetch = answer({ phone: LIVE, whatsapp: LIVE });
    const { view, copy } = await loadPlace(params);
    expect(fetch).toHaveBeenCalledWith(`${INTERNAL}/brands/vifnet/locations/vifnet?locale=fr`, expect.anything());
    expect(view.place.channels).toEqual({ phone: LIVE, whatsapp: LIVE });
    expect(copy.f.phone).toBe(LIVE);
  });

  it("is on all six surfaces, and is the only number dialled", async () => {
    answer({ phone: LIVE });
    const html = await homeHtml();
    const shown = surfaces(html);
    for (const name of SURFACES) expect(shown[name], name).toContain(DIAL);
    // The sticky bar says "Call"; the five others print the number.
    for (const name of SURFACES.filter(s => s !== "sticky")) expect(shown[name], name).toContain(LIVE);
    expect(html).not.toMatch(/href="tel:(?!\+33612345678")/);
  });

  it("brings WhatsApp to the card when the panel gives it", async () => {
    answer({ phone: LIVE, whatsapp: LIVE });
    expect(await homeHtml()).toContain('href="https://wa.me/33612345678');
  });

  it("is on the sub-pages too", async () => {
    answer({ phone: LIVE });
    const { view, copy, renderedAt } = await loadPlace(params);
    // Prices is the sub-page with the FAQ, so all six surfaces.
    const shown = surfaces(renderToStaticMarkup(createElement(PlaceSubpage, { view, copy, page: "prices", renderedAt })));
    for (const name of SURFACES) expect(shown[name], name).toContain(DIAL);
  });
});

describe("no phone from the panel", () => {
  it("shows no number, and offers no call or WhatsApp anywhere", async () => {
    answer({});
    const html = await homeHtml();
    expect(html).not.toMatch(/href="tel:|wa\.me|whatsapp/i);
  });

  it("shows none when the source is down either", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await homeHtml()).not.toMatch(/href="tel:|wa\.me/);
  });
});
