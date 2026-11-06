import type { PricingModel } from "@/shared/lib/sites-tools";
import type { LeadCaptureProps } from "@/shared/lib/sites-tools/react";
import type { Text } from "@/entities/content";
import type { LeadForm } from "@/shared/config/lead";
import { COMPACT_LOOK, PRICE_FIRST_LOOK, STEPS_LOOK, type Look } from "./look";

/** What sets one form of the card apart from the others: the kit's switches and the look. */
export interface FormShape {
  layout: NonNullable<LeadCaptureProps["layout"]>;
  needDisplay?: LeadCaptureProps["needDisplay"];
  localityStep?: LeadCaptureProps["localityStep"];
  questions: NonNullable<LeadCaptureProps["questions"]>;
  look: Look;
  /** The need asked for the visitor when the page knows none: `price-first` prices the regular clean. */
  need?: "standard";
  /**
   * The heading shows on the first screen only (`steps`): hidden once that
   * screen is off. Whole class names, for Tailwind to see.
   */
  head: string;
}

/**
 * The frequency the badge goes on: the one the price list discounts most —
 * the cheapest regular clean, whatever the panel's list says. None when no
 * frequency is discounted.
 */
export function bestFrequency(pricing: PricingModel | null): string | undefined {
  const input = pricing?.inputs.find(i => i.id === "frequency");
  if (input?.kind !== "discount") return undefined;
  const best = input.options.reduce<(typeof input.options)[number] | undefined>((a, o) => (a === undefined || o.discountBp > a.discountBp ? o : a), undefined);
  return best !== undefined && best.discountBp > 0 ? best.id : undefined;
}

const badgeOf = (option: string | undefined, text: string): Record<string, string> => (option === undefined ? {} : { [option]: text });

/**
 * The card's three forms (Figma "Lead form A/B", experiment `lead_form`):
 * `compact` one screen, its answers in short words on a phone; `steps` one
 * question per screen, the frequencies priced, the postcode with the phone;
 * `price-first` the size on one screen ("Je ne sais pas" makes it a quote),
 * then the frequencies as priced cards, then the contact.
 */
export function formShape(form: LeadForm, t: Text, pricing: PricingModel | null): FormShape {
  const short = t.quote.shortLabels;
  switch (form) {
    case "compact":
      return {
        layout: "single",
        questions: { bedrooms: { shortLabels: short.bedrooms }, surface: { shortLabels: short.surface }, frequency: { shortLabels: short.frequency } },
        look: COMPACT_LOOK,
        head: "",
      };
    case "steps":
      return {
        layout: "steps",
        needDisplay: "tiles",
        localityStep: "with-phone",
        questions: { frequency: { display: "cards" } },
        look: STEPS_LOOK,
        head: "order-1 group-has-[[data-lead-step=need][data-lead-off]]/card:hidden",
      };
    case "price-first":
      return {
        layout: "steps",
        localityStep: "with-phone",
        questions: {
          bedrooms: { step: 1, next: t.quote.seePrices, unknown: true, unknownSpan: 2, shortLabels: short.bedrooms },
          surface: { step: 1, unknown: true, unknownSpan: 2, shortLabels: short.surface },
          frequency: { display: "cards", badges: badgeOf(bestFrequency(pricing), t.quote.best) },
        },
        look: PRICE_FIRST_LOOK,
        need: "standard",
        head: "order-1 group-has-[[data-lead-step$=bedrooms][data-lead-off]]/card:hidden",
      };
  }
}
