import { Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { Icon } from "@/shared/ui";

/** The frame's guarantee band (13:455 / 15:857): the shield and the promise on forest-mid, a row from `md`, a centred stack below. */
export function Guarantee({ copy }: { copy: Copy }) {
  const t = copy.t.guarantee;
  return (
    <Section polarity="dark" surface="card" data-band="guarantee" className="py-14">
      <div className="mx-auto flex max-w-[864px] flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
          <Icon name="shield-check" className="size-7" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="font-serif text-2xl leading-8 font-bold text-white md:text-3xl md:leading-9">{t.title}</h2>
          <p className="text-base leading-[26px] text-white/60">{t.body}</p>
        </div>
      </div>
    </Section>
  );
}
