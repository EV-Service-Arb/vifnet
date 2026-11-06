import { assertLaunchable, cardFact, defineSite, SERVICE_AREA_GATE, type OwnerTodo } from "@/shared/lib/sites-tools";
import { COPY_TODO } from "./copy-todo";
import { i18n } from "./i18n";
import { LEAD } from "./lead";
import { PLACES } from "./places";
import { PRICING } from "./pricing";

/**
 * Vifnet as the machinery sees it — routing, the lead funnel, schema.org,
 * analytics and mail read their facts from this one object. The contact facts
 * come from `assets/card.toml` (inlined at build): today the card has none,
 * so the site has no phone, no mailbox and no domain — noindex everywhere,
 * robots disallow, an empty sitemap, and the quote form as the only channel.
 */
export const site = defineSite({
  brand: {
    id: "vifnet",
    name: "Vifnet",
    // The brand name stands in until the owner gives the raison sociale.
    legalName: "Vifnet",
    email: cardFact("SITE_CARD_EMAIL", process.env.SITE_CARD_EMAIL),
    phone: cardFact("SITE_CARD_PHONE", process.env.SITE_CARD_PHONE),
    domain: cardFact("SITE_CARD_SITE", process.env.SITE_CARD_SITE),
    // No schema.org subtype names cleaning; the job types go on the offers.
    businessType: "LocalBusiness",
  },
  i18n,
  ogLocale: { fr: "fr_FR", en: "en_GB" },
  // One place, served at the apex: the crew goes to the customer.
  topology: { kind: "single", place: "vifnet" },
  // The Figma file's sub-pages (Guarantee 40:1428, Prices 41:1627, About
  // 42:1910): the proxy, the route tree, the sitemap and the nav read this list.
  pages: { home: "", prices: "/prices", guarantee: "/guarantee", about: "/about" },
  places: PLACES,
  publication: SERVICE_AREA_GATE,
  lead: LEAD,
  // The baked price list; the panel's, when it serves one, overrides it whole (env.ts).
  pricing: PRICING,
  // What app/ serves as a file besides the routes every landing has.
  publicFiles: ["/icon.svg"],
});

export type PageKey = (typeof site.pageKeys)[number];
export type Subpage = Exclude<PageKey, "home">;

/**
 * Facts the owner has not given, listed once rather than found on the page.
 * The page is the Figma frame verbatim, sample content included ("design
 * sample content", which blocks a launch); the `copy:` lines (`COPY_TODO`)
 * are the terms of an earlier design the frame does not state, kept off the
 * page until the owner confirms them.
 */
export const OWNER_TODO: readonly OwnerTodo[] = [
  { field: "assets/card.toml site", why: "no domain yet — the site is noindex and robots Disallow until there is", blocksLaunch: true },
  { field: "assets/card.toml phone", why: "no public number: no tel: channel, the WhatsApp slot stays hidden", blocksLaunch: false },
  { field: "assets/card.toml email", why: "no public mailbox; lead mail needs LEAD_NOTIFY_TO", blocksLaunch: false },
  { field: "site.brand.legalName", why: "raison sociale as registered; the brand name stands in", blocksLaunch: true },
  { field: "SIRET", why: "mentions légales (LCEN) need the operating entity's SIRET, in the footer's legal line", blocksLaunch: true },
  { field: "places[vifnet].serviceArea", why: "which communes the crew covers: the structured data names none until then", blocksLaunch: true },
  { field: "places[vifnet].hours", why: "working hours — the publication gate needs them", blocksLaunch: true },
  {
    field: "shared/config/pricing.ts",
    why: "the regular clean's prices are placeholders (base, bedrooms, surface, frequency discounts, minimum): the owner sets the real ones in the panel, which overrides the baked model",
    blocksLaunch: true,
  },
  { field: "places[vifnet].gbpName", why: "the Google Business Profile's exact name, for the live rating", blocksLaunch: false },
  {
    field: "design sample content",
    why:
      "the page shows the Figma file's sample content as it stands: the 4.9 / 340 Google rating and the stats (500+, 100 %, < 2 hr), six named reviews marked \"Verified\" with Google's logo, Boise, Idaho, \"photos from actual client homes\" over stock photos, and review job photos that show other companies' branded staff (Greentree Cleaning Services, MYT Cleaning & Maintenance); on the sub-pages, the four named team members and the Boise-area towns. Replace every one with Vifnet's own before a launch",
    blocksLaunch: true,
  },
  ...COPY_TODO,
];

assertLaunchable(site, OWNER_TODO);
