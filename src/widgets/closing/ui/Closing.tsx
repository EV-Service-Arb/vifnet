import { Button, Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { phoneLink } from "@/shared/lib/phone";
import { Icon, TYPE } from "@/shared/ui";

export interface ClosingProps {
  copy: Copy;
  id: string;
  /** Where the quote form is: the hero's card. */
  quoteHref: string;
}

/**
 * The frame's final CTA (13:504 / 15:904) on gold: the headline, the lede in
 * forest at 65 %, a forest button back up to the form and the phone as the
 * frame's "Outline on gold" button when the place has a number — a row from
 * `md`, stacked full width below.
 */
export function Closing({ copy, id, quoteHref }: ClosingProps) {
  const { t } = copy;
  const phone = phoneLink(copy.f.phone);
  return (
    <Section id={id} surface="primary" data-band="cta" className="py-12">
      <div className="mx-auto flex max-w-[736px] flex-col items-center text-center">
        <h2 className={`${TYPE.h2Cta} text-brand`}>{t.closing.title}</h2>
        <p className="mt-3 text-base leading-6 text-brand/65">{t.closing.lede}</p>
        <div className="mt-7 flex w-full flex-col gap-3 md:w-auto md:flex-row">
          <Button href={quoteHref} size="xl" data-intent="form_open" className="dark bg-brand leading-6 font-bold text-white hover:bg-card">
            {t.closing.cta}
          </Button>
          {phone && (
            <Button
              href={phone.href}
              variant="outline"
              size="xl"
              className="border-brand/15 bg-white/30 leading-6 font-bold text-brand shadow-none hover:bg-white/50 hover:text-brand"
            >
              <Icon name="phone" className="size-[15px]" />
              {phone.display}
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}
