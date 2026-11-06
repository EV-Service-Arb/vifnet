import { Section } from "@/shared/lib/sites-tools/react";
import type { ReactNode } from "react";
import type { PageHeadCopy } from "@/entities/content";
import { TYPE } from "@/shared/ui";

/**
 * The sub-pages' one head (Figma PageHead 37:1452) on forest: the eyebrow,
 * the page's `<h1>` and the lede, with `aside` beside them — the proof card,
 * which shows from `lg` (the Mobile variant has none). 48 px of padding on a
 * phone, 80 from `md`.
 */
export function PageHead({ head, aside }: { head: PageHeadCopy; aside?: ReactNode }) {
  return (
    <Section polarity="dark" data-band="page-head" className="py-12 md:py-20">
      <div className="flex items-center gap-16">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <p className={`${TYPE.eyebrow} text-positive`}>{head.eyebrow}</p>
          <h1 className={`${TYPE.h2} text-white`}>{head.title}</h1>
          <p className="max-w-[640px] text-base leading-[26px] text-white/70 md:text-lg md:leading-[29.25px]">{head.lede}</p>
        </div>
        {aside}
      </div>
    </Section>
  );
}
