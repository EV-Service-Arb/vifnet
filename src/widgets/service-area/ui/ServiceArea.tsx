import { AreaChips, Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { TYPE } from "@/shared/ui";

/**
 * The about page's service area on cream: where the crew goes as the kit's
 * chips. No map: visitors arrive from Google Maps, so a map here repeats what
 * they just saw and did not lift conversion. The column keeps the frame's
 * 460px measure from `md`. The towns are the frame's sample (OWNER_TODO): a
 * `service-area` place has no communes yet.
 */
export function ServiceArea({ copy, id }: { copy: Copy; id: string }) {
  const a = copy.t.area;
  return (
    <Section id={id} surface="card" data-band="service-area" className="py-20">
      <div className="flex w-full flex-col gap-3 md:w-[460px]">
        <p className={`${TYPE.eyebrow} text-positive`}>{a.eyebrow}</p>
        <h2 className={`${TYPE.h2} text-brand`}>{a.title}</h2>
        <p className="text-base leading-[26px] text-ink-soft">{a.lede}</p>
        <AreaChips areas={a.towns} className="gap-2 pt-2 md:gap-2" chipClassName="border-input bg-background px-3.5 leading-5 text-brand" />
      </div>
    </Section>
  );
}
