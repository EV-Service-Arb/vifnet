import { priceOf, pricingProblems, type PricingInputs, type PricingModel } from "@/shared/lib/sites-tools";
import { describe, expect, it } from "vitest";
import { PRICING } from "@/shared/config/pricing";
import { fromPrices, minimumCents } from "@/shared/lib/from-price";

/** Every combination of the need's answers, priced by `priceOf`: the minimum the page may state, found the long way. */
function bruteMinimum(model: PricingModel, need: string): number | null {
  const pricing = model.needs[need];
  if (!pricing) return null;
  if (pricing.kind === "fixed") return pricing.cents;
  let combos: PricingInputs[] = [{}];
  for (const id of pricing.inputs) {
    const options = model.inputs.find(i => i.id === id)?.options ?? [];
    combos = combos.flatMap(c => options.map(o => ({ ...c, [id]: o.id })));
  }
  const prices = combos.map(c => priceOf(model, need, c)?.cents).filter((c): c is number => c !== undefined);
  return prices.length ? Math.min(...prices) : null;
}

/** A small deterministic generator, so a failing model can be reproduced from its seed. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** A valid model over the baked one's shape with random amounts: zones, adds, discounts, rounding and minimum. */
function randomModel(seed: number): PricingModel {
  const r = rng(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const labels = (id: string) => ({ fr: id, en: id });
  const options = <T,>(n: number, make: (i: number) => T) => Array.from({ length: n }, (_, i) => make(i));
  return {
    ...PRICING,
    roundToCents: [1, 50, 100, 500][int(0, 3)] ?? 100,
    minimumCents: int(0, 12_000),
    inputs: [
      { id: "zone", kind: "multiply", labels: labels("zone"), options: options(int(1, 4), i => ({ id: `z${i}`, labels: labels(`z${i}`), multiplyBp: int(8_000, 15_000) })) },
      { id: "rooms", kind: "add", labels: labels("rooms"), options: options(int(1, 6), i => ({ id: `r${i}`, labels: labels(`r${i}`), addCents: int(0, 9_000) })) },
      { id: "extra", kind: "add", labels: labels("extra"), options: options(int(1, 4), i => ({ id: `e${i}`, labels: labels(`e${i}`), addCents: int(0, 5_000) })) },
      { id: "often", kind: "discount", labels: labels("often"), options: options(int(1, 4), i => ({ id: `o${i}`, labels: labels(`o${i}`), discountBp: int(0, 3_000) })) },
    ],
    needs: { standard: { kind: "estimate", baseCents: int(1_000, 9_000), inputs: ["zone", "rooms", "extra", "often"] }, deep: { kind: "fixed", cents: int(5_000, 30_000) } },
  };
}

describe("where a job's price starts", () => {
  it("is the baked list's minimum for the regular clean: 45 €, 15 % off, rounded to 38 €, raised to the 49 € minimum", () => {
    expect(minimumCents(PRICING, "standard")).toBe(4900);
    expect(minimumCents(PRICING, "standard")).toBe(bruteMinimum(PRICING, "standard"));
    // Without the floor, the cheapest answers themselves: studio, under 40 m², every week.
    expect(minimumCents({ ...PRICING, minimumCents: 0 }, "standard")).toBe(3800);
    expect(priceOf({ ...PRICING, minimumCents: 0 }, "standard", { bedrooms: "studio", surface: "under-40", frequency: "weekly" })?.cents).toBe(3800);
  });

  it("equals the minimum of priceOf over every combination, for any valid list", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const model = randomModel(seed);
      expect(pricingProblems(model), `seed ${seed}`).toEqual([]);
      expect(minimumCents(model, "standard"), `seed ${seed}`).toBe(bruteMinimum(model, "standard"));
      expect(minimumCents(model, "deep"), `seed ${seed}`).toBe(bruteMinimum(model, "deep"));
    }
  });

  it("is a number only for a job the card prices; a quote and a missing list state none", () => {
    expect(fromPrices(PRICING)).toEqual({ standard: 4900, deep: null, move: null, "post-construction": null });
    expect(fromPrices(null)).toEqual({ standard: null, deep: null, move: null, "post-construction": null });
    // A list that prices a job the site sells as a quote still states no number for it: the card would not show one.
    const deepFixed: PricingModel = { ...PRICING, needs: { ...PRICING.needs, deep: { kind: "fixed", cents: 17_900 } } };
    expect(fromPrices(deepFixed).deep).toBeNull();
    // A live list without the regular clean makes it a quote: no number either.
    expect(fromPrices({ ...PRICING, needs: {} }).standard).toBeNull();
  });

  it("follows the live list the page loads", () => {
    const live: PricingModel = { ...PRICING, minimumCents: 0, needs: { standard: { kind: "estimate", baseCents: 6000, inputs: ["bedrooms", "surface", "frequency"] } } };
    // 60 € with 15 % off: 51 €.
    expect(fromPrices(live).standard).toBe(5100);
  });
});
