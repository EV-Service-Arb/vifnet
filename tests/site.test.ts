import { createPlaceView, placeGraph } from "@/shared/lib/sites-tools";
import { testLead } from "@/shared/lib/sites-tools/testing";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copyFor, TEXT } from "@/entities/content";
import type { Locale } from "@/shared/config/i18n";
import { LEAD, SUBJECTS } from "@/shared/config/lead";
import { site } from "@/shared/config/site";
import { CONTROL } from "@/shared/lib/experiments";
import { PlaceHome, SECTION_IDS } from "@/views/home";
import { surfaces } from "./support/surfaces";

const place = site.places[0];
if (!place) throw new Error("the site has no place");

const home = (locale: Locale) => {
  const view = createPlaceView(site, place, locale, "host");
  const copy = copyFor(locale, { place: place.name[locale], phone: null });
  return renderToStaticMarkup(
    createElement(PlaceHome, {
      view,
      copy,
      renderedAt: Date.UTC(2026, 8, 24),
      pricing: site.pricing ?? null,
      experiments: { bucket: CONTROL, target: { key: null, host: "https://us.i.posthog.com", brandId: site.brand.id } },
    }),
  );
};

/** Every JSON-LD block of the page, parsed. */
const jsonLd = (html: string): unknown[] =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => JSON.parse(m[1] ?? "null") as unknown);

describe("Vifnet before launch", () => {
  it("has no domain, no phone and no mailbox", () => {
    expect(site.brand).toMatchObject({ domain: null, phone: null, email: null });
  });

  it("is one service-area place, with no address, coordinate or map", () => {
    expect(site.topology).toEqual({ kind: "single", place: "vifnet" });
    expect(place.presence).toEqual({ kind: "service-area" });
    const graph = JSON.stringify(placeGraph(site, createPlaceView(site, place, "fr", "host"), "home", { placeName: "Vifnet", title: "t", description: "d" }, new Date()));
    expect(graph).not.toMatch(/PostalAddress|streetAddress|postalCode|GeoCoordinates|hasMap|latitude/);
  });

  it("offers the frame's four services", () => {
    expect(SUBJECTS).toEqual(["standard", "deep", "move", "post-construction"]);
  });
});

describe("the home page", () => {
  it.each(["fr", "en"] as const)("posts the quote form and its callback, on the hero's card, with every field (%s)", locale => {
    const html = home(locale);
    expect(html).toMatch(/<form id="devis-form"[^>]*action="\/quote"[^>]*method="post"/);
    for (const name of [LEAD.wire.subject, LEAD.wire.locality, LEAD.wire.mobile, "bedrooms"]) expect(html).toContain(`name="${name}"`);
    // No name field: the call back asks it, and every field costs leads.
    expect(html).not.toContain('name="name"');
    // No number to call yet: the form and "call me back" are the two ways in.
    expect(html.match(/<form id="[^"]+"/g)).toEqual(['<form id="devis-form"', '<form id="devis-callback-form"']);
    // The anchor is the card itself, head included, not a wrapper around it.
    expect(html).toMatch(new RegExp(`<div id="${SECTION_IDS.quote}" class="[^"]*rounded-2xl[^"]*"[^>]*>[^]*<form id="devis-form"`));
    expect(html).toContain(`href="/${locale}#${SECTION_IDS.quote}"`);
  });

  it.each(["fr", "en"] as const)("renders the frame's bands, in its order, and no other (%s)", locale => {
    const html = home(locale);
    const bands = ["stats", "services", "reviews", "guarantee", "faq", "cta", "sticky"];
    // The quote card is kitstart's root, so its mark is its id.
    const at = [html.indexOf(`id="${SECTION_IDS.quote}"`), ...bands.map(b => html.indexOf(`data-band="${b}"`))];
    expect(at.every(i => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    for (const gone of ["avant-apres", "etapes", "zone", "tarifs"]) expect(html).not.toContain(`id="${gone}"`);
  });

  it.each(["fr", "en"] as const)("shows no number while the place has none, and offers no call or WhatsApp (%s)", locale => {
    const html = home(locale);
    expect(html).not.toMatch(/href="tel:|wa\.me|whatsapp/i);
    const shown = surfaces(html);
    // The FAQ's "still have a question?" line points at the number, so it goes with it.
    expect(shown.faq).not.toContain(TEXT[locale].faqMore.trim());
    // The sticky bar keeps Book Now alone.
    expect(shown.sticky).not.toContain(`>${TEXT[locale].sticky.call}<`);
    expect(shown.sticky).toContain(TEXT[locale].sticky.book);
  });

  it.each(["fr", "en"] as const)("keeps the frame's sample facts out of the structured data (%s)", locale => {
    const ld = JSON.stringify(jsonLd(home(locale)));
    expect(ld).not.toBe("[]");
    expect(ld).not.toMatch(/aggregateRating|"review"|telephone|Boise/);
  });

  it("links to the other language from the footer", () => {
    expect(home("fr")).toMatch(/<a href="\/en\?lang=en"[^>]*>English<\/a>/);
    expect(home("en")).toMatch(/<a href="\/fr\?lang=fr"[^>]*>Français<\/a>/);
  });

  it("serves the photos as AVIF and WebP", () => {
    const html = home("fr");
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('type="image/webp"');
  });
});

describe("the lead", () => {
  const lead = (extras: Record<string, string>) => ({ ...testLead(), subject: "standard", extras });

  it("takes bedrooms from the list or none, and keeps no name", () => {
    expect(LEAD.validate?.(lead({ bedrooms: "3" }))).toBeNull();
    expect(LEAD.validate?.(lead({}))).toBeNull();
    expect(LEAD.extras?.map(e => e.name)).toEqual(["bedrooms"]);
  });

  it("refuses bedrooms off the list, and a number we cannot call, naming the field", () => {
    expect(LEAD.validate?.(lead({ bedrooms: "12" }))).toMatchObject({ field: "bedrooms" });
    expect(LEAD.validate?.({ ...lead({}), mobile: "0612" })).toMatchObject({ field: "phone" });
    // The phone is judged first: one refusal at a time, the one the form shows.
    expect(LEAD.validate?.({ ...lead({ bedrooms: "9" }), mobile: "06 12 34 56 7" })).toMatchObject({ field: "phone" });
  });
});
