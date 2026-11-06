import "server-only";
import { createPlaceLoader } from "@/shared/lib/sites-tools/next";
import { places } from "@/shared/config/env";
import { site } from "@/shared/config/site";
import { placeOfLocation } from "@/shared/lib/experiments";

const load = createPlaceLoader(site, places);

/**
 * The place and how its links are written, from the route params alone — the
 * link mode is in the `[location]` param, so the page is cached (ISR). So is
 * the home page's experiment bucket (`_vifnet~lead_form.b~booking_provider.a`), which the
 * place does not care about: it is cut off here, and read by the page.
 * The words for it are composed a layer up (`views`), not here: an entity
 * does not reach into a sibling slice.
 */
export function loadPlaceView(params: Promise<{ locale: string; location: string }>): ReturnType<typeof load> {
  return load(params.then(p => ({ ...p, location: placeOfLocation(p.location) })));
}
