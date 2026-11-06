import { Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { BandHead } from "@/shared/ui";

/**
 * The guarantee page's promises (Figma PromiseCard 38:1463): a worry in the
 * customer's words, the gold rule, and the term that answers it — four
 * across from `lg`, two from `md`, one on a phone.
 */
export function Promises({ copy, id }: { copy: Copy; id: string }) {
  const p = copy.t.promises;
  return (
    <Section id={id} data-band="promises" className="py-20">
      <BandHead eyebrow={p.eyebrow} title={p.title} lede={p.lede} />
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {p.items.map(item => (
          <li key={item.title} className="flex flex-col gap-4 rounded-2xl border border-border bg-background px-6 pt-6 pb-7">
            <p className="text-sm leading-[22.75px] text-ink-soft">{item.worry}</p>
            <span aria-hidden="true" className="h-0.5 w-10 bg-primary" />
            <h3 className="text-base leading-6 font-bold text-ink">{item.title}</h3>
            <p className="text-sm leading-[22.75px] text-ink-mid">{item.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
