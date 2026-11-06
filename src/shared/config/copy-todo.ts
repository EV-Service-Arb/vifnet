import type { OwnerTodo } from "@/shared/lib/sites-tools";
import type { Locale } from "./i18n";

/** An owner-unconfirmed term, and how it would read in each language. */
export interface CopyTodo extends OwnerTodo {
  /** Matches the term in the copy; `tests/content.test.ts` fails on a hit. */
  said: Readonly<Record<Locale, RegExp>>;
}

const term = (field: string, why: string, fr: RegExp, en: RegExp): CopyTodo => ({ field: `copy: ${field}`, why, blocksLaunch: false, said: { fr, en } });

/**
 * Terms an earlier design proposed that the company would be held to, and the
 * owner has not confirmed (Figma note 9:529 and the review of vifnet#10). None
 * of it is on the page; each line says where it would go once confirmed. The
 * terms the current frame states in its own words (supplies, the 24-hour
 * re-clean, keys, the oven and fridge, post-construction, photos from real
 * homes) are no longer here:
 * the page carries the frame verbatim, and OWNER_TODO "design sample content"
 * holds the launch until the owner has replaced or confirmed it.
 */
export const COPY_TODO: readonly CopyTodo[] = [
  term(
    "fixed price",
    "« prix ferme avant de venir / confirmé par écrit, ne change pas sur place » (hero, FAQ, how-it-works)",
    /prix ferme|par écrit|ne change pas/i,
    /fixed price|in writing|does not change/i,
  ),
  term(
    "offices",
    "« logements et locaux », « bureaux et commerces, tôt le matin ou après la fermeture » (title, hero, FAQ, footer): the photos show homes",
    /\blocaux\b|bureaux|commerces|tôt le matin|fermeture/i,
    /premises|\boffices?\b|\bshops?\b|at work|early morning|closing time/i,
  ),
  term("consent", "« rien n’est facturé sans votre accord » (closing, thank-you page)", /facturé|sans votre accord/i, /charged|without your (consent|agreement)/i),
  term("no retouching", "« sans retouche » (before/after headline)", /retouch/i, /retouch/i),
  term(
    "joint check",
    "« vous vérifiez le résultat avec l’équipe avant son départ » (how-it-works step 3)",
    /vérifiez le résultat|avant son départ/i,
    /check the result|before it leaves/i,
  ),
  term("no sales calls", "« pas de démarchage » (under the form)", /démarchage/i, /sales calls?|cold call/i),
];
