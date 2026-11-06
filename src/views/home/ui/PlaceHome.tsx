import { channelsAvailable, contactOf, faqPageNode, messengerFacts, placeGraph, type AnalyticsTarget, type PlaceView, type PricingModel } from "@/shared/lib/sites-tools";
import { AbSwitcher, JsonLd } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { ExperimentScope } from "@/features/experiment";
import { abSwitcherExperiments, BOOKING_ARMS, QA_COOKIE } from "@/shared/config/experiments";
import type { Locale } from "@/shared/config/i18n";
import { ANCHORS, placeNav } from "@/shared/config/nav";
import { site } from "@/shared/config/site";
import { type Bucket, cardArms, leadChannelOffered, variantsOf } from "@/shared/lib/experiments";
import { fromPrices } from "@/shared/lib/from-price";
import { Closing } from "@/widgets/closing";
import { FaqBand } from "@/widgets/faq";
import { Guarantee } from "@/widgets/guarantee";
import { Hero } from "@/widgets/hero";
import { QuoteCard } from "@/widgets/quote-card";
import { Reviews } from "@/widgets/reviews";
import { Services } from "@/widgets/services";
import { SiteFooter } from "@/widgets/site-footer";
import { SiteHeader } from "@/widgets/site-header";
import { Stats } from "@/widgets/stats";
import { StickyBar } from "@/widgets/sticky-bar";

/** The anchors the page links to, and the e2e sections are shot by. */
export const SECTION_IDS = {
  services: "prestations",
  reviews: ANCHORS.reviews,
  faq: "faq",
  /** The quote card in the hero: every CTA lands here, from every page. */
  quote: ANCHORS.quote,
  /** The gold band at the end, which sends back up to the form. */
  closing: "demande",
} as const;

export interface PlaceHomeProps {
  view: PlaceView<Locale>;
  copy: Copy;
  renderedAt: number;
  /** The price list the quote card prices estimates from, and the service cards start theirs at: the panel's, else the baked one. */
  pricing: PricingModel | null;
  /**
   * The bucket this render is (the path's, never the request's): the tests
   * that run on this page and their arms. An absent one renders its control
   * and counts nothing. And where the events go.
   */
  experiments: { bucket: Bucket; target: AnalyticsTarget };
}

/**
 * The home page: the Figma frame (Desktop 1440 9:107, Mobile 390 14:502) and
 * nothing else, in its order. The structured data is built from `site` and
 * the place only — never from the frame's sample rating, reviews or phone.
 */
export function PlaceHome({ view, copy, renderedAt, pricing, experiments }: PlaceHomeProps) {
  const { t, f } = copy;
  const now = new Date(renderedAt);
  const nav = placeNav(view, t.nav, site.pages.home);
  const graph = placeGraph(site, view, "home", { placeName: f.place, title: t.pages.home.title(f), description: t.pages.home.description(f) }, now);
  const { lead_form: variant, booking_provider: booking, lead_channel: channel } = variantsOf(experiments.bucket);
  const running = experiments.bucket.lead_form !== undefined;
  const bookingRunning = experiments.bucket.booking_provider !== undefined;
  const channelRunning = experiments.bucket.lead_channel !== undefined;
  const messengers = messengerFacts(site, view.place);
  // `lead_channel` over `lead_form` (`cardArms`): its arm's form, and the one name the card's events carry.
  const card = cardArms(experiments.bucket, messengers);
  // On every test's events: which messengers this card had (kitstart's events say it too).
  const offered = channelsAvailable(messengers);
  return (
    <>
      <JsonLd data={graph} />
      <JsonLd data={faqPageNode(t.faqs)} />
      <ExperimentScope
        target={experiments.target}
        placeSlug={view.place.slug}
        experiment="lead_form"
        variant={variant}
        enabled={running}
        channelsAvailable={offered}
        leadChannel={channelRunning ? channel : undefined}
        superseded={card.superseded}
      >
        {/* Its own exposures and contacts, so PostHog's funnel reads both tests alike. */}
        <ExperimentScope
          target={experiments.target}
          placeSlug={view.place.slug}
          experiment="booking_provider"
          variant={booking}
          enabled={bookingRunning}
          channelsAvailable={offered}
        >
          <ExperimentScope
            target={experiments.target}
            placeSlug={view.place.slug}
            experiment="lead_channel"
            variant={channel}
            enabled={channelRunning}
            channelsAvailable={offered}
          >
            <SiteHeader copy={copy} home={view.href("")} quoteHref={nav.quoteHref} links={nav.header} />
            <main>
              <Hero
                copy={copy}
                form={
                  <QuoteCard
                    copy={copy}
                    id={SECTION_IDS.quote}
                    place={view.place}
                    contact={contactOf(site, view.place)}
                    renderedAt={renderedAt}
                    pricing={pricing}
                    form={card.form}
                    experiment={card.experiment}
                    messenger={card.messenger}
                    messengers={messengers}
                    bookingVariant={bookingRunning ? BOOKING_ARMS[booking] : null}
                  />
                }
              />
              <Stats copy={copy} />
              <Services copy={copy} id={SECTION_IDS.services} quoteHref={nav.quoteHref} from={fromPrices(pricing)} />
              <Reviews copy={copy} id={SECTION_IDS.reviews} quoteHref={nav.quoteHref} />
              <Guarantee copy={copy} />
              <FaqBand copy={copy} id={SECTION_IDS.faq} />
              <Closing copy={copy} id={SECTION_IDS.closing} quoteHref={nav.quoteHref} />
            </main>
            <SiteFooter copy={copy} year={now.getFullYear()} links={nav.footer} other={nav.other} />
            {/* Room under the footer for the sticky bar, on the footer's colour.
                While the QA chip is mounted (bottom-20 + its 44 px), more room,
                so at the page's end the footer's last row — the only language
                switch — clears the chip's top: 112 + the footer's 32 px padding
                over 124 px. Keyed on the chip itself, so no other visitor's
                layout moves, and a Hide gives the room back. */}
            <div aria-hidden="true" className="dark h-14 bg-popover [:root:has([data-ab-switcher])_&]:h-28" />
            <StickyBar copy={copy} quoteHref={nav.quoteHref} />
          </ExperimentScope>
        </ExperimentScope>
      </ExperimentScope>
      {/* The QA menu, here and not in the layout: the proxy forces and assigns
          arms on a place's home page only, so elsewhere the menu could switch
          nothing. Plain props, no cookie read: the gate decides after mount and
          the page stays static. bottom-20 lifts the chip over the StickyBar,
          which spans the bottom at every width (64 px). */}
      <AbSwitcher experiments={abSwitcherExperiments({ whatsapp: leadChannelOffered(messengers), leadChannelOwnsCard: card.superseded })} qaCookie={QA_COOKIE} className="bottom-20" />
    </>
  );
}
