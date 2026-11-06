import type { LeadCaptureText, MessengerFacts, MessengerKind, MessengerVariant } from "@/shared/lib/sites-tools";
import type { MessengerCopy } from "@/entities/content";
import { AFTER_PHONE, type Look, WIDE_BUTTON } from "./look";

/** What a `lead_channel` arm changes on the card: the words over the kit's, the parts' look, and the lede. */
export interface MessengerShape {
  text: Partial<LeadCaptureText>;
  look: Look;
  /** The lede under the title; `null`: none — the arm draws its own there (VF-5's chip). */
  lede: string | null;
}

/**
 * The message ready (and the bot's card): the frame's 72 px box in the leaf
 * tint, the badge at 24, the title 14/18 semibold forest over two lines of 12/16.
 */
const PREVIEW =
  "items-center gap-3 [&>span>span]:size-6 rounded-xl bg-hover px-3 py-2.5 [&>div>p:first-child]:text-sm [&>div>p:first-child]:leading-[18px] [&>div>p:first-child]:font-semibold [&>div>p:first-child]:text-brand [&>div>p:last-child]:text-xs [&>div>p:last-child]:leading-4";

/** A channel in a menu (VF-1's select, VF-5's chip): its name 14/20 over its line in 12/16. */
const MENU_OPTION = "py-2 [&_span.flex-col>span:first-child]:text-sm [&_span.flex-col>span:last-child]:text-xs";

/**
 * VF-2's tiles: the card's estimate tiles, 42 px, the chosen one gold at 10 %
 * with a 2 px gold edge. A third of the card is 96 px: the frame's 13 px
 * name, the glyph at 16 and 4 px from it leave «WhatsApp» ~6 px inside the edge.
 */
const TILE =
  "h-[42px] gap-1 rounded-xl border-input bg-background px-2 text-[13px] leading-5 text-slate-700 shadow-none data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:font-semibold data-[state=on]:text-brand data-[state=on]:shadow-[inset_0_0_0_1px_var(--primary)] [&>span>span]:size-4";

/**
 * The buttons beside the main one: an outline one (VF-3's [Telegram][Être
 * rappelé]) is the frame's 52 px white button; a text link («ou via
 * Telegram», the QR code's «Être rappelé») is 14/20 semibold in leaf.
 */
const SECONDARY =
  "rounded-xl text-sm leading-5 font-semibold [&:not(.underline-offset-4)]:min-h-[52px] [&:not(.underline-offset-4)]:border-input [&:not(.underline-offset-4)]:font-bold [&:not(.underline-offset-4)]:text-brand [&.underline-offset-4]:min-h-0 [&.underline-offset-4]:text-primary-ink";

/**
 * Parts every arm shares. The slot is the frame's 72 px for each of its
 * states — `min-h`, not `h`: the QR code a computer draws in it is taller,
 * and the frame lets the card grow there (VF-3 on a computer, 808 px).
 * The channel row under the form goes, and so does the call leading above it
 * while the place is open (`primary`): every arm offers the call itself, and
 * the sticky bar has it (Figma v3 draws neither).
 */
const BASE: Look = {
  // One column at every width: the postcode is the arm's only field beside it, and spans the card (VF-3 on a computer).
  contact: "grid gap-3",
  // The submit is the arm's: the box left here holds only the no-script submit,
  // whose <noscript> is no box with a script — `contents` drops the box's gap with it.
  trust: "contents",
  primary: "hidden",
  others: "hidden",
  // `min-w-0`: a grid item of the contact block, which a button's unbroken label would widen past the card.
  messenger: "min-w-0 gap-3",
  // `gap-3`: the phone's state is the field and its line, which pulls itself up 6 px (`AFTER_PHONE`) for a grid's gap — 50 + 6 + 16 = 72.
  messengerSlot: "min-h-[72px] gap-3",
  // The card's submit, 52 px: the label is wide, so the frame's 16 px sides rather than 32.
  messengerCta: `${WIDE_BUTTON} px-4`,
  messengerSecondary: SECONDARY,
  messengerSquare: "size-[52px] rounded-xl border-input",
  messengerPreview: PREVIEW,
  messengerOption: MENU_OPTION,
  messengerHint: `vf-shield-before ${AFTER_PHONE}`,
  messengerReturn: "gap-3 rounded-2xl px-7",
};

const LOOKS: Readonly<Record<MessengerKind, Look>> = {
  // VF-1: the channel a suffix segment of the phone's 50 px field (the frame's
  // 77:3531 VF-1): the addon loses its insets, so the trigger spans the field's
  // height to its right edge, its outer corners the field's radius less the 1 px
  // border, a 1 px rule from the input (the addon's own -0.45rem pull is dropped too,
  // or the trigger runs past the edge). One focus ring, on the whole field.
  select: {
    messengerPicker:
      "h-[50px] overflow-hidden rounded-xl border-input bg-background shadow-none [&_input]:h-full [&_input]:rounded-none [&_input]:border-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0 [&>[data-slot=input-group-addon]]:h-full [&>[data-slot=input-group-addon]]:self-stretch [&>[data-slot=input-group-addon]]:m-0 [&>[data-slot=input-group-addon]]:p-0 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
    messengerTrigger:
      "h-full gap-1.5 self-stretch rounded-l-none rounded-r-[11px] border-l border-input bg-hover px-3 text-sm leading-5 font-semibold text-brand shadow-none focus-visible:ring-0 focus-visible:outline-none",
  },
  // VF-2: "Recevoir mon devis par" 14/20 semibold forest, the tiles in a row.
  tiles: {
    messenger: "min-w-0 gap-3 [&>p:first-child]:-mb-1.5 [&>p:first-child]:font-semibold [&>p:first-child]:text-brand",
    messengerPicker: "gap-1.5",
    messengerTile: TILE,
  },
  // VF-3: slot A is a button (52) or the phone (50), not the preview's 72.
  swap: { messengerSlot: "min-h-[52px]" },
  // VF-4: the drawer's channels as cards, the recommended one gold at 10 %.
  sheet: {
    messengerPicker: "gap-3 px-5 pt-2 pb-6 [&_h2]:text-2xl [&_h2]:leading-8 [&_h2]:text-brand",
    messengerOption: "gap-3 rounded-xl p-4 [&.border-primary]:border-2 [&.border-primary]:bg-primary/10 [&:not(.border-primary)]:border-input",
  },
  // VF-5: the chip 4 px under the title (the card's rows are 20 apart), 30 high, in the leaf tint.
  chip: {
    messengerTrigger: "-mt-4 h-[30px] gap-1.5 bg-hover px-3 text-sm leading-5 font-semibold text-brand",
  },
  // VF-6: «Devis sur WhatsApp» beside two squares has 182 px: the frame's 15 px and a 6 px gap keep it off the edges.
  split: { messengerCta: `${WIDE_BUTTON} gap-1.5 px-3 text-[15px]` },
  // aquafix's kinds (AQ-2, AQ-3, AQ-5, AQ-6): no vifnet arm draws them (`MESSENGER_ARMS`).
  segment: {},
  thanks: {},
  saga: {},
  urgency: {},
};

/**
 * No WhatsApp on the place, a bot: the control, «ou via Telegram» under its
 * submit — 14/20 semibold in leaf (Figma "Lead form A/B", the fallback "switched off in the panel").
 */
const FALLBACK: Look = { messengerSecondary: SECONDARY };

/**
 * The arm's words, look and lede. Only a place with WhatsApp draws the arm —
 * kitstart's own rule (`messengerShownOf`) — so only then are the arm's words
 * laid over the card's: without it the card is the control, and VF-3's call
 * button must not rename the control's "Réserver".
 */
export function messengerShape(variant: MessengerVariant, facts: MessengerFacts, copy: MessengerCopy, lede: string): MessengerShape {
  if (facts.whatsapp === null) return { text: copy.words, look: FALLBACK, lede };
  const look = { ...BASE, ...LOOKS[variant.kind] };
  switch (variant.kind) {
    case "swap":
      // The call's submit is the card's own: its words for both flows.
      return { text: { ...copy.words, submit: copy.callNow, bookSubmit: copy.callNow }, look, lede: copy.swapLede };
    case "sheet":
      return { text: { ...copy.words, ...copy.sheet, messengerCallback: copy.callNow }, look, lede };
    case "chip":
      return { text: copy.words, look, lede: null };
    default:
      return { text: copy.words, look, lede };
  }
}
