import { Button } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { phoneLink } from "@/shared/lib/phone";
import { Icon } from "@/shared/ui";
import { Reveal } from "./Reveal";

const BUTTON = "h-auto rounded-lg py-2.5 text-sm leading-5";

/**
 * The frame's StickyBar (8:170): fixed to the bottom at every width, forest,
 * shadow-2xl. From `sm` the copy on the left and Call + Book Now on the right;
 * on a phone the two buttons share the width. Without the place's number there
 * is no Call, and Book Now takes the width alone. The page keeps 56 px under the
 * footer so the bar never hides it.
 */
export function StickyBar({ copy, quoteHref }: { copy: Copy; quoteHref: string }) {
  const t = copy.t.sticky;
  const phone = phoneLink(copy.f.phone);
  return (
    <Reveal className="dark fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 bg-background px-4 py-3 shadow-2xl motion-safe:transition-transform motion-safe:duration-300">
      <div className="hidden flex-col whitespace-nowrap sm:flex">
        <p className="text-sm leading-5 font-semibold text-white">{t.title}</p>
        <p className="text-xs leading-4 text-white/50">{t.lede}</p>
      </div>
      <div className="flex min-w-0 flex-1 gap-2 sm:flex-none">
        {phone && (
          <Button href={phone.href} className={`${BUTTON} flex-1 gap-1.5 bg-white/10 px-4 font-medium text-white hover:bg-white/20 sm:flex-none`}>
            <Icon name="phone" className="size-[13px]" />
            {t.call}
          </Button>
        )}
        <Button href={quoteHref} data-intent="form_open" className={`${BUTTON} flex-1 px-5 font-bold hover:bg-amber-400 sm:flex-none`}>
          {t.book}
        </Button>
      </div>
    </Reveal>
  );
}
