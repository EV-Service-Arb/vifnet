## Layout

```text
app/             Next routes, each a few lines over a kitstart factory: pages under
                 [locale]/[location], /quote (and its /booking, /confirm), /og, /health, /.well-known/sa-site,
                 robots, sitemap, the global 404
src/             the site in Feature-Sliced layers (shared → entities → features → widgets → views);
                 widgets/ are named after the Figma frames (hero, before-after, services, …)
assets/          brand.toml (the palette), card.toml (contact facts), the mark and lock-up,
                 fonts/, profile_images/ (the portfolio) and photos/ (its web cuts)
scripts/         photos.ts: the AVIF/WebP cuts of the portfolio
tests/           vitest; tests/e2e/ Playwright; bundle_budget.txt
deploy/          production config, authored in Nix
nix/             the generated CI workflows' source
```
