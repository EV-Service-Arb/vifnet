import { placeGraph, type PlaceView, type PricingModel } from "@/shared/lib/sites-tools";
import { JsonLd } from "@/shared/lib/sites-tools/react";
import type { ReactNode } from "react";
import type { Copy } from "@/entities/content";
import type { Locale } from "@/shared/config/i18n";
import { placeNav } from "@/shared/config/nav";
import { site, type Subpage } from "@/shared/config/site";
import { fromPrices } from "@/shared/lib/from-price";
import { Closing } from "@/widgets/closing";
import { Crew } from "@/widgets/crew";
import { FaqBand } from "@/widgets/faq";
import { HowItWorks } from "@/widgets/how-it-works";
import { PageHead } from "@/widgets/page-head";
import { PriceTable } from "@/widgets/price-table";
import { Promises } from "@/widgets/promises";
import { ProofAside } from "@/widgets/proof-aside";
import { ServiceArea } from "@/widgets/service-area";
import { SiteFooter } from "@/widgets/site-footer";
import { SiteHeader } from "@/widgets/site-header";
import { StickyBar } from "@/widgets/sticky-bar";

/** The anchors of the sub-pages' bands, named like the home page's. */
export const SUBPAGE_IDS = {
  prices: "tarifs",
  faq: "faq",
  promises: "engagements",
  how: "etapes",
  team: "equipe",
  area: "zone",
  /** The gold band, as on the home page. */
  closing: "demande",
} as const;

/** Each page's bands between its head and the gold band, as its frame orders them. */
function bands(copy: Copy, page: Subpage, pricing: PricingModel | null): ReactNode {
  switch (page) {
    case "prices":
      return (
        <>
          <PriceTable copy={copy} id={SUBPAGE_IDS.prices} from={fromPrices(pricing)} />
          <FaqBand copy={copy} id={SUBPAGE_IDS.faq} />
        </>
      );
    case "guarantee":
      return (
        <>
          <Promises copy={copy} id={SUBPAGE_IDS.promises} />
          <HowItWorks copy={copy} id={SUBPAGE_IDS.how} />
        </>
      );
    case "about":
      return (
        <>
          <Crew copy={copy} id={SUBPAGE_IDS.team} />
          <ServiceArea copy={copy} id={SUBPAGE_IDS.area} />
        </>
      );
  }
}

export interface PlaceSubpageProps {
  view: PlaceView<Locale>;
  copy: Copy;
  page: Subpage;
  renderedAt: number;
  /** The price list the prices page starts each priced job at: the panel's, else the baked one. Other pages show no price. */
  pricing?: PricingModel | null;
}

/**
 * A sub-page (Figma Guarantee 40:1428, Prices 41:1627, About 42:1910): the
 * home page's header, the page's head with the proof card, its bands, the gold
 * band, the footer and the sticky bar. Every action lands on the home page's
 * quote card: the form is there, once. The structured data is `site`'s and
 * the place's only, as on the home page.
 */
export function PlaceSubpage({ view, copy, page, renderedAt, pricing = null }: PlaceSubpageProps) {
  const { t, f } = copy;
  const now = new Date(renderedAt);
  const nav = placeNav(view, t.nav, site.pages[page]);
  const meta = t.pages[page];
  const graph = placeGraph(site, view, page, { placeName: f.place, title: meta.title(f), description: meta.description(f) }, now);
  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader copy={copy} home={view.href("")} quoteHref={nav.quoteHref} links={nav.header} />
      <main>
        <PageHead head={t.heads[page]} aside={<ProofAside copy={copy} quoteHref={nav.quoteHref} />} />
        {bands(copy, page, pricing)}
        <Closing copy={copy} id={SUBPAGE_IDS.closing} quoteHref={nav.quoteHref} />
      </main>
      <SiteFooter copy={copy} year={now.getFullYear()} links={nav.footer} other={nav.other} />
      {/* Room under the footer for the sticky bar, on the footer's colour. */}
      <div aria-hidden="true" className="dark h-14 bg-popover" />
      <StickyBar copy={copy} quoteHref={nav.quoteHref} />
    </>
  );
}
