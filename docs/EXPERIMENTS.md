# Experiments

A/B tests on the home page. Three places, each with one job:

- **The code** declares an experiment — its variants and their rendering,
  and the default weights and `enabled`. A new arm is always a deploy.
- **The Service-Arb panel** ("Experiments" screen) sets the weights, the kill
  switch and a holdout over the code's, live, without a deploy.
- **PostHog** (Cloud US, project 614067, `brand_id = vifnet`) holds the
  statistics; the panel counts nothing. aquafix runs the same machinery with
  the same event names, so the two sites' funnels read alike.

## How it works

- **Config**: `src/shared/config/experiments.ts` — each experiment's variants
  (`variants[0]` is the control), weights (equal), `enabled` and a one-line
  hypothesis (`EXPERIMENT_SUMMARIES`).
- **Declaration**: at every start (`instrumentation.ts`) the server tells the
  panel which experiments this build runs, with their variants, weights and
  hypotheses — `experiments.declared@1` through the lead webhook's outbox.
  An experiment missing from the latest declaration is retired in the panel.
- **Overrides**: sites_panel's `GET /brands/vifnet/experiments`, the operator's
  `enabled`, `weights` and `holdout` per key (`experimentOverrides` in
  `shared/config/env.ts`, kitstart's `createExperimentsSource`). Answered
  from memory — the first request waits up to 1.5 s, then 30 s fresh and
  stale-while-revalidate — and a panel that is down or answers garbage keeps
  the last good answer, or the code's config if there was none.
  `applyOverrides` from `@evinvest/experiments` lays them over the code
  (`liveExperiments`), field by field: weights of another length than the
  code's variants, a negative or all-zero weight, a holdout outside `[0, 1)`
  or an unknown key are dropped. Variants never come from the panel.
  **Every place a variant is read off a cookie reads it under the live
  config**: the proxy (assignment, the bucket, a forced variant) and `/quote`
  (`experiment_lead`). The page, its events and the place loader read the
  bucket off the path, which the proxy wrote under the same config.
- **Assignment**: `proxy.ts` runs kitstart's routing, then, on a place's home
  page only, `abProxy` from `@evinvest/experiments/next` over the live config:
  a weighted random
  variant in a sticky `ab_<key>` cookie (30 days, `SameSite=Lax`). Crawlers
  and link previews (`isBot` in `src/shared/lib/experiments.ts`: Googlebot,
  bingbot, AdsBot, anything saying bot/crawler/spider/preview, and no user
  agent at all) get the control and no cookie.
- **Rendering stays ISR.** An assigned visitor is rewritten to the
  bucket's own path, `/fr/_vifnet~lead_form.b~booking_provider.a~lead_channel.a`: every
  experiment that runs for them, the control spelt out. The page reads its
  variants — and whether each test runs at all — from the `[location]` param,
  never from the request or the panel, so each bucket is its own cache entry.
  A test switched off is left out of the path, so its page renders the
  control and counts nothing, cookie or not; a cached page of a running test
  is never served once it stops (the proxy strips the test from a bucket path
  it is asked for). No suffix — bots, or no test running — is the page as it
  always was. There is no per-request rendering cost.
- **Events** go through a site-local cookieless beacon sink
  (`features/experiment`), with kitstart's key and host, server-rendered into
  props:

  | event | props | sent |
  | --- | --- | --- |
  | `experiment_exposed` | experiment, variant, channels_available, forced | once per page view |
  | `experiment_contact` | experiment, variant, channel, forced | a `tel:`/WhatsApp tap, or a `data-intent` of `form_open`/`booking`/`telegram` |
  | `experiment_step` | experiment, variant, step, forced | nothing since `quote_single_step` ended (its two-step card sent it); kept for that history |
  | `experiment_lead` | experiment, variant, channel, channels_available, forced | server side, in `/quote`, after kitstart accepted the lead |

  Every event also carries `brand_id`; the client ones carry `location_id`.
  `channels_available` is the messengers the card offered (`wa,tg` | `wa` |
  `tg` | `none`; the page's, or on a lead what the card posted), so the weeks
  `lead_channel` was inert read apart. `experiment_lead`'s `channel` is the
  lead's: `form`, `callback`, `whatsapp` or `telegram`. `lead_form`'s events
  carry the visitor's `lead_channel` arm when it runs, and `superseded: true`
  where `lead_channel` drew the card instead (below).
  Client events are sent only by a browser that has an `ab_<key>` cookie, so
  a crawler rendering the cached control page is never an exposure.
  `experiment_lead` is sent only when kitstart stored the lead and did not
  suspect it (a validation failure, the honeypot or the rate limit send
  nothing), for the no-JS POST and the scripted one alike.
- **kitstart's form funnel.** The quote card is kitstart's `LeadCapture`,
  given the assignment (`experiment`, `variant`), so its own events carry it
  on kitstart's schema — the same on every brand, which is what lets an
  experiment's results pool across sites (the site is the stratum):
  `lead_form_view`, `lead_form_start`, `lead_form_field_error {field}`,
  `lead_form_step {step}` (each screen moved to in `steps`), with `form_id` and
  `layout`; `contact_intent_click {channel}`; and, server side,
  `lead_form_submit` with the posted assignment. They go through kitstart's
  sink, not ours: they are not gated on the cookie and carry no `forced`, so
  they are the funnel's diagnostics, not the primary metric.
- **No person is joined.** The sink is cookieless and its `distinct_id` is
  random per page, so exposure and lead are compared as aggregates per
  variant, not per visitor. (A lead's later life — contacted, won, paid —
  reaches PostHog from the panel, as `sa_*` events, under the visit's
  analytics id, which `lead.created` carries.)

## Reading the result

In PostHog, not here and not in the panel. The panel's "Experiments" screen
opens each experiment's funnel as a PostHog Insight:
`experiment_exposed` → `experiment_lead`, filtered on `experiment = <key>`,
`brand_id = vifnet` and `forced` not `true`, broken down by `variant`, from
the day its weights last changed (or it was first declared). The guardrail's
calls are `experiment_contact` with `channel = phone`, the same filters.

## Stop rule

Read off PostHog's funnel per arm (exposures, leads, calls). Decide only when
**all** hold:

1. at least **14 days** running (two full weekly cycles), **and**
2. at least **~100 exposures in each arm**, **and**
3. P(b > a) on the primary metric **≥ 0.95** (ship b) or **≤ 0.05** (keep a).

Shipping b also needs the guardrail not credibly worse: P(b > a) on the
contact rate ≥ 0.2. Otherwise the verdict is "keep running". Do not peek and
stop early on a lucky day — the thresholds assume the minimums above.

## Forcing a variant (QA)

`/fr?ab_lead_form=b` (or `=a`, `=c`) renders that arm. Several forces combine
in one URL (`?ab_lead_form=b&ab_lead_channel=c`); a force of a test the panel
has paused is ignored. A test the URL does not name depends on where the
request came from:

- **from outside the site** (typed, a bookmark, a link from another site —
  `Sec-Fetch-Site` `none` or `cross-site`, or no such header): the URL is the
  whole QA state, the unnamed test takes the visitor's own arm. So typing
  `/fr?ab_lead_form=b` then `/fr?ab_lead_channel=c` renders lead_form on the
  visitor's own arm again, not on b;
- **from inside the site** (`same-origin`, `same-site` — the menu's taps
  among them): the unnamed test keeps the arm it has now. So
  `/fr?ab_lead_form=c` → the language switch to `/en` → a tap on lead_channel
  e in the menu (`/en?ab_lead_channel=e`) shows lead_form c and lead_channel e.

A forced visit sets `ab__qa` for 30 days from the last force. Its value is the
visitor's own arms, taken on the first forced visit and kept until QA ends
(`lead_form.a~booking_provider.b~lead_channel.e`; `-` for none; a newcomer's
are the arms drawn on that first visit). The rendered arm is written to
`ab_<key>` too, so the page's events and the lead's post name the arm on
screen. While `ab__qa` has a value, that browser's experiment events say
`forced: true`, and so do kitstart's `location_page_view` and
`contact_intent_click` (`AnalyticsBoundary`'s `qaCookie`); the funnel's
`forced` filter leaves them out, and a traffic insight does too once it
filters `forced` is not `true`. kitstart's lead-form events (`lead_form_*`,
`lead_booking_*`, the server's `lead_form_submit`) are not tagged yet
(EV-Main/web_std#219): a QA lead still counts there.

**Staying in QA.** Moving around the site keeps the forced arms: the logo,
the "home" link, the language switch (`/fr?ab_lead_form=b` → `/en` renders
lead_form b in English) and Next's own client fetches and prefetches all land
on a home page with no `?ab_*`, but from the site itself (`Sec-Fetch-Site`
`same-origin` or `same-site`), so the proxy leaves `ab_<key>` and `ab__qa` as
they are. To check a variant in another language, force it, then switch the
language in the header — or open `/en?ab_lead_form=b` directly.

**Leaving QA.** A place's home page with no valid `?ab_<key>=` ends the test
visit when it is an outside entry — typed in the address bar, a bookmark, a
link from another site, a reload of such a URL (`Sec-Fetch-Site` `none` or
`cross-site`, or a browser that sends no such header) — or the menu's
**Reset**. Then `ab_<key>` go back to the visitor's own arms (a paused test's
too — a pause keeps every arm), `ab__qa` and `ab__qa_off` are dropped, and the
chip is gone. A running test with no arm in `ab__qa` to give back — every one
under the old `ab__qa=1`, set before the snapshot — is drawn afresh, so a
forced arm never stays on as real traffic. Under that old mark a force, too,
draws the running tests afresh before saving the snapshot. Sub-pages (`/fr/prices`, …)
neither force nor end it. Clearing the site's cookies does the same, with
fresh arms.

**The menu (kitstart's `AbSwitcher`).** A test visit carries an "A/B" chip in
the bottom-right corner of a place's home page, above the sticky bar, with the
arm of each experiment; a dev server shows it always, production only to a
browser with a non-empty `ab__qa`. Sub-pages have no menu: the proxy forces
and assigns arms on the home page only. To get it on a phone:

1. Open a place with a forced arm, `/fr?ab_lead_form=a` — that sets `ab__qa`
   and the chip appears on that page.
2. Tap the chip: each experiment lists its variants (`lead_form`: Compact,
   Steps, Price first; `booking_provider`: Call back, Google Calendar;
   `lead_channel`: Phone (control), VF-1 Select … VF-6 Split). A tap
   reloads the page on that variant: the same URL with that `?ab_<key>=`
   added, the forces already in it kept, the other tests as they are. The
   menu names a test whose taps change nothing on this page: on a place with
   no WhatsApp, "Lead channel — inactive here (no WhatsApp)" — every arm draws
   the phone card there; where lead_channel runs and the place has WhatsApp,
   "Lead form — inactive here (lead channel owns the card)" — the card is
   lead_channel's (`cardArms`). Both go by one rule in
   `src/shared/lib/experiments.ts` (`leadChannelOffered`,
   `leadChannelOwnsCard`), the card's own.
3. **Reset** reloads the home page without forces and with the arms
   dropped; seeing `ab__qa` with no arm at all (no other path sends that),
   the proxy gives the visitor's own arms back and ends QA — the chip is gone.
4. **Leave test** drops the arms and `ab__qa` (the snapshot with it): the
   browser is a normal visitor again and draws fresh arms on the reload.
   Prefer Reset, or the plain home page, to get the own arms back.

Minimize and Hide last until the next page load. The labels are
`AB_SWITCHER_LABELS` in `src/shared/config/experiments.ts`, checked against
`EXPERIMENTS`.

## Ending an experiment

1. Switch it off in the panel's "Experiments" screen — no deploy: within
   30 s every request gets the control, cookies are ignored and no event is
   sent. It is a pause, not an end: each visitor keeps their `ab_<key>`, so
   switched back on, the test carries on with the same arms. A forced visit
   gets a session cookie `ab__qa_off` naming the paused tests (dropped when QA ends on the home page; after the menu's "Leave test" it lives out the session, harmless — no `ab__qa`, no menu), and
   the QA menu (kitstart 0.17.0, not yet in use here) shows them as "not
   running". (`enabled: false` in `src/shared/config/experiments.ts` does the same
   with a deploy, and is what the next declaration says.)
2. If b won, make b the page (the Figma frame follows, or the owner signs the
   departure off), then delete the experiment, its variant code and its row
   here.
3. If the thing under test is gone — the form replaced, say — delete the
   experiment outright: with no variant code left there is nothing for
   `enabled: false` to switch. Its old `ab_<key>` cookies are then ignored
   and its bucket paths are no longer written. Move its row to "Ended
   experiments" with what it tested and why it stopped.

## Running experiments

### `lead_form`

The same key, a/b arms and weights as aquafix's, so the two sites' results
pool on a and b (site as the stratum); c is each brand's own hypothesis. All
three are kitstart's `LeadCapture` (0.14.0, with the steps layout), drawn to
the Figma page "Lead form A/B" (77:3531), and share the compact card of FORM-AB-VARIANTS-SPEC.md §1:
the price on one line with what is left after the 50 % tax credit and the
breakdown behind "Détail"; one line under the phone ("Numéro gardé entre
nous · rappel sous 15 min.") instead of the trust line and the privacy note;
the other channels as one row of buttons (WhatsApp · Rappel on a phone,
where the sticky bar has the call; Appeler too on desktop); after a choice
the focus moves to the next empty field.

- **Hypothesis**: one question per screen (b), or the price of each
  frequency first with an "I don't know" way out to a quote (c), raises the
  share of visitors who send a lead over the compact one-screen form (a).
  Fewer fields in view and a first answer that costs nothing commit the
  visitor; seeing the price before the phone removes the reason to leave.
- **Evidence**: mixed, which is why it is a test: multi-step forms beat
  single screens in some published form studies and lose in others (Zuko).
  The pieces are taken from live booking funnels walked through on
  2026-10-05 — one question a screen with a progress bar (Thumbtack, Bark,
  Yoojo), a price on each frequency card (Housekeep), an "I don't know"
  answer that does not block (Bark, IZI, Yoojo) —
  reviews/FORM-FEATURES-2026-10-05.md (Service-Arb); none of them published
  its effect. No site data of ours.
- **Control (a)** — Compact (77:3532 / 77:3693): `single`. The service (the
  kit's select), the regular clean's answers as one row of tiles each (short
  words on a phone: "Studio · 1 … 5+", "< 40 · 40–70 · 70–100 · > 100",
  "Semaine · 2 sem. · Mois · Une fois"), the price line, postcode, phone,
  "Réserver".
- **Variant (b)** — Step by step (81:3566 … 81:3700, 81:3798): `steps`. The
  service as a list, the bedrooms, the surface, the frequency as cards with
  the price each makes, then the postcode with the phone. A thin gold bar,
  "Retour", the screens answered as chips with "Modifier".
- **Variant (c)** — Price first (84:3596 … 84:3860): `steps` over the regular
  clean, answered for the visitor (a service card's `data-need` or `?need=`
  still wins). The bedrooms and the surface on one screen, each with "Je ne
  sais pas" over two columns, and "Voir les prix"; the frequencies as cards
  with their price and "Le plus avantageux" on the one the price list
  discounts most; then the contact. "Je ne sais pas" asks nothing more: the
  lead is a quote (kitstart's `ESTIMATE_UNKNOWN`, which the server stores as
  a quote too), with the photos asked on WhatsApp where the place has it.
- **All arms**: no name field; bedrooms is an optional select after the phone
  for a quote; "Rappel" (kitstart's callback) is a button of the channel row;
  a taken lead says done in the card.
- **Primary metric**: lead rate, `experiment_lead / experiment_exposed`.
- **Guardrail**: contact rate, (leads + calls) / exposures.
- **Diagnostic**: kitstart's `lead_form_start`, `lead_form_step` and
  `lead_form_field_error` per variant, pooled across brands in PostHog; in
  c, the share of quotes ("Je ne sais pas") among its leads.

### `booking_provider` — inert until the panel sets a Google schedule

kitstart's experiment key (`BOOKING_EXPERIMENT`), the same on every brand so
the arms pool; aquafix is to run it with the same arms.

- **Inert today.** The arm only picks among the booking pages the place has,
  and the panel has not given Vifnet's place a Google appointment schedule
  (`PlaceLive.booking.providers.google_calendar.url`, set in the panel's place
  settings). Without one, kitstart's `bookingOf` falls back to the place's
  default, `manual`, so both arms are offered the call and the test is an
  A/A. It needs no deploy to come alive: once the panel serves the URL, b
  gets the schedule on the next render of the page (ISR, 10 minutes).
  `tests/experiments.test.ts` holds both cases.
- **Hypothesis**: after a priced lead, letting the visitor pick a slot on the
  owner's Google schedule books more slots than the promise of a call
  (where customers book more easily — FORM-VARIANTS-SPEC.md, "Booking
  providers contract").
- **Control (a)**: `manual` — the card says "Nous vous rappelons pour fixer le
  créneau" and offers an optional preference (a day, a part of the day),
  sent as `booking.requested@1`.
- **Variant (b)**: `google_calendar` — "Choisir un créneau" opens the
  schedule in a new tab, nothing loaded before the click. Google takes no
  parameter, so the card asks the visitor to enter the same phone number
  there (kitstart's `bookPhoneHint`); the panel matches the booking to the
  lead by contact and time. The schedule's booking form must ask for the
  phone ("Téléphone", required).
- **Both arms**: only a priced lead (the regular clean, an estimate) books;
  a quote's slot is set on the call. The page view counts an exposure and
  the taps a contact under `booking_provider`, as for `lead_form`, so
  its PostHog funnel reads like `lead_form`'s; its lead rate is a guardrail here (the arm
  shows only after the lead), not the result.
- **Primary metric**: slots booked per lead, by arm. A Google schedule
  opens in a new tab and never tells the page a slot was taken, so the
  booked count is the panel's: its booked slots per lead (b's from Google
  through its Calendar sync, a's set by the operator after the call). On
  the page, kitstart's `lead_booking_open {provider}` over `experiment_lead`
  of `booking_provider` per variant is the diagnostic: how many reach for a
  slot. The denominator counts quotes too, which never book; randomised,
  their share is the same in both arms. `provider` is what was offered, so
  while the arm is inert both read `manual`.

### `lead_channel` — inert until the panel gives the place a WhatsApp number

The key aquafix runs with its own arms (MESSENGER-CHANNELS-SPEC §4, Service-Arb):
where the quote goes. Each arm is kitstart's `LeadCapture` `messenger` variant
(`MESSENGER_ARMS`), drawn to the Figma page "Lead form A/B", messengers v3
(section 109:3739, VF-1 … VF-6 and the fallback 110:4836).

- **Inert today.** The test draws only on a place with a WhatsApp number of
  its own (the panel's place `whatsapp`, never the brand's phone) —
  kitstart's rule. A bot alone leaves it inert: every arm is `lead_form`'s
  card. The arm stays assigned and counted either way, and every event says
  what the card had (`channels_available`: `wa,tg` | `wa` | `tg` | `none`) —
  ours (`experiment_exposed`, `experiment_lead`) and kitstart's.
- **Precedence over `lead_form`** (`cardArms`). Where it draws, `lead_channel`
  decides the whole card for every arm, the control `a` too: the compact form
  whatever the visitor's `lead_form` arm, so the channel's effect is never
  read through two forms; the card's own events and post (kitstart's
  `experiment`, one per card) name `lead_channel`, kitstart adds
  `messenger_variant`. `lead_form` is superseded there: its `experiment_*`
  events say `superseded: true` (and the visitor's `lead_channel` arm) —
  read `lead_form` with `superseded` not `true`. Without WhatsApp nothing
  changes: `lead_form` keeps the card and its events.
- **Hypothesis**: sending the quote as our prefilled WhatsApp message (or
  through the bot), the phone asked only for a call, lifts leads per visit
  over the phone-only card (a).
- **Control (a)**: the compact card, phone and «Réserver», as `lead_form`'s a draws it.
- **Variants**: b VF-1, the channel in a select at the end of the phone field
  (WhatsApp: the number optional); c VF-2, «Recevoir mon devis par» and three
  tiles over a 72 px slot (the message / the bot / the phone); d VF-3, no
  phone until «Être rappelé» swaps it in for the WhatsApp button; e VF-4, one
  button «Recevoir mon devis» and a drawer of the channels, the phone asked
  in the drawer; f VF-5, the lede becomes a channel chip with a menu; g VF-6,
  «Devis sur WhatsApp» with Telegram and call squares. Every state of an arm
  keeps the card's height; a computer gets the QR code (the card grows there).
- **The lead.** A messenger tap posts the lead first (`channel=whatsapp|telegram`,
  the chat reference `message_ref`, `VF-7K3F`), then opens the chat;
  `lead.created` says the channel and carries the reference.
- **Primary metric**: leads that reached us per exposure — form and callback
  leads (`experiment_lead` with `channel` `form` | `callback`) plus messenger
  leads the customer confirmed by writing (the panel's `lead.messaged`, in
  PostHog `sa_lead_messaged`), over `experiment_exposed`, with
  `channels_available` not `none`. Not the raw `experiment_lead`: a messenger
  tap posts its lead before any message, so `experiment_lead` with `channel`
  `whatsapp` | `telegram` is an intent, not a lead.
- **Guardrail**: contact rate; `experiment_contact` counts a Telegram tap too
  (`channel = telegram`).
- **Diagnostic**: kitstart's `lead_messenger_open`, `lead_messenger_return
  {answer}` and `contact_intent_click {channel: whatsapp_qr}` per variant.

## Ended experiments

### `lead_layout` — ended unresolved (code 2026-10-05; live with the next release)

- **What it tested**: kitstart's `LeadCapture` with everything on one screen
  (`single`, a) against the service first as a tile, then the contact
  (`qualify-first`, b). Hypothesis: a first question that costs one tap
  raises the lead rate.
- **Why it ended**: replaced before reaching the stop rule by `lead_form`,
  which asks the same question with the compact card in every arm and a
  third arm; its `qualify-first` arm is gone (b is now one question per
  screen). Removed outright (step 3 above): no verdict. Its events stay in
  PostHog under `experiment = lead_layout`.
- **Successor**: `lead_form`.

### `quote_single_step` — ended unresolved (code 2026-10-03; live with the next release)

- **What it tested**: the Figma frame's two-step quote card (name, phone,
  postcode, then "Continue", bedrooms and service; a) against the same card
  as one step (name, phone, postcode, service; no bedrooms; b,
  `form_id = quote_single_step`). Hypothesis: one step raises the lead rate.
- **Why it ended**: the form it tested was replaced by kitstart's
  `LeadCapture`, the lead form every Service-Arb brand now shares, so neither
  arm exists any more. It was removed outright (step 3 above) before reaching
  the stop rule — no verdict. Its events stay in PostHog under
  `experiment = quote_single_step`.
- **Successor**: `lead_layout` (itself ended for `lead_form`), which asked the
  same question — how much of the form a visitor faces at once — on the
  shared component.
