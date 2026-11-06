import { Faq, Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { phoneLink } from "@/shared/lib/phone";
import { TYPE } from "@/shared/ui";

/**
 * The kit's `<details>` list, restyled through its part classes into the
 * frame's FAQ items (7:157): white cards 8 apart, a 14 px question, a
 * chevron that turns over when the item opens (the kit's "+" glyph is hidden
 * and the chevron masked in its place), a sage row on hover, the answer under
 * a slate-50 hairline.
 */
const ITEMS = {
  list: "flex flex-col gap-2 overflow-visible rounded-none border-0 bg-transparent",
  item: "overflow-hidden rounded-2xl border border-border bg-background last:border-b",
  summary: "items-center justify-between gap-4 px-6 py-4 hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:px-6 md:py-4",
  question: "font-sans text-sm leading-5 font-semibold text-brand",
  icon: "vf-icon vf-icon-chevron-down size-4 shrink-0 text-[0px] leading-none text-brand motion-safe:transition-transform group-open:rotate-180",
  answer: "border-t border-slate-50 px-6 pt-3 pb-4 text-sm leading-[22.75px] text-ink-soft md:px-6 md:pb-4",
} as const;

/**
 * The frame's FAQ band (13:464 / 15:865) on cream. The "still have a
 * question?" line points at the place's number, so it goes with it.
 */
export function FaqBand({ copy, id }: { copy: Copy; id: string }) {
  const { t } = copy;
  const phone = phoneLink(copy.f.phone);
  return (
    <Section surface="card" id={id} data-band="faq" className="py-20">
      <div className="mx-auto max-w-[736px]">
        <div className="flex flex-col items-center text-center">
          <p className={`${TYPE.eyebrow} text-positive`}>{t.faqEyebrow}</p>
          <h2 className={`${TYPE.h2Faq} mt-3 text-brand`}>{t.faqTitle}</h2>
        </div>
        <Faq items={t.faqs} id={`${id}-list`} className="mt-10" classNames={ITEMS} />
        {phone && (
          <p className="mt-6 text-center text-sm leading-5 text-slate-400">
            {t.faqMore}
            <a href={phone.href} className="font-semibold text-positive underline hover:no-underline">
              {phone.display}
            </a>
          </p>
        )}
      </div>
    </Section>
  );
}
