import type { PricingModel } from "@/shared/lib/sites-tools";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { pricing } from "@/shared/config/env";
import { PRICING } from "@/shared/config/pricing";

// sites_panel's internal API, as SITES_PANEL_INTERNAL_URL is set in a deploy: the
// price list is `<it>/brands/vifnet/pricing`.
const INTERNAL = "http://panel.test/api/internal";

beforeAll(() => {
  // Read once, lazily, by the first `serverEnv()`.
  process.env["SITES_PANEL_INTERNAL_URL"] = INTERNAL;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const silent = () => vi.spyOn(console, "error").mockImplementation(() => {});

function answer(status: number, body: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

/** The owner's prices from the panel: the baked shape, other numbers. */
const LIVE: PricingModel = { ...PRICING, validFrom: "2026-11-01", needs: { standard: { kind: "estimate", baseCents: 6000, inputs: ["bedrooms", "surface", "frequency"] } } };

describe("the price list from the panel", () => {
  it("is asked of the place source's base, and overrides the baked model", async () => {
    const fetch = answer(200, LIVE);
    expect(await pricing.model()).toEqual(LIVE);
    expect(fetch).toHaveBeenCalledWith(`${INTERNAL}/brands/vifnet/pricing`, expect.anything());
  });

  it("is the baked model when the panel sets none", async () => {
    answer(200, {});
    expect(await pricing.model()).toBe(PRICING);
  });

  it("is the baked model when the panel is down or answers a broken model", async () => {
    const log = silent();
    answer(503, { error: "down" });
    expect(await pricing.model()).toBe(PRICING);
    answer(200, { ...LIVE, currency: "USD" });
    expect(await pricing.model()).toBe(PRICING);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    expect(await pricing.model()).toBe(PRICING);
    expect(log).toHaveBeenCalledTimes(3);
    log.mockRestore();
  });
});
