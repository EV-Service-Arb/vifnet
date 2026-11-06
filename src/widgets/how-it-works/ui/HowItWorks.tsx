import { Section } from "@evinvest/kitstart/react";
import type { Copy } from "@/entities/content";
import { BandHead } from "@/shared/ui";

/**
 * The guarantee page's three steps (Figma Step 38:1470) on cream, as an
 * `<ol>`: the list gives the order, so the drawn numeral is decoration. Three
 * across from `md`, stacked on a phone.
 */
export function HowItWorks({ copy, id }: { copy: Copy; id: string }) {
  const s = copy.t.steps;
  return (
    <Section id={id} surface="card" data-band="how-it-works" className="py-20">
      <BandHead eyebrow={s.eyebrow} title={s.title} />
      <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
        {s.items.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-3 border-t-3 border-primary pt-6">
            <span aria-hidden="true" className="font-serif text-4xl leading-10 font-bold text-positive">
              {i + 1}
            </span>
            <h3 className="text-base leading-6 font-bold text-ink">{step.title}</h3>
            <p className="text-base leading-[26px] text-ink-mid">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
