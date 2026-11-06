/**
 * The Figma text styles (file 1wXlPmnmOdKYPDWz6N5EB8) the page repeats, phone
 * first then from `md` up: Fraunces Bold for the display styles, Instrument
 * Sans for the rest, tracking 0 unless the style sets one. No colour here — a
 * band gives it, so one style reads on every surface.
 */
export const TYPE = {
  /** Display/H1 — the hero headline: 48 → 72, line 1.02. */
  h1: "font-serif font-bold text-5xl leading-[1.02] md:text-7xl md:leading-[1.02]",
  /** Display/4xl → 5xl — the services and reviews headlines: 36/40 → 48/48. */
  h2: "font-serif font-bold text-4xl leading-10 md:text-5xl md:leading-none",
  /** Display/4xl — the FAQ headline, 36/40 at every width. */
  h2Faq: "font-serif font-bold text-4xl leading-10",
  /** Display/3xl → 4xl — the gold band: 30/36 → 36/40. */
  h2Cta: "font-serif font-bold text-3xl leading-9 md:text-4xl md:leading-10",
  /** Label/xs Eyebrow — 12/16 bold caps, 1.8 px apart. */
  eyebrow: "text-xs leading-4 font-bold uppercase tracking-[1.8px]",
} as const;
