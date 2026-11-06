import { formatCents } from "@/shared/lib/sites-tools";
import { Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { FEATURED, SUBJECTS, type Subject } from "@/shared/config/lead";
import type { FromPrices } from "@/shared/lib/from-price";
import { BandHead, TYPE } from "@/shared/ui";

// From `md` the frame's columns: 300 | the rest | 160, 32 apart, in 24 px of
// padding. On a phone the middle one is dropped and each row is a flex row as
// the Mobile variant draws it — the price as wide as its own amount, the
// service taking the rest, 16 apart — so the roles are spelled out: a row
// laid out as flex can lose its table semantics in some browsers.
const ROW_BOX = "border-b max-md:flex";
const SERVICE = "pr-0 pl-4 max-md:block max-md:min-w-0 max-md:flex-1 md:w-[324px] md:pl-6";
const INCLUDED = "hidden pl-8 md:table-cell";
const PRICE = "pr-4 pl-4 text-right max-md:block max-md:shrink-0 md:w-[216px] md:pr-6 md:pl-8";
const HEAD = `${TYPE.eyebrow} py-3 align-middle text-ink-soft`;
const CELL = "py-4 md:py-6";

/**
 * The prices page's table (Figma PriceRow 38:1460): a real `<table>` with its
 * caption for screen readers only, the header row on sage, a row a service —
 * its name, the "Most popular" badge on the featured one, the tagline, what
 * the home card lists, and where its price starts: the price list's
 * minimum for a priced job (`from`), the copy's words with no number for a
 * quote.
 */
export function PriceTable({ copy, id, from }: { copy: Copy; id: string; from: FromPrices }) {
  const p = copy.t.priceTable;
  return (
    <Section id={id} data-band="price-table" className="py-20">
      <BandHead eyebrow={p.eyebrow} title={p.title} lede={p.lede} />
      <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-background">
        <table role="table" className="w-full border-collapse text-left md:table-fixed">
          <caption className="sr-only">{p.caption}</caption>
          <thead role="rowgroup" className="bg-hover">
            <tr role="row" className={`${ROW_BOX} border-input max-md:items-center`}>
              <th role="columnheader" scope="col" className={`${SERVICE} ${HEAD}`}>
                {p.columns.service}
              </th>
              <th role="columnheader" scope="col" className={`${INCLUDED} ${HEAD}`}>
                {p.columns.included}
              </th>
              <th role="columnheader" scope="col" className={`${PRICE} ${HEAD}`}>
                {p.columns.price}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {SUBJECTS.map(subject => (
              <PriceRow key={subject} copy={copy} subject={subject} from={from[subject]} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-10 text-sm leading-5 text-ink-soft">{p.note}</p>
    </Section>
  );
}

function PriceRow({ copy, subject, from }: { copy: Copy; subject: Subject; from: number | null }) {
  const { t } = copy;
  const item = t.services.items[subject];
  const price = from === null ? t.priceTable.rows[subject] : { label: t.priceTable.from, amount: formatCents(from, copy.locale) };
  return (
    <tr role="row" className={`${ROW_BOX} border-border align-top max-md:items-start`}>
      <th role="rowheader" scope="row" className={`${SERVICE} ${CELL} font-normal`}>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base leading-6 font-bold whitespace-nowrap text-ink">{item.name}</span>
          {subject === FEATURED && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] leading-[15px] font-bold tracking-[1px] whitespace-nowrap text-brand uppercase">
              {t.services.badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-4 text-slate-400">{item.tagline}</span>
      </th>
      <td role="cell" className={`${INCLUDED} ${CELL} text-sm leading-[22.75px] text-ink-soft`}>
        {item.points.join(" · ")}
      </td>
      <td role="cell" className={`${PRICE} ${CELL} whitespace-nowrap`}>
        <span className="block text-xs leading-4 text-slate-400">{price.label}</span>
        <span className="block text-xl leading-7 font-bold tracking-[-0.5px] text-positive">{price.amount}</span>
      </td>
    </tr>
  );
}
