import { LEAD_CAPTURE_TEXT, type LeadCaptureText } from "@/shared/lib/sites-tools";
import type { Locale } from "@/shared/config/i18n";
import type { Text } from "../model/types";

/**
 * The quote form's words in a language: the kit's, with the frame's labels,
 * placeholders and submit over them. One builder for every form the visitor
 * meets — the card, and the price confirmation (`/quote/confirm`) a plain
 * post lands on when the price changed under it — so they read alike.
 */
export function leadCaptureText(t: Text, locale: Locale): LeadCaptureText {
  return {
    ...LEAD_CAPTURE_TEXT[locale],
    needLabel: t.quote.labels.subject,
    localityLabel: t.quote.labels.locality,
    phoneLabel: t.quote.labels.mobile,
    localityPlaceholder: t.quote.placeholders.locality,
    phonePlaceholder: t.quote.placeholders.mobile,
    submit: t.quoteForm.submit,
    priceLine: t.quote.priceLine,
    priceTaxCredit: t.quote.priceTaxCredit,
    honeypotLabel: t.quoteForm.honeypotLabel,
  };
}
