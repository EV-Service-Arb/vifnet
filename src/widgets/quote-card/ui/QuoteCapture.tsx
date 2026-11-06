"use client";

import { LeadCapture, type LeadCaptureProps } from "@/shared/lib/sites-tools/react";
import { QuoteDone, type QuoteDoneText } from "./QuoteDone";

/**
 * `LeadCapture` with the frame's Done state in the card. Its own client
 * module only because `done` is a function of what was sent, and a function
 * cannot cross from the server's `QuoteCard` into the kit's island; the
 * words do, as strings.
 */
export function QuoteCapture({ doneText, ...props }: Omit<LeadCaptureProps, "done"> & { doneText: QuoteDoneText }) {
  return <LeadCapture {...props} done={sent => <QuoteDone text={doneText} phone={sent.phone} priced={sent.cents !== undefined} />} />;
}
