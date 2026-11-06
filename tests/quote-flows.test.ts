import { createPlaceView } from "@/shared/lib/sites-tools";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copyFor } from "@/entities/content";
import type { Subject } from "@/shared/config/lead";
import { PRICING } from "@/shared/config/pricing";
import { site } from "@/shared/config/site";
import { QuoteCard } from "@/widgets/quote-card";

const first = site.places[0];
if (!first) throw new Error("the site has no place");
const place = first;
const WHATSAPP = "+33 6 12 34 56 78";

/** The card as the server renders it, for a job the page knows. */
function card(need: Subject | undefined, opts: { whatsapp?: string | null; pricing?: typeof PRICING | null } = {}): string {
  const view = createPlaceView(site, place, "fr", "host");
  const copy = copyFor("fr", { place: place.name.fr, phone: null });
  return renderToStaticMarkup(
    createElement(QuoteCard, {
      copy,
      id: "devis",
      place: view.place,
      contact: { phone: null, whatsapp: opts.whatsapp ?? null },
      renderedAt: Date.UTC(2026, 9, 3),
      pricing: opts.pricing === undefined ? PRICING : opts.pricing,
      need,
      form: "compact",
      experiment: undefined,
      bookingVariant: null,
    }),
  );
}

describe("a regular clean, priced live", () => {
  it("asks its answers as tiles, shows where the price will be, and books", () => {
    // The single layout shows the first job until another is picked.
    for (const html of [card("standard"), card(undefined)]) {
      for (const input of ["bedrooms", "surface", "frequency"]) expect(html).toContain(`name="estimate_${input}"`);
      expect(html).not.toContain('name="estimate_zone"');
      expect(html).toContain("Répondez aux questions pour voir le prix.");
      expect(html).toContain("Réserver");
      expect(html).not.toMatch(/à partir de|dès /i);
    }
  });

  it("is a quote when no price list prices it", () => {
    const html = card("standard", { pricing: null });
    expect(html).not.toContain('name="estimate_');
    expect(html).not.toContain("Réserver");
  });
});

describe("a deep clean, a move and after-works", () => {
  for (const need of ["deep", "move", "post-construction"] as const) {
    it(`${need}: a quote, with photos on WhatsApp and the callback`, () => {
      const html = card(need, { whatsapp: WHATSAPP });
      expect(html).not.toContain('name="estimate_');
      expect(html).not.toContain("Réserver");
      expect(html).toContain("Envoyez des photos");
      expect(html).toMatch(/href="https:\/\/wa\.me\/33612345678\?text=[^"]*photos/);
      expect(html).toContain('id="devis-callback"');
    });

    it(`${need}: no photos ask without WhatsApp, the callback still`, () => {
      const html = card(need);
      expect(html).not.toContain("Envoyez des photos");
      expect(html).not.toContain("wa.me");
      expect(html).toContain('id="devis-callback"');
    });
  }
});
