# Architecture

A Next.js App Router site in Feature-Sliced layers on `@evinvest/kitstart`, the
machinery of the Service-Arb landing family (its design:
`LANDING-ARCHITECTURE.md` in the Service-Arb workspace). The package owns the
behaviour — routing, the place model and publication gate, the lead funnel and
store, JSON-LD, sitemap and robots, the structural widgets (language switch,
call bar, commune chips, FAQ, status screens, the form's headless shell).
This repo owns what Vifnet looks and sounds like.

## One composition root

`src/shared/config/site.ts` builds the one `site` object every brand fact is
read from: the brand, the locales, the topology (one place, served at the
apex), the pages, the places, the publication policy and the lead schema. The
contact facts come from `assets/card.toml`, inlined at build.

## Leads reach the panel

Each lead also goes to the Service-Arb panel as one `lead.created` event
(`sa.funnel.v1`, built in `src/shared/lib/funnel-event.ts`): queued in the
leads file before the visitor is thanked, signed, and retried from there.
`LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_KEY_ID` and `LEAD_WEBHOOK_SECRET` come from
the container's Secret, all three or none; without the URL the webhook is off,
which is why it is not in `deploy/config.nix`.
The event's `pii.need` is the job in the operator's words — the French name
of its service card (`PANEL_NEED`), not the posted id. Why a lead is suspect
(`rate_limited`, `too_fast`) goes as `properties.suspect`, and a
rate-limited lead goes at all (`PANEL_SUSPECT`, on since the panel v0.3.0
accepts the property). Each such switch stays off until the panel in
production accepts what it adds: it refuses an unknown property, and the
outbox would park the lead. The lead's id is kitstart's `leadRef`, the
reference the page was answered with, so a booking joins its lead.
The visit's analytics id goes as `properties.analytics_id`, so the panel's
lead events join the visit in PostHog — under `PANEL_ANALYTICS_ID`, on with
the panel v0.4.0. Under `PANEL_EXPERIMENTS` (on with the same release) the
same outbox carries one `experiments.declared@1` per start
(`instrumentation.ts`): the experiments this build runs, for the panel's
"Experiments" screen. A site that ships before that panel is in production
sees such rows go `dead`; `kitstart-outbox requeue` on the pod sends them
again once the panel is upgraded.

A messenger lead (WhatsApp, the Telegram bot: experiment `lead_channel`) goes
as one under `PANEL_MESSENGER` — `channel` `whatsapp` / `telegram` and the
chat's reference `message_ref` (`VF-7K3F`, `MESSAGE_REF_PREFIX`) — on, since
the panel that takes them ships first; without it the panel would see a
`form` with no reference.

## A place without an address

Vifnet goes to its customers. Its place is a `service-area` presence, which
has no field an address, a coordinate or a map could be written into, and the
JSON-LD names `areaServed` communes, never `address` or `geo`. The copy names
no street or premises either (`tests/content.test.ts`).

## Nothing is indexable yet

A page is indexable only when the place passes the publication gate (where the
crew goes and when it works) *and* the site has a domain. Until then every
page is `noindex`, `robots.txt` disallows everything and the sitemap is empty.
`OWNER_TODO` lists the missing facts; a domain set while a launch-blocking one
is open fails the build.

## The frame, and what holds its sample content back

The home page is the Figma frame (`1wXlPmnmOdKYPDWz6N5EB8`, Desktop 1440 /
Mobile 390) verbatim, its sample content included: the rating, the stats, six
named reviews. Its prices are not: a figure on the page is the price list's —
the regular clean starts at the list's lowest `priceOf` over every answer
(`shared/lib/from-price.ts`), and the jobs sold as quotes state none. That content lives in the
copy (`src/entities/content`), never in `site`
or `assets/card.toml`, so no JSON-LD, OG card or notification carries it
(`tests/site.test.ts`). The frame's sample phone number is the exception: it
is not shown at all. The number is the place's own, from the panel's place
source (`SITES_PANEL_INTERNAL_URL`): every surface reads `phoneLink(copy.f.phone)`
and renders its number only when there is one, and the card offers the call
(`tests/live-place.test.ts`); without one, no `tel:` link appears anywhere. OWNER_TODO "design sample content" blocks a launch
until the owner replaces it. The terms an earlier design proposed and the
frame does not state are still `copy:` lines, and a test fails if one
appears in the copy.

## The sub-pages

`/prices`, `/guarantee` and `/about` are the Figma file's sub-page frames
(Prices 41:1627, Guarantee 40:1428, About 42:1910), listed once in
`site.pages` — the proxy, the route tree, the sitemap and the nav read that
list. They are one view (`views/subpage`), as aquafix's `LocationSubpage`:
the home page's header, a `PageHead` with the proof card beside it from `lg`,
the page's bands, the gold band, the footer and the sticky bar. They carry no
form: every action lands on the home page's quote card (`#devis`). The
header and footer links are `shared/config/nav.ts`. The About page's crew
and towns are the frame's sample (OWNER_TODO "design sample content"): the
chips are kitstart's `AreaChips`, fed from the copy, never from the place,
which still names no commune. The page has no map: visitors arrive from
Google Maps, and a map here did not lift conversion.

## Pages stay cached, and work without JavaScript

Place pages are ISR (`revalidate = 600`): no page reads the request, the link
mode rides in the `[location]` param — and so does the home page's A/B
bucket (`_vifnet~lead_form.b~booking_provider.a~lead_channel.a`, docs/EXPERIMENTS.md),
which the proxy writes from the visitor's `ab_<key>` cookies under the
panel's weights and kill switches; the page never asks the panel. The quote form is kitstart's
`LeadCapture` — the form every Service-Arb brand shares, drawn as the frame's
card through its `className` and `classNames`, with the frame's placeholders
(the labels are for assistive technology only) — and a plain POST answered
with a 303, so it submits before any script loads; with one, it says done in
the card (Figma QuoteCard Done). The server refuses only what the form itself
blocks — kitstart's phone rule (`validateLead`) — plus a bedrooms value off
the list; a refusal lands back on `#devis` with the error at its field, and
a post that gets no answer (offline, a hung server) says so in the card and
resends the same lead, which the server stores once. It is the hero's card, the one place every
CTA points at (`#devis`), with its "call me back" (`#devis-callback`) folded
to one line under it.
A service card's link names its service (`data-need`), so the card does not
ask it again. The quote card, the sticky bar's reveal, the phone menu's
closer and, on the About page, kitstart's map facade are the only client
islands, and the page reads the same without them: `qualify-first` shows
the contact once a service's radio is checked (`:has`), the callback is a
`<details>`, the phone menu is a checkbox the burger toggles, the script
only closes it after a link or on Esc. The selects are kitstart's
`FormSelect`: a native `<select>` without a script, the kit's list once the
page hydrates — never a bare `NativeSelect`, whose popup is the platform's
menu.

## How a job is sold

Each job is sold one way (`FLOWS` in `shared/config/lead.ts`, kitstart's
form variants). A regular clean is an `estimate`: the card asks its answers
as tiles — bedrooms, surface band, frequency; the zone too once the place
names more than one commune — and shows the price live, "Réserver" under
it. `/quote` prices the posted answers again with the same `priceOf` and
stores its own number (`flow`, `quoted_cents`, `pricing_valid_from`,
`estimate_inputs`); a posted amount is never read. The card then confirms
that price and offers the place's booking (below).
A deep clean, a move and after-works are quotes: the crew has to see the
place, so the card offers to send photos on WhatsApp (once the place has a
number) and the callback.

A priced lead sets its slot through kitstart's booking: the place's
`booking` (from the panel's place settings; none baked) names its booking
pages, and experiment `booking_provider` (docs/EXPERIMENTS.md) picks between
the call (`manual`) and a Google schedule. Without a schedule the card
promises the call and offers an optional preference, which it posts to
`/quote/booking`; that queues `booking.requested@1` on the lead webhook's
outbox under `PANEL_BOOKING` (on since panel v0.4.0), after the lead's own
`lead.created` is delivered. A
plain post whose price changed under the page lands on `/quote/confirm`,
never cached, which asks again at the fresh price.

The price list is `shared/config/pricing.ts`, placeholder amounts until the
owner sets them (OWNER_TODO, blocks a launch). The panel's
`/api/internal/brands/vifnet/pricing`, on the place source's base
(`SITES_PANEL_INTERNAL_URL`), overrides it whole; unset, down, `{}` or a model that
does not validate, the page and the route price from the baked one. The
estimate asks the bedrooms itself, so while its tiles are in the form the
card's optional bedrooms question is not shown.
`lead.created` carries the sale (`flow`, `quoted_cents`, `pricing_valid_from`,
`estimate_inputs`) under `PANEL_FLOW` (`shared/lib/funnel-event.ts`), on since
the panel v0.3.0 accepts those properties.
