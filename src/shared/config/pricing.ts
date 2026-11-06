import type { MultiplyOption, PricingModel, ServiceArea } from "@/shared/lib/sites-tools";
import { PLACES } from "./places";

/** A commune's name as a model slug (`[a-z0-9_-]{1,40}`): "Saint-Étienne" → "saint-etienne". */
export function zoneId(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug === "" ? "zone" : slug;
}

/**
 * The zones the price can depend on: one per commune the place names, all at
 * ×1 until the owner says otherwise, or one zone for wherever the crew goes —
 * the place names no commune yet (OWNER_TODO `places[vifnet].serviceArea`).
 */
export function zonesOf(area: readonly ServiceArea[] | null): readonly MultiplyOption[] {
  const names = [...new Set((area ?? []).flatMap(a => (a.kind === "localities" ? a.names : [])))];
  const zones = names.map(name => ({ id: zoneId(name), labels: { fr: name, en: name }, multiplyBp: 10_000 }));
  // Two communes whose slugs collide would make the model invalid: one zone then.
  const distinct = new Set(zones.map(z => z.id)).size === zones.length;
  return zones.length > 0 && distinct ? zones : [{ id: "default", labels: { fr: "Zone desservie", en: "Service area" }, multiplyBp: 10_000 }];
}

const ZONES = zonesOf(PLACES[0]?.serviceArea ?? null);

/**
 * The baked price list: what `standard` (recurring cleaning) is priced from
 * until the panel serves one (`/brands/vifnet/pricing`), and whenever
 * the panel is down. Built on kitstart's `test/fixtures/pricing/valid/cleaning.json`.
 *
 * OWNER_TODO: every amount here is a placeholder (`OWNER_TODO` "pricing" in
 * site.ts) — the owner sets the real ones in the panel, which overrides this
 * model whole.
 *
 * A zone with a single answer is not asked: one tile is a tap that changes
 * nothing. The zone input stays in the model, so the panel's editor (or a
 * place that names its communes) only has to list it in the need's inputs.
 */
export const PRICING: PricingModel = {
  format: 1,
  currency: "EUR",
  validFrom: "2026-10-03",
  roundToCents: 100,
  minimumCents: 4900,
  inputs: [
    { id: "zone", kind: "multiply", labels: { fr: "Zone", en: "Area" }, options: ZONES },
    {
      id: "bedrooms",
      kind: "add",
      labels: { fr: "Chambres", en: "Bedrooms" },
      options: [
        { id: "studio", labels: { fr: "Studio", en: "Studio" }, addCents: 0 },
        { id: "1", labels: { fr: "1 chambre", en: "1 bedroom" }, addCents: 1500 },
        { id: "2", labels: { fr: "2 chambres", en: "2 bedrooms" }, addCents: 3000 },
        { id: "3", labels: { fr: "3 chambres", en: "3 bedrooms" }, addCents: 4500 },
        { id: "4", labels: { fr: "4 chambres", en: "4 bedrooms" }, addCents: 6000 },
        { id: "5-plus", labels: { fr: "5 et plus", en: "5 or more" }, addCents: 7500 },
      ],
    },
    {
      id: "surface",
      kind: "add",
      labels: { fr: "Surface", en: "Floor area" },
      options: [
        { id: "under-40", labels: { fr: "Moins de 40 m²", en: "Under 40 m²" }, addCents: 0 },
        { id: "40-70", labels: { fr: "40 à 70 m²", en: "40 to 70 m²" }, addCents: 1000 },
        { id: "70-100", labels: { fr: "70 à 100 m²", en: "70 to 100 m²" }, addCents: 2500 },
        { id: "over-100", labels: { fr: "Plus de 100 m²", en: "Over 100 m²" }, addCents: 4500 },
      ],
    },
    {
      id: "frequency",
      kind: "discount",
      labels: { fr: "Fréquence", en: "How often" },
      options: [
        { id: "weekly", labels: { fr: "Chaque semaine", en: "Every week" }, discountBp: 1500 },
        { id: "biweekly", labels: { fr: "Toutes les 2 semaines", en: "Every 2 weeks" }, discountBp: 1000 },
        { id: "monthly", labels: { fr: "Chaque mois", en: "Every month" }, discountBp: 500 },
        { id: "once", labels: { fr: "Une fois", en: "Once" }, discountBp: 0 },
      ],
    },
  ],
  needs: {
    standard: {
      kind: "estimate",
      baseCents: 4500,
      inputs: [...(ZONES.length > 1 ? ["zone"] : []), "bedrooms", "surface", "frequency"],
    },
  },
};
