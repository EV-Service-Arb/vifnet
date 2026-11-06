import { Section } from "@/shared/lib/sites-tools/react";
import type { Copy } from "@/entities/content";
import { BandHead } from "@/shared/ui";

/**
 * The about page's team (Figma CrewCard 38:1476): initials on forest, the
 * name, the role and the vetting line — four across from `lg`, two from `md`,
 * one on a phone. The names are the frame's sample (OWNER_TODO).
 */
export function Crew({ copy, id }: { copy: Copy; id: string }) {
  const t = copy.t.team;
  return (
    <Section id={id} data-band="crew" className="py-20">
      <BandHead eyebrow={t.eyebrow} title={t.title} lede={t.lede} />
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {t.members.map(member => (
          <li key={member.name} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6">
            <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-brand font-serif text-xl leading-7 font-bold text-primary">
              {member.initials}
            </span>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-base leading-6 font-bold text-ink">{member.name}</h3>
              <p className="text-sm leading-5 text-ink-soft">{member.role}</p>
            </div>
            <p className="text-xs leading-4 text-slate-400">{t.facts}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
