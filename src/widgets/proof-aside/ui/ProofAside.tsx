import { Button } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";

/**
 * The proof card beside a sub-page's head (Figma ProofAside 37:1401): the
 * home page's four figures, two by two, and the gold action to the form.
 * From `lg` only — on a phone the sticky bar carries the action.
 */
export function ProofAside({ copy, quoteHref }: { copy: Copy; quoteHref: string }) {
  const { t } = copy;
  return (
    <aside data-band="proof" className="hidden w-[380px] shrink-0 flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 lg:flex">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 whitespace-nowrap">
        {t.stats.map(stat => (
          <div key={stat.label} className="flex flex-col-reverse items-center gap-0.5">
            <dt className="text-xs leading-4 text-white/60">{stat.label}</dt>
            <dd className="font-serif text-2xl leading-8 font-bold text-primary">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <Button href={quoteHref} size="xl" data-intent="form_open" className="w-full leading-6 font-bold hover:bg-amber-400">
        {t.closing.cta}
      </Button>
    </aside>
  );
}
