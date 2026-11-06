import type { Place } from "@/shared/lib/sites-tools";
import type { Locale } from "./i18n";

/**
 * Vifnet's one place. A service-area business: the crew goes to the
 * customer, so there is no address, no coordinate and no map — the
 * `service-area` presence has no field for any of them.
 *
 * Every `null` is a fact the owner has not given yet (`OWNER_TODO`); the
 * publication gate keeps the page `noindex` until they are in, and the
 * sections that would print them stay out of the page.
 */
export const PLACES: readonly Place<Locale>[] = [
  {
    slug: "vifnet",
    gbpName: "Vifnet",
    name: { fr: "Vifnet", en: "Vifnet" },
    presence: { kind: "service-area" },
    serviceArea: null,
    channels: { phone: null, whatsapp: null },
    hours: null,
    rating: null,
  },
];
