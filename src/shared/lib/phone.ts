import { telHref } from "@evinvest/kitstart";

/** A number as a page prints it and dials it. */
export interface PhoneLink {
  display: string;
  href: string;
}

/**
 * The number a page shows: the place's own — `copy.f.phone`, `contactOf` over
 * the place merged with the panel's (`SITES_PANEL_INTERNAL_URL`) — as the source
 * wrote it, dialled digits only. `null` while the place has none: every
 * surface then drops its number rather than show a stand-in, so a page never
 * offers a call nobody answers.
 */
export function phoneLink(live: string | null): PhoneLink | null {
  return live === null ? null : { display: live, href: telHref(live) };
}
