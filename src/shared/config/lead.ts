import { validateLead, type LeadFlow, type LeadSchema } from "@/shared/lib/sites-tools";

/**
 * The jobs the quote form offers — the four service cards of the Figma frame,
 * and the values the form posts and the lead store keeps.
 */
export const SUBJECTS = ["standard", "deep", "move", "post-construction"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const isSubject = (value: string): value is Subject => (SUBJECTS as readonly string[]).includes(value);

/**
 * Each job in the panel's words: the French name of its service card, which
 * the operator reads in a lead's `need` — never the posted id. The copy's
 * `services.items.*.name` in French, held equal to it by
 * tests/content.test.ts: config cannot read the copy (it sits above).
 */
export const PANEL_NEED: Readonly<Record<Subject, string>> = {
  standard: "Ménage standard",
  deep: "Grand ménage",
  move: "Entrée / sortie",
  "post-construction": "Fin de chantier",
};

/** The frame's featured service: the forest card on the home page, the "Most popular" row of the price table. */
export const FEATURED: Subject = "deep";

/**
 * How each job is sold. A regular clean is priced live from four answers
 * (`pricing.ts`); a deep clean, a move and after-works are not priced from a
 * list — the crew needs to see the place — so they ask for a quote, and for
 * photos (`PHOTO_NEEDS`).
 */
export const FLOWS: Readonly<Record<Subject, LeadFlow>> = {
  standard: "estimate",
  deep: "quote",
  move: "quote",
  "post-construction": "quote",
};

/** The brand's prefix of a lead's chat reference (`VF-7K3F`, MESSENGER-CHANNELS-SPEC §1); aquafix's is `AQ`. */
export const MESSAGE_REF_PREFIX = "VF";

/** The quotes priced from photos: the card offers to send them on WhatsApp, when the place has it. */
export const PHOTO_NEEDS: readonly Subject[] = SUBJECTS.filter(s => FLOWS[s] === "quote");

/**
 * The size of the home: an optional question after the phone — for a quote;
 * an estimate asks it among its own answers, and the card hides this one.
 */
export const BEDROOMS = ["studio", "1", "2", "3", "4", "5+"] as const;
export type Bedrooms = (typeof BEDROOMS)[number];

/**
 * The quote card's forms (Figma "Lead form A/B", experiment `lead_form`):
 * `compact`, everything on one screen; `steps`, one question per screen;
 * `price-first`, the size on one screen, the frequencies priced as cards,
 * then the contact — with "Je ne sais pas" turning the clean into a quote.
 */
export type LeadForm = "compact" | "steps" | "price-first";

/** The extra fields the form posts beyond the core three, each capped at `max` characters. */
export const EXTRAS = { bedrooms: { name: "bedrooms", max: 3 } } as const;

/**
 * What the quote form posts — service, ZIP (the locality) and phone, then
 * optional bedrooms — and what is refused: a number we cannot call
 * (kitstart's `validateLead`, the rule the form itself blocks on, so the
 * server never refuses what the form let through) and a bedrooms value the
 * form never offers. No name: the call back asks it, and every field costs
 * leads; a `name` posted by a page cached from before is not an extra, so it
 * is not kept. The refused field goes back to the card; `why` is for the log
 * only.
 */
export const LEAD: LeadSchema<Subject> = {
  subjects: SUBJECTS,
  wire: { subject: "subject", locality: "locality", mobile: "mobile" },
  extras: [EXTRAS.bedrooms],
  flows: FLOWS,
  // One spelling per number (`+33612345678`), so the panel and a person
  // searching the leads file find a customer however they typed it.
  mobileFormat: "e164",
  validate: lead => {
    const phone = validateLead(lead);
    if (phone) return phone;
    const bedrooms = lead.extras[EXTRAS.bedrooms.name];
    if (bedrooms !== undefined && bedrooms !== "" && !(BEDROOMS as readonly string[]).includes(bedrooms)) {
      return { field: EXTRAS.bedrooms.name, why: "bedrooms out of range" };
    }
    return null;
  },
};
