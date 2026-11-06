import "server-only";
import { contactOf, type PlaceView } from "@/shared/lib/sites-tools";
import { placeMetadata } from "@/shared/lib/sites-tools/next";
import type { Metadata } from "next";
import { copyFor, type Copy } from "@/entities/content";
import { loadPlaceView } from "@/entities/place/server";
import type { Locale } from "@/shared/config/i18n";
import { site, type PageKey } from "@/shared/config/site";

/** A place page's view and its words: the entity and the copy, composed here. */
export async function loadPlace(params: Promise<{ locale: string; location: string }>): Promise<{ view: PlaceView<Locale>; copy: Copy; renderedAt: number }> {
  const view = await loadPlaceView(params);
  // The time trap's stamp: when this render (under ISR, this cache fill) happened.
  return { view, renderedAt: Date.now(), copy: copyFor(view.locale, { place: view.place.name[view.locale], phone: contactOf(site, view.place).phone }) };
}

/** A place page's `<head>`: kitstart's, over the page's title and description. */
export function placePageMetadata(view: PlaceView<Locale>, copy: Copy, page: PageKey): Metadata {
  const meta = copy.t.pages[page];
  return placeMetadata(site, view, page, { title: meta.title(copy.f), description: meta.description(copy.f) });
}
