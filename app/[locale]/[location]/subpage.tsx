import type { Metadata } from "next";
import { pricing } from "@/shared/config/env";
import type { Subpage } from "@/shared/config/site";
import { loadPlace, placePageMetadata } from "@/views/place/server";
import { PlaceSubpage } from "@/views/subpage";

type Props = { params: Promise<{ locale: string; location: string }> };

/** A sub-page's route: its `<head>` and its page. */
export function subpageRoute(page: Subpage) {
  return {
    async generateMetadata({ params }: Props): Promise<Metadata> {
      const { view, copy } = await loadPlace(params);
      return placePageMetadata(view, copy, page);
    },
    async Page({ params }: Props) {
      // The price list the table starts each priced job at, live or baked: under ISR, read with the page.
      const [{ view, copy, renderedAt }, model] = await Promise.all([loadPlace(params), page === "prices" ? pricing.model() : null]);
      return <PlaceSubpage view={view} copy={copy} page={page} renderedAt={renderedAt} pricing={model} />;
    },
  };
}
