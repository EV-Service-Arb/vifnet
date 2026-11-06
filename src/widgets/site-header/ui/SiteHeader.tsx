import { Button } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { phoneLink } from "@/shared/lib/phone";
import { Icon, Logo, Stars } from "@/shared/ui";
import { type HeaderLink, MobileMenu } from "./MobileMenu";

export type { HeaderLink } from "./MobileMenu";

export interface SiteHeaderProps {
  copy: Copy;
  home: string;
  /** Where the quote form is on this page. */
  quoteHref: string;
  /** The bands the header links to, in the frame's order. */
  links: readonly HeaderLink[];
}

const QUIET = "text-sm leading-5 font-medium text-white/70";

/**
 * The frame's NavBar (8:143): sticky, forest at 95 % over a blur. From a
 * tablet up: the logo, the band links, the rating (from `sm`), the phone
 * (from `lg`, when the place has one) and the gold "Book Now". On a phone: the logo, "Book Now" and
 * the burger, whose menu opens over the page under the bar.
 *
 * The forest and its blur are a layer under the content, not the header's
 * own: a `backdrop-filter` on the header would make it the containing block
 * of the menu's `fixed` scrim, which must cover the viewport. The layer
 * draws the bottom rule too — it would paint over the header's own — and the
 * header keeps a transparent one so the bar stays 65px (`--bar-h`).
 */
export function SiteHeader({ copy, home, quoteHref, links }: SiteHeaderProps) {
  const { t } = copy;
  const phone = phoneLink(copy.f.phone);
  return (
    <header className="dark sticky top-0 z-40 border-b border-transparent text-ink before:absolute before:inset-x-0 before:top-0 before:-bottom-px before:-z-10 before:border-b before:border-white/5 before:bg-background/95 before:backdrop-blur-sm before:content-['']">
      <div className="flex h-16 items-center justify-between px-[var(--page-px)]">
        <a href={home} aria-label={t.nav.home} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Logo size="md" tone="dark" />
        </a>
        <nav aria-label={t.nav.menu} className="hidden items-center gap-7 md:flex">
          {links.map(link => (
            <a key={link.label} href={link.href} className={`${QUIET} hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <p className="hidden items-center gap-1.5 sm:flex">
            <Stars />
            <span className={`flex gap-1 ${QUIET}`}>
              <span>{t.rating.value}</span>
              <span className="text-white/40">{t.rating.count}</span>
            </span>
          </p>
          {phone && (
            <a href={phone.href} className={`hidden items-center gap-1.5 border-l border-white/10 pl-3 lg:flex ${QUIET} hover:text-white`}>
              <Icon name="phone" className="size-[13px]" />
              {phone.display}
            </a>
          )}
          <Button href={quoteHref} data-intent="form_open" className="h-auto rounded-lg px-4 py-2 text-sm leading-5 font-bold hover:bg-amber-400">
            {t.nav.book}
          </Button>
          <MobileMenu label={t.nav.menu} links={links} phone={phone} />
        </div>
      </div>
    </header>
  );
}
