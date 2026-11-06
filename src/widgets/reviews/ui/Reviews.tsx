import { Button, Section } from "@/shared/lib/sites-tools/react";
import type { Copy, ReviewKey } from "@/entities/content";
import { Icon, Stars, TYPE } from "@/shared/ui";
import { ReviewCard } from "./ReviewCard";

/** The frame's three columns, top to bottom; a phone reads them one after another. */
const COLUMNS: readonly (readonly ReviewKey[])[] = [
  ["amanda", "jordan"],
  ["marcus", "keisha"],
  ["priya", "carl"],
];

/**
 * The frame's reviews band (12:286 / 15:647): the heading, the Google summary
 * and six cards in three columns. "Read all … ↗" is text, not a link: there is
 * no Google profile to send it to yet.
 */
export function Reviews({ copy, id, quoteHref }: { copy: Copy; id: string; quoteHref: string }) {
  const t = copy.t.reviews;
  return (
    <Section id={id} data-band="reviews" className="py-20">
      <p className={`${TYPE.eyebrow} text-positive`}>{t.eyebrow}</p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className={`${TYPE.h2} text-brand`}>{t.title}</h2>
        <p className="flex shrink-0 items-center gap-2 text-sm leading-5 text-ink-soft">
          <Icon name="google-g" className="size-3.5" />
          {t.google}
        </p>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <Stars />
        <span className="text-base leading-6 font-bold text-brand">{t.average}</span>
        <span className="text-sm leading-5 text-slate-400">{t.total}</span>
      </p>
      <div className="mt-10 flex flex-col gap-5 md:flex-row md:items-start">
        {COLUMNS.map(column => (
          <div key={column.join()} className="flex min-w-0 flex-col gap-5 md:flex-1">
            {column.map(key => (
              <ReviewCard key={key} id={key} review={t.items[key]} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Button href={quoteHref} variant="secondary" size="xl" data-intent="form_open" className="dark bg-brand py-4 leading-6 font-bold text-white hover:bg-card">
          {t.cta}
        </Button>
      </div>
    </Section>
  );
}
