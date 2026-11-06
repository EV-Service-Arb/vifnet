import type { BookingProvider, MessengerFacts, MessengerVariant, Place, PricingModel } from "@evinvest/kitstart";
import { leadCaptureText, type Copy } from "@/entities/content";
import { BEDROOMS, FLOWS, LEAD, MESSAGE_REF_PREFIX, PHOTO_NEEDS, SUBJECTS, type LeadForm, type Subject } from "@/shared/config/lead";
import { site } from "@/shared/config/site";
import { Icon } from "@/shared/ui/Icon";
import { AfterPhone, BedroomsField } from "./fields";
import { formShape, type FormShape } from "./forms";
import { messengerShape } from "./messenger";
import { QuoteCapture } from "./QuoteCapture";

/**
 * The French *crédit d'impôt* for help at home: half of what is paid comes
 * back, so the price line says what is left (`price="compact"`).
 */
const TAX_CREDIT = 0.5;

const NO_MESSENGERS: MessengerFacts = { whatsapp: null, telegram: null };

/**
 * The preview's words over each question the form asks: an arm draws the
 * compact form, which asks every estimate input, so each has its own.
 */
function previewed(questions: FormShape["questions"], labels: Readonly<Record<string, Record<string, string>>>): FormShape["questions"] {
  return Object.fromEntries(Object.entries(questions).map(([id, q]) => [id, labels[id] === undefined ? q : { ...q, previewLabels: labels[id] }]));
}

/** The price list's frequency question (`shared/config/pricing.ts`), by its id. */
const TIMING = { input: "frequency" } as const;

export interface QuoteCardProps {
  copy: Copy;
  /** The anchor every CTA on the page points at (`#devis`). */
  id: string;
  place: Place<string>;
  /** `contactOf(site, place)`: a `null` number is a channel the card does not offer. */
  contact: { phone: string | null; whatsapp: string | null };
  renderedAt: number;
  /** The price list an estimate is priced from live (the server prices it again); `null`: every job is a quote. */
  pricing: PricingModel | null;
  /** The job the page already knows, not asked again; `?need=` and a service card's `data-need` set it too. */
  need?: Subject | undefined;
  /** Experiment `lead_form`'s switch (`formShape`): one screen, one question per screen, or the price first. */
  form: LeadForm;
  /** The assignment the card's events and its post carry; none when no test runs. */
  experiment: { name: string; variant: string } | undefined;
  /**
   * Experiment `lead_channel`'s arm (`MESSENGER_ARMS`): how the card offers
   * WhatsApp and the bot; `undefined` → the control. With an arm, `form` is
   * the compact one (`cardArms`).
   */
  messenger?: MessengerVariant | undefined;
  /**
   * `messengerFacts(site, place)`: the place's own WhatsApp — never the
   * brand's phone, which `contact` falls back to — and its bot, each `null`
   * when off. Without WhatsApp every arm draws the control; absent, none is offered.
   */
  messengers?: MessengerFacts | undefined;
  /**
   * Experiment `booking_provider`'s arm as a provider: kitstart offers it after
   * a priced lead when the place has it, else the place's default (`bookingOf`);
   * `null` when the test is off.
   */
  bookingVariant: BookingProvider | null;
}

/**
 * The frame's QuoteCard (6:83): white, rounded-2xl, p-7, shadow-2xl — a light
 * island in the dark hero — drawn on kitstart's `LeadCapture` itself, the form
 * every Service-Arb brand shares so an experiment's results pool across them.
 * The heading, the placeholders (labels only for assistive technology) and
 * the Done state are the frame's; the fields, channels and events are the
 * kit's. No name field: the call back asks it, and every field costs leads. A service card names its service (`data-need`), so the card does not
 * ask it again. The card is `#<id>` (`#devis`), its form `#devis-form`, the
 * callback `#devis-callback`; the form posts `form_id=quote`, the kit's
 * default, so its events stay comparable across brands. A regular clean is
 * an estimate (`FLOWS`): its answers as tiles, the price live on one line
 * with what is left after the tax credit, "Réserver"; the other jobs are
 * quotes, with photos on WhatsApp when the place has it. Under the phone one
 * line says the number stays with us; the other channels are one row.
 * An arm of `lead_channel` (`messenger`) offers WhatsApp and the bot in the
 * card instead (`messengerShape`: its words, its parts, its lede).
 */
export function QuoteCard({ copy, id, place, contact, renderedAt, pricing, need, form, experiment, messenger, messengers = NO_MESSENGERS, bookingVariant }: QuoteCardProps) {
  const { t, locale } = copy;
  const shape = formShape(form, t, pricing);
  const priceFirst = form === "price-first";
  const arm = messenger === undefined ? null : messengerShape(messenger, messengers, t.quote.messenger, t.quoteForm.lede);
  const lede = arm === null ? t.quoteForm.lede : arm.lede;
  const text = {
    ...leadCaptureText(t, locale),
    callback: t.quote.callback,
    // Said once, right under the phone (`afterPhone`).
    privacy: "",
    ...(form === "steps" ? { needLabel: t.quote.needQuestion } : {}),
    // "Je ne sais pas" made the clean a quote: the frame's words over the photos ask.
    ...(priceFirst ? { photosTitle: t.quote.unknown.title, photosLede: t.quote.unknown.lede } : {}),
    ...arm?.text,
  };
  const phone = <Icon name="phone" className="size-4" />;
  // The control draws no messenger icon. An arm's are 20 px, as its buttons'; the
  // fallback's «ou via Telegram» and the channel row keep the row's 16.
  const glyph = arm !== null && messengers.whatsapp !== null ? "size-5" : "size-4";
  const icons =
    arm === null
      ? { phone, callback: phone }
      : {
          // The kit draws `phone` before every call inside an arm («Être rappelé», its submit, the squares).
          phone: <Icon name="phone" className={glyph} />,
          callback: <Icon name="phone" className={glyph} />,
          // The apps' own badges, in their colours (`app/globals.css`), on every surface.
          whatsapp: <Icon name="whatsapp" className={glyph} />,
          telegram: <Icon name="telegram" className={glyph} />,
        };
  return (
    <QuoteCapture
      id={id}
      className="light group/card rounded-2xl bg-background p-7 text-ink shadow-2xl"
      place={place}
      contact={contact}
      locale={locale}
      renderedAt={renderedAt}
      wire={LEAD.wire}
      needs={SUBJECTS.map(s => ({ value: s, label: t.services.items[s].name }))}
      flows={FLOWS}
      pricing={pricing}
      // In price-first the regular clean may become a quote too ("Je ne sais pas"): its photos are asked then.
      photos={priceFirst ? SUBJECTS : PHOTO_NEEDS}
      need={need ?? shape.need}
      layout={shape.layout}
      needDisplay={shape.needDisplay}
      localityStep={shape.localityStep}
      questions={arm === null ? shape.questions : previewed(shape.questions, t.quote.messenger.previewLabels)}
      focusNext
      price="compact"
      taxCredit={TAX_CREDIT}
      afterPhone={<AfterPhone text={t.quote.afterPhone} />}
      channelsDisplay="row"
      channelIcons={icons}
      extras={
        <BedroomsField
          label={`${t.quote.labels.bedrooms} (${text.optional})`}
          placeholder={t.quote.bedroomsPlaceholder}
          options={BEDROOMS.map(b => ({ value: b, label: t.quote.bedrooms[b] }))}
        />
      }
      experiment={experiment}
      messenger={messenger}
      messengers={messengers}
      refPrefix={MESSAGE_REF_PREFIX}
      // The regular clean's frequency is the message's timing line («Fréquence : toutes les 2 semaines»).
      messengerTiming={TIMING}
      brand={site.brand.name}
      bookingVariant={bookingVariant}
      text={text}
      labels="hidden"
      // Folded: one button of the channel row until asked for — even when the place is closed and it would lead.
      callbackOpen={false}
      head={
        <div className={`flex flex-col gap-1 ${shape.head}`}>
          <h2 className="font-serif text-2xl leading-8 font-bold text-brand">{t.quoteForm.title}</h2>
          {lede !== null && <p className="text-sm leading-5 text-ink-soft">{lede}</p>}
        </div>
      }
      classNames={arm === null ? shape.look : { ...shape.look, ...arm.look }}
      doneText={{ title: t.quote.doneTitle, body: t.quote.doneBody }}
    />
  );
}
