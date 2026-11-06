import { expect, test } from "@playwright/test";
import { defineSectionSuite } from "../../src/shared/lib/sites-tools/testing-e2e";

// One visual baseline per band of the Figma frame at both breakpoints, named
// like its bands; adding a section is one line. Bands the site links to are
// reached by their `#`; the stats strip and the guarantee have no anchor and
// sit a band away from one, so they load at the top and the runner shoots the
// element. The sticky bar rides the viewport and only after a scroll: it is
// hidden in every crop (screenshot-section.css) rather than shot.
defineSectionSuite({ test, expect }, [
  { name: "header", url: "/fr", selector: "header >> nth=0" },
  { name: "hero", url: "/fr", selector: "main > section >> nth=0" },
  { name: "stats", url: "/fr", selector: "[data-band=stats]" },
  { name: "services", url: "/fr#prestations", selector: "#prestations" },
  { name: "reviews", url: "/fr#avis", selector: "#avis" },
  { name: "guarantee", url: "/fr#faq", selector: "[data-band=guarantee]" },
  { name: "faq", url: "/fr#faq", selector: "#faq" },
  // The gold band that sends back up to the form; the form itself is the
  // hero's card (`#devis`), shot with the hero.
  { name: "closing", url: "/fr#demande", selector: "#demande" },
  { name: "footer", url: "/fr#footer", selector: "footer#footer" },
  // The sub-pages (Figma Guarantee 40:1428, Prices 41:1627, About 42:1910):
  // their head with the proof card, then each band between it and the gold
  // band, which, the header and the footer are the home page's.
  { name: "prices-head", url: "/fr/prices", selector: "[data-band=page-head]" },
  { name: "price-table", url: "/fr/prices#tarifs", selector: "#tarifs" },
  { name: "guarantee-head", url: "/fr/guarantee", selector: "[data-band=page-head]" },
  { name: "promises", url: "/fr/guarantee#engagements", selector: "#engagements" },
  { name: "how-it-works", url: "/fr/guarantee#etapes", selector: "#etapes" },
  { name: "about-head", url: "/fr/about", selector: "[data-band=page-head]" },
  { name: "crew", url: "/fr/about#equipe", selector: "#equipe" },
  { name: "service-area", url: "/fr/about#zone", selector: "#zone" },
  { name: "thanks", url: "/fr/thanks", selector: "body" },
  { name: "not-found", url: "/fr/nope", selector: "body" },
]);
