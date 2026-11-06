import { flowOf, priceOf, type PricingInput, type PricingInputs, type PricingModel } from "@/shared/lib/sites-tools";
import { FLOWS, SUBJECTS, type Subject } from "@/shared/config/lead";

/**
 * The options of an input that can give the lowest price. `priceOf` is
 * monotone in every answer — an add or a multiply only raises the subtotal, a
 * discount only lowers it, and half-up rounding keeps the order — so the
 * minimum over every combination is reached with each input at its cheapest
 * option. Ties are all kept; then pricing what is left is the same minimum
 * as pricing every combination, without the up to 32^12 of a live model.
 */
function cheapest(input: PricingInput): readonly string[] {
  const weigh = (o: (typeof input.options)[number]): number =>
    "addCents" in o ? o.addCents : "multiplyBp" in o ? o.multiplyBp : -o.discountBp;
  const weights = input.options.map(weigh);
  const least = Math.min(...weights);
  return input.options.filter((_, i) => weights[i] === least).map(o => o.id);
}

/**
 * The lowest price `priceOf` gives the need over every combination of its
 * answers, in cents; `null` when the model does not price it.
 */
export function minimumCents(model: PricingModel, need: string): number | null {
  const pricing = model.needs[need];
  if (!pricing) return null;
  if (pricing.kind === "fixed") return priceOf(model, need, {})?.cents ?? null;
  let combos: PricingInputs[] = [{}];
  for (const id of pricing.inputs) {
    const input = model.inputs.find(i => i.id === id);
    if (!input || input.options.length === 0) return null;
    const ids = cheapest(input);
    combos = combos.flatMap(c => ids.map(o => ({ ...c, [id]: o })));
  }
  let least: number | null = null;
  for (const answers of combos) {
    const cents = priceOf(model, need, answers)?.cents;
    if (cents !== undefined && (least === null || cents < least)) least = cents;
  }
  return least;
}

/** Each job's starting price, in cents; `null` for a job the page sells as a quote. */
export type FromPrices = Readonly<Record<Subject, number | null>>;

/**
 * Where each job's price starts, from the price list the page was rendered
 * with: a number only for a job the card prices (`flowOf`: an estimate or a
 * fixed price the model holds), so the page never states a price the form
 * would not show. A quote, or no model, is `null`: no number.
 */
export function fromPrices(model: PricingModel | null): FromPrices {
  const entries = SUBJECTS.map(s => [s, model && flowOf(FLOWS, model, s) !== "quote" ? minimumCents(model, s) : null] as const);
  return Object.fromEntries(entries) as Record<Subject, number | null>;
}
