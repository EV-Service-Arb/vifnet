import { perLocale, type PlaceView } from "@/shared/lib/sites-tools";
import type { Locale } from "./i18n";
import { site } from "./site";

/**
 * The header's links (Figma NavBar 8:143), in its order — the set aquafix's
 * `NAV_IDS` has. Reviews is a band of the home page, the others its pages.
 */
export const NAV_IDS = ["pricing", "guarantee", "reviews", "about"] as const;
export type NavId = (typeof NAV_IDS)[number];

/** The footer's page links (Footer 36:1378): the nav without Reviews. */
export const FOOTER_NAV_IDS = ["pricing", "guarantee", "about"] as const satisfies readonly NavId[];

/** The home page's anchors other pages link to: the reviews band, and the quote card every CTA lands on. */
export const ANCHORS = { reviews: "avis", quote: "devis" } as const;

/** Where each link points, as a suffix a place view turns into a path. */
export const NAV_SUFFIX: Readonly<Record<NavId, string>> = {
  pricing: site.pages.prices,
  guarantee: site.pages.guarantee,
  reviews: `#${ANCHORS.reviews}`,
  about: site.pages.about,
};

export interface NavLink {
  href: string;
  label: string;
}

/** The chrome every page of a place shares: the header's and the footer's links, the form, and this page in the other language. */
export interface PlaceNav {
  header: readonly NavLink[];
  footer: readonly NavLink[];
  /** The quote card, on the home page: every CTA lands there. */
  quoteHref: string;
  other: { locale: Locale; href: string; label: string };
}

/** `suffix` is this page's (`site.pages`), so the language link keeps the reader on it. */
export function placeNav(view: PlaceView<Locale>, labels: Readonly<Record<NavId, string>>, suffix: string): PlaceNav {
  const link = (id: NavId): NavLink => ({ href: view.href(NAV_SUFFIX[id]), label: labels[id] });
  const hrefs = perLocale(site, l => view.href(suffix, l));
  const otherLocale = site.i18n.locales.find(l => l !== view.locale) ?? view.locale;
  return {
    header: NAV_IDS.map(link),
    footer: FOOTER_NAV_IDS.map(link),
    quoteHref: view.href(`#${ANCHORS.quote}`),
    other: { locale: otherLocale, href: hrefs[otherLocale], label: site.i18n.labels[otherLocale] },
  };
}
