import type { LeadCapturePart } from "@evinvest/kitstart/react";

/** `LeadCapture`'s parts as a class map. */
export type Look = Readonly<Partial<Record<LeadCapturePart, string>>>;

/**
 * The frame's Field (6:26) over the kit's controls: slate-200 border
 * (`border-input`), rounded-xl, 16 × 14, 14/20 — placeholder slate-400, value
 * slate-700 — and a 2 px leaf ring on focus. Shared by the inputs and both
 * states of the selects, so a select is the same box before and after it
 * hydrates. `LeadCapture` gives it to the need's select and the callback's
 * phone too (`control`); the bedrooms select takes it itself.
 */
export const FIELD =
  "h-[50px] rounded-xl bg-background py-3.5 text-sm leading-5 text-slate-700 shadow-none md:text-sm placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring";

/** The frame's full-width gold buttons: Button lg, 52 px at 32 × 14 and 16/24 bold, with shadow-sm. */
export const WIDE_BUTTON = "h-[52px] w-full px-(--control-px) py-3.5 text-(length:--control-text) leading-6 font-bold shadow-sm hover:bg-amber-400";

/** The 12 px line under the phone (`afterPhone`), beside the shield. */
export const AFTER_PHONE = "vf-after-phone -mt-1.5 flex items-start gap-1.5 text-xs leading-4 text-ink-soft";

/**
 * A tile chosen (the frame's selected Tile): gold at 10 % over white, a 2 px
 * gold edge — the second pixel an inset shadow, so the label does not move —
 * and the label semibold in forest.
 */
const CHOSEN =
  "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:font-semibold peer-checked:text-brand peer-checked:shadow-[inset_0_0_0_1px_var(--primary)]";

/** The frame's Tile: white, slate-200, rounded-xl, 14/20 slate-700. */
const TILE = `rounded-xl bg-background text-sm leading-5 text-slate-700 ${CHOSEN}`;

/**
 * Fields in a column, and side by side from `sm`: any kit Field (`data-slot`)
 * takes one column, the line under the phone the phone's, every other block the row.
 */
const CONTACT_GRID = "grid gap-3 sm:grid-cols-2 [&>*]:col-span-full sm:[&>[data-slot=field]]:col-span-1 sm:[&>.vf-after-phone]:col-[2/3]";

/** The other channels: one row of equal buttons; the call not on a phone, where the sticky bar has it. */
const CHANNEL_ROW = "flex-nowrap gap-2 max-sm:[&>a[href^=tel]]:hidden";

const PROGRESS = "gap-3 [&_[data-slot=progress]]:bg-slate-100 [&_[data-slot=progress-indicator]]:bg-primary";
const STEP_BACK = "vf-step-back h-5 min-h-0 gap-1 text-sm leading-5 font-semibold text-slate-600 no-underline hover:underline";
// One "Modifier", after the last chip.
const ANSWERS = "order-2 gap-1.5 [&>li:not(:last-child)_button>span:last-child]:hidden";

/**
 * Parts every form shares — the compact card of the spec (§1) on the frame's
 * QuoteCard (6:83): 20 px between blocks, 12 px between fields; the postcode
 * and the phone on one row from `sm` with the line under the phone in the
 * phone's column (`AFTER_PHONE`), everything else across; the price on one
 * line with "Détail" at its end; the other channels as one row of outline
 * buttons, the call left out on a phone, where the sticky bar has it.
 */
const BASE: Look = {
  root: "gap-5",
  contact: CONTACT_GRID,
  field: "min-w-0",
  error: "w-full",
  opening: "w-full",
  trust: "w-full gap-3",
  control: `${FIELD} px-4`,
  summary: "text-sm leading-5",
  submit: WIDE_BUTTON,
  others: CHANNEL_ROW,
  channel: "h-[42px] min-h-0 gap-1.5 rounded-xl border-input bg-background px-3 py-2.5 text-sm leading-5 font-semibold text-brand shadow-none",
  channelIcon: "text-brand",
  callbackForm: "mt-3 grid gap-3 text-left",
  callbackLede: "text-sm leading-5",
  callbackSubmit: WIDE_BUTTON,
  consent: "text-sm leading-5",
  estimate: "w-full gap-3",
  estimateUnknown: "border-dashed bg-slate-50",
  price: "flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1",
  priceLine: "min-h-6 gap-x-1 text-base leading-6",
  priceTotal: "font-bold text-brand",
  priceTaxCredit: "text-sm leading-5 text-ink-soft",
  // The trigger itself — the popover's button, or the summary without a script —
  // at the line's height (the frame's 57 × 20), a chevron after it (app/globals.css).
  priceDetail: "vf-price-detail min-h-0 gap-0.5 text-sm leading-5 font-semibold text-brand",
  // The popover over the card: the card's white, its field's edge, a soft shadow, 13/20.
  priceDetailContent: "w-72 rounded-xl border border-input bg-background p-4 text-[13px] leading-5 text-ink-soft shadow-lg",
  // Inside the popover's padding: no gap of its own above it.
  breakdown: "leading-5",
  priceNote: "text-[11px] leading-4 text-slate-400",
  photos: "w-full rounded-xl border-input",
  // After a priced lead: under the Done check, centred like it.
  priced: "-mt-2 items-center gap-1 pb-6 text-center",
  pricedPrice: "text-base leading-6 font-semibold text-brand",
  pricedNote: "text-sm leading-5 text-ink-soft",
};

/**
 * One question per screen: the bar above the card's heading — the form is
 * `contents`, so its bar, chips and screens are the card's own rows, ordered
 * around the heading (`order-*`) — a 4 px slate-100 track with a gold fill,
 * "Retour" under it with a chevron, the answers as slate-50 chips with one
 * "Modifier" at the end, the question in the display face.
 */
const STEPS: Look = {
  form: "contents",
  progress: PROGRESS,
  stepBack: STEP_BACK,
  answers: ANSWERS,
  answer:
    "vf-chip h-auto min-h-0 gap-1.5 border-0 bg-transparent p-0 text-xs leading-4 shadow-none hover:bg-transparent [&>span:last-child]:text-slate-600 [&>span:nth-child(2)]:inline-flex [&>span:nth-child(2)]:h-[26px] [&>span:nth-child(2)]:items-center [&>span:nth-child(2)]:gap-1 [&>span:nth-child(2)]:rounded-full [&>span:nth-child(2)]:border [&>span:nth-child(2)]:border-input [&>span:nth-child(2)]:bg-slate-50 [&>span:nth-child(2)]:px-2.5 [&>span:nth-child(2)]:font-normal [&>span:nth-child(2)]:text-slate-700",
  // 20 px between the questions sharing a screen, 12 between the contact fields.
  step: `order-2 ${CONTACT_GRID} has-[>fieldset]:gap-5`,
  // Only with the phone, the last screen.
  others: `${CHANNEL_ROW} order-3 group-has-[[data-lead-step=phone][data-lead-off]]/card:hidden`,
  stepNext: WIDE_BUTTON,
};

/** a · Compact (Figma 77:3532 / 77:3693): the estimate's answers on one row each, the short words on a phone. */
export const COMPACT_LOOK: Look = {
  ...BASE,
  form: "grid gap-3",
  estimateLegend: "mb-1.5 text-sm leading-5 font-semibold text-brand",
  // One row per question, equal tiles; "Studio" at the frame's 60 px.
  estimateGrid: "flex gap-1.5 [&>label]:min-w-0 [&>label]:flex-1 [&>label:has([value=studio])]:w-[60px] [&>label:has([value=studio])]:flex-none",
  // 44 px on a phone (the kit's touch target), 40 from `md`; a two-line answer
  // ("Toutes les 2 semaines") grows its row to 52. The bedrooms keep their
  // short words on desktop too ("1 … 5+"), as the frame draws them.
  estimateOption: `${TILE} justify-center px-1 py-[5px] text-center text-balance md:min-h-10 peer-[[name$=bedrooms]]:[&>span:first-child]:inline peer-[[name$=bedrooms]]:[&>span:nth-child(2)]:hidden`,
};

/** b · Step by step (Figma 81:3566 … 81:3700, 81:3798): 52 px tiles, the services a list, the frequencies priced. */
export const STEPS_LOOK: Look = {
  ...BASE,
  ...STEPS,
  // The service's question, on a screen of its own, is its heading — not only for assistive technology.
  label: "[legend&]:not-sr-only [legend&]:mb-5 [legend&]:font-serif [legend&]:text-xl [legend&]:leading-7 [legend&]:font-bold [legend&]:text-brand",
  needs: "gap-2 sm:grid-cols-1",
  need: `${TILE} vf-chevron-right min-h-[52px] justify-between px-4 py-1`,
  estimateLegend: "mb-5 font-serif text-xl leading-7 font-bold text-brand",
  estimateGrid: "gap-2 [&:has([name$=bedrooms])]:grid-cols-3 [&:has([name$=surface])]:grid-cols-2",
  estimateOption: `${TILE} min-h-[52px] justify-center px-2 py-1 text-center peer-[[name$=frequency]]:justify-between peer-[[name$=frequency]]:px-4 peer-[[name$=frequency]]:text-left`,
  optionPrice: "text-base leading-6 font-bold text-brand",
};

/**
 * c · Price first (Figma 84:3596 … 84:3860): the size's two questions as
 * tiles, 4 and 3 to a row, "Je ne sais pas" dashed over two columns; the
 * frequencies as cards with their price in the display face and the badged
 * one in cream with a gold edge; "Je ne sais pas" leaves the photos ask in
 * the frame's words, a forest button, and no channel row.
 */
export const PRICE_FIRST_LOOK: Look = {
  ...BASE,
  ...STEPS,
  // The first screen is the size: nothing to go back to, nothing answered to show.
  progress: `${PROGRESS} vf-price-first-bar`,
  stepBack: `${STEP_BACK} group-has-[[data-lead-step$=bedrooms]:not([data-lead-off])]/lead:hidden`,
  answers: `${ANSWERS} group-has-[[data-lead-step$=bedrooms]:not([data-lead-off])]/lead:hidden`,
  others: `${CHANNEL_ROW} order-3 group-has-[[data-lead-step=phone][data-lead-off]]/card:hidden group-has-[input[value='?']:checked]/card:hidden`,
  estimateLegend: "mb-1.5 text-sm leading-5 font-semibold text-brand",
  // The frequencies are a screen of their own: their question is its heading, as in b.
  estimateInput:
    "[&:has([name$=frequency])>legend]:mb-5 [&:has([name$=frequency])>legend]:font-serif [&:has([name$=frequency])>legend]:text-xl [&:has([name$=frequency])>legend]:leading-7 [&:has([name$=frequency])>legend]:font-bold",
  estimateGrid: "gap-1.5 [&:has([name$=bedrooms])]:grid-cols-4 [&:has([name$=surface])]:grid-cols-3",
  estimateOption: `${TILE} justify-center px-1 py-1 text-center peer-[[name$=frequency]]:grid peer-[[name$=frequency]]:min-h-[72px] peer-[[name$=frequency]]:grid-cols-[1fr_auto] peer-[[name$=frequency]]:content-center peer-[[name$=frequency]]:items-center peer-[[name$=frequency]]:gap-x-3 peer-[[name$=frequency]]:gap-y-1 peer-[[name$=frequency]]:px-4 peer-[[name$=frequency]]:py-3 peer-[[name$=frequency]]:text-left peer-[[name$=frequency]]:text-base peer-[[name$=frequency]]:leading-6 peer-[[name$=frequency]]:font-semibold peer-[[name$=frequency]]:text-brand has-[.vf-badge]:border-2 has-[.vf-badge]:border-primary has-[.vf-badge]:bg-card`,
  badge: "vf-badge col-start-1 row-start-1 justify-self-start rounded-full bg-primary px-2.5 py-1 text-[10px] leading-[15px] font-bold tracking-[1px] text-brand uppercase",
  optionPrice: "col-start-2 row-span-2 row-start-1 font-serif text-xl leading-7 font-bold text-brand",
  photos: "gap-5 border-0 p-0 [&>a]:h-[52px] [&>a]:border-0 [&>a]:bg-brand [&>a]:text-base [&>a]:leading-6 [&>a]:font-bold [&>a]:text-white [&>p:first-child]:font-serif [&>p:first-child]:text-xl [&>p:first-child]:leading-7 [&>p:first-child]:font-bold [&>p:first-child]:text-brand [&>p:nth-child(2)]:-mt-4 [&>p:nth-child(2)]:leading-5",
};
