import { flowOf, labelOf, priceOf, pricingProblemsFor } from "@/shared/lib/sites-tools";
import { describe, expect, it } from "vitest";
import { FLOWS, PHOTO_NEEDS, SUBJECTS } from "@/shared/config/lead";
import { PRICING, zoneId, zonesOf } from "@/shared/config/pricing";
import { OWNER_TODO, site } from "@/shared/config/site";

describe("the baked price list", () => {
  it("is the site's, and validates for every locale the site speaks", () => {
    expect(site.pricing).toBe(PRICING);
    expect(pricingProblemsFor(PRICING, site.i18n.locales)).toEqual([]);
  });

  it("names every question and every answer in French and English", () => {
    for (const input of PRICING.inputs) {
      for (const locale of site.i18n.locales) {
        expect(input.labels[locale], `${input.id}.${locale}`).toBeTruthy();
        for (const option of input.options) expect(option.labels[locale], `${input.id}.${option.id}.${locale}`).toBeTruthy();
      }
    }
  });

  it("asks a regular clean the bedrooms, the surface band and the frequency — not a zone with one answer", () => {
    expect(PRICING.needs["standard"]).toMatchObject({ kind: "estimate", inputs: ["bedrooms", "surface", "frequency"] });
    expect(PRICING.inputs.find(i => i.id === "zone")).toMatchObject({ kind: "multiply", options: [{ id: "default", multiplyBp: 10_000 }] });
    expect(PRICING.inputs.find(i => i.id === "bedrooms")?.options.map(o => labelOf(o.labels, "fr"))).toEqual([
      "Studio",
      "1 chambre",
      "2 chambres",
      "3 chambres",
      "4 chambres",
      "5 et plus",
    ]);
    expect(PRICING.inputs.find(i => i.id === "frequency")).toMatchObject({ kind: "discount" });
  });

  // The placeholders the owner replaces from the panel (OWNER_TODO).
  it.each([
    // 45 € base, studio, under 40 m², once: 45 €, raised to the 49 € minimum.
    [{ bedrooms: "studio", surface: "under-40", frequency: "once" }, 4900],
    // 45 + 30 + 10 = 85 €, 10 % off = 76,50 €, to the euro: 77 €.
    [{ bedrooms: "2", surface: "40-70", frequency: "biweekly" }, 7700],
    // 45 + 75 + 45 = 165 €, 15 % off = 140,25 €, to the euro: 140 €.
    [{ bedrooms: "5-plus", surface: "over-100", frequency: "weekly" }, 14_000],
  ])("prices %o at %i cents", (answers, cents) => {
    expect(priceOf(PRICING, "standard", answers)?.cents).toBe(cents);
  });

  it("prices nothing while an answer is missing", () => {
    expect(priceOf(PRICING, "standard", { bedrooms: "2", surface: "40-70" })).toBeNull();
  });

  it("is marked a placeholder until the owner sets the prices", () => {
    expect(OWNER_TODO).toContainEqual(expect.objectContaining({ field: "shared/config/pricing.ts", blocksLaunch: true }));
  });
});

describe("the zones", () => {
  it("are one default zone while the place names no commune", () => {
    expect(zonesOf(null).map(z => z.id)).toEqual(["default"]);
    expect(zonesOf([{ kind: "radius", center: { lat: 48.85, lng: 2.35 }, km: 10 }]).map(z => z.id)).toEqual(["default"]);
  });

  it("are the communes the place names, each a slug the panel takes, all at ×1", () => {
    const zones = zonesOf([{ kind: "localities", names: ["Saint-Étienne", "Boulogne-Billancourt", "Saint-Étienne"] }]);
    expect(zones).toEqual([
      { id: "saint-etienne", labels: { fr: "Saint-Étienne", en: "Saint-Étienne" }, multiplyBp: 10_000 },
      { id: "boulogne-billancourt", labels: { fr: "Boulogne-Billancourt", en: "Boulogne-Billancourt" }, multiplyBp: 10_000 },
    ]);
  });

  it("fall back to one zone when two communes would share a slug", () => {
    expect(zonesOf([{ kind: "localities", names: ["L'Haÿ", "L Hay"] }]).map(z => z.id)).toEqual(["default"]);
  });

  it("make slugs within the model's limits", () => {
    expect(zoneId("Œ")).toMatch(/^[a-z0-9_-]{1,40}$/);
    expect(zoneId("x".repeat(60))).toHaveLength(40);
    expect(zoneId("Ville-" + "a".repeat(34) + "-b")).not.toMatch(/-$/);
  });
});

describe("how each job is sold", () => {
  it("prices a regular clean live and asks a quote for the rest", () => {
    expect(SUBJECTS.map(s => [s, flowOf(FLOWS, PRICING, s)])).toEqual([
      ["standard", "estimate"],
      ["deep", "quote"],
      ["move", "quote"],
      ["post-construction", "quote"],
    ]);
    expect(site.lead.flows).toBe(FLOWS);
  });

  it("asks photos for the three quotes", () => {
    expect(PHOTO_NEEDS).toEqual(["deep", "move", "post-construction"]);
  });

  it("falls back to a quote when no price list prices the clean", () => {
    expect(flowOf(FLOWS, null, "standard")).toBe("quote");
    expect(flowOf(FLOWS, { ...PRICING, needs: {} }, "standard")).toBe("quote");
  });
});
