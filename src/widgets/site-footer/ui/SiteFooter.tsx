import { withLang } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { phoneLink } from "@/shared/lib/phone";
import { Logo } from "@/shared/ui";

export interface SiteFooterProps {
  copy: Copy;
  year: number;
  /** The site's pages, before Privacy and Terms. */
  links: readonly { href: string; label: string }[];
  /** The other language: this page in it, and its name in itself. */
  other: { locale: string; href: string; label: string };
}

const LINK = "hover:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

/**
 * The frame's footer (Footer 36:1378) on forest-deep: the small logo, the
 * line, and the row of links — a row from `md`, a centred stack below whose
 * links wrap onto a second line. The pages come first; Privacy
 * and Terms are text as the frame draws them: there are no such pages to link
 * to yet; the place's number follows when it has one. The language switch is one more item of that row, in its style: the
 * other language's name, through the kit's `?lang=` link (`withLang`).
 */
export function SiteFooter({ copy, year, links, other }: SiteFooterProps) {
  const { t } = copy;
  const phone = phoneLink(copy.f.phone);
  return (
    <footer id="footer" className="dark bg-popover px-[var(--page-px)] py-8 text-ink">
      <div className="flex flex-col items-center gap-3 text-sm leading-5 text-white/40 md:flex-row md:justify-between">
        <Logo size="sm" tone="dark" tagline={false} />
        <p className="text-center">{t.footer.copyright(year)}</p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 whitespace-nowrap">
          {links.map(link => (
            <a key={link.href} href={link.href} className={LINK}>
              {link.label}
            </a>
          ))}
          <span>{t.footer.privacy}</span>
          <span>{t.footer.terms}</span>
          {phone && (
            <a href={phone.href} className={LINK}>
              {phone.display}
            </a>
          )}
          <a href={withLang(other.href, other.locale)} hrefLang={other.locale} lang={other.locale} className={LINK}>
            {other.label}
          </a>
        </div>
      </div>
    </footer>
  );
}
