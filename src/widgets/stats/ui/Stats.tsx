import { Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";

/** The frame's stats strip (9:202 / 14:577): four figures on forest-mid, 2 × 2 on a phone. */
export function Stats({ copy }: { copy: Copy }) {
  return (
    <Section polarity="dark" surface="card" data-band="stats" className="py-5">
      <dl className="grid grid-cols-2 gap-4 whitespace-nowrap md:grid-cols-4">
        {copy.t.stats.map(stat => (
          <div key={stat.label} className="flex flex-col-reverse items-center gap-0.5">
            <dt className="text-xs leading-4 text-white/60">{stat.label}</dt>
            <dd className="font-serif text-2xl leading-8 font-bold text-primary">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
