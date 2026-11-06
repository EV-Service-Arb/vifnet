import { Icon } from "@/shared/ui/Icon";

/** The card's words once a lead is taken: plain strings, they cross into the client island. */
export interface QuoteDoneText {
  title: string;
  /** Around the number as typed. */
  body: readonly [string, string];
}

/**
 * The card's last state (Figma QuoteCard Done): a leaf check, the title and
 * the number we will call. The form asks no name, so the title greets no one
 * by it. `LeadCapture` puts it in the card's place and gives it the focus and
 * `role="status"`. A priced lead (an estimate) is promised no quote: under the
 * title the kit confirms the server's price and the call that sets the slot.
 */
export function QuoteDone({ text, phone, priced }: { text: QuoteDoneText; phone: string; priced: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${priced ? "pt-6" : "py-6"}`}>
      <span className="flex size-12 items-center justify-center rounded-full bg-positive text-white">
        <Icon name="check" className="size-5" />
      </span>
      <p className="mt-3 font-serif text-xl leading-7 font-bold text-brand">{text.title}</p>
      {!priced && (
        <p className="mt-1 text-sm leading-5 text-ink-soft">
          {text.body[0]}
          <span className="font-bold text-brand">{phone}</span>
          {text.body[1]}
        </p>
      )}
    </div>
  );
}
