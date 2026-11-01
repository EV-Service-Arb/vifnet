# vifnet
![Lines Of Code](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/valeratrades/b48e6f02c61942200e7d1e3eeabf9bcb/raw/vifnet-loc.json)
<br>
[<img alt="ci errors" src="https://img.shields.io/github/actions/workflow/status/EV-Service-Arb/vifnet/errors.yml?branch=main&style=for-the-badge&style=flat-square&label=errors&labelColor=420d09" height="20">](https://github.com/EV-Service-Arb/vifnet/actions?query=branch%3Amain) <!--NB: Won't find it if repo is private-->
[<img alt="ci warnings" src="https://img.shields.io/github/actions/workflow/status/EV-Service-Arb/vifnet/warnings.yml?branch=main&style=for-the-badge&style=flat-square&label=warnings&labelColor=d16002" height="20">](https://github.com/EV-Service-Arb/vifnet/actions?query=branch%3Amain) <!--NB: Won't find it if repo is private-->

The landing site of Vifnet, a cleaning business in France that works at the
customer's address and has no storefront of its own.

A Next.js app on [`@evinvest/kitstart`](https://github.com/EV-invest/lib/tree/main/ts/kitstart),
the machinery the Service-Arb landings share (routing, the place model and its
publication gate, the quote form and its lead store, SEO), built to the Figma
file `1wXlPmnmOdKYPDWz6N5EB8`, band for band: header, hero with the quote
card, stats, services, reviews, guarantee, FAQ, the gold CTA band, footer and
the sticky bar — and its three sub-pages, `/prices`, `/guarantee` and
`/about`. French by default, English beside it.

There is no domain and no public phone number yet, so every page is `noindex`,
`robots.txt` disallows everything, the sitemap is empty and the quote form
and its "call me back" are the only channels until the panel gives the
place a number. The facts still missing are listed once, in `OWNER_TODO`
(`src/shared/config/site.ts`); giving the site a domain while a launch-blocking
one is open fails the build. One of them is the design's sample content — the
rating, the reviews, the prices and the stock photos the
page shows as the Figma file has them — which the owner replaces before a
launch.
<!-- markdownlint-disable -->
<details>
<summary>
<h2>Installation</h2>
</summary>

The repo builds with Nix. Determinate Nix with `lazy-trees = true` is required.

```sh
nix develop
```

This gives you Node 22, Playwright with its pinned browsers and vips, and
writes the generated files — `.github/workflows/`, `.gitignore`,
`.treefmt.toml` and this README — from `flake.nix`. Edit the flake and
`docs/.readme_assets/`, not them.

Plain npm works for the app itself:

```sh
npm ci && npm run typecheck && npm run lint && npx vitest run && npm run build && npm run size && npm start
```

</details>
<!-- markdownlint-restore -->

## Usage
Start the site:

```sh
nix run .#dev            # http://localhost:59082/fr
```

##### Local stack

The Service-Arb panel's `nix run .#local-stack` starts this site with
`nix run .#dev` (or `npm run dev`) and the environment below. `next dev` reads
it as it is; without any of it the site runs as it does alone.

| Variable | What it does | Unset |
| --- | --- | --- |
| `PORT` | the dev server's port | 59082 (`nix run .#dev`), 3000 (`npm run dev`) |
| `SITES_PANEL_INTERNAL_URL` | sites_panel's internal API (devops sets it from the contract); the place source, `GET <url>/brands/vifnet/locations/vifnet?locale=fr`: its phone shows on every surface — header, menu, FAQ, gold band, footer, sticky bar — and the quote card offers the call (and WhatsApp, when given). The same API serves the price list, `GET <url>/brands/vifnet/pricing`, which overrides the baked one whole, and the experiments' weights and kill switches, `GET <url>/brands/vifnet/experiments` (docs/EXPERIMENTS.md) | the baked place: no number anywhere, no call or WhatsApp; the baked price list; the experiments as coded |
| `LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_KEY_ID`, `LEAD_WEBHOOK_SECRET` | each lead to the panel as a signed `lead.created`; all three or none, and `http:` only to localhost or a `*.svc` host | off |
| `LEADS_DB_PATH` | the SQLite leads file (and the webhook's outbox) | `~/.local/share/vifnet/leads.db` |
| `POSTHOG_KEY` (`POSTHOG_HOST`) | analytics and the experiments' events — their results are read in PostHog (docs/EXPERIMENTS.md) | off |

Run the checks:

```sh
nix run .#test           # tsc, lint (eslint + steiger), vitest, build, size, Playwright
nix run .#size           # first-load JS against tests/bundle_budget.txt — the one hard gate
nix flake check          # the hermetic Nix build and the budget against it
```

Build the server and the container image:

```sh
nix build                # the standalone server
nix build .#container    # OCI image, on Linux
nix run .#container-smoke  # boot it and hold it to its contract (Linux + docker)
```

The image listens on 59082 and keeps leads in `/data`. Its settings come from
`deploy/config.nix`. Pushing a `v*` tag builds the image and publishes it to
`ghcr.io/service-arb/vifnet`: `nix run .#publish` makes the tag.

The palette is `assets/brand.toml`; `npm run palette` regenerates
`app/brand.css` from it, and a test fails when the two disagree. The photos on
the page are cut from `assets/profile_images/` by
`nix shell nixpkgs#vips -c npm run photos`; a test fails when the committed
cuts and `scripts/photos.ts` disagree.

##### Visual baselines

Screenshot baselines are Linux's, because CI is: a mac rasterises glyphs
differently, so locally the pixel comparison is skipped. To refresh them after
changing a section:

1. Run the **Visual baselines** workflow on the branch
   (`gh workflow run visual-baselines.yml --ref <branch>`). Before that workflow
   exists on `main`, a CI run of **Errors** on the branch writes any missing
   baseline and publishes the same artifact.
2. `gh run download <run-id> -n visual-snapshots -D tests/e2e/__screenshots__`
3. Look at the images, then commit them alone:
   `test: refresh visual baselines (run <run-id>)`.

`nix run .#help` prints the list of commands.

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


<br>

<sup>
	This repository follows <a href="https://github.com/valeratrades/.github/tree/master/best_practices">my best practices</a> and <a href="https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md">Tiger Style</a> (except "proper capitalization for acronyms": (VsrState, not VSRState) and formatting). For project's architecture, see <a href="./docs/ARCHITECTURE.md">ARCHITECTURE.md</a>.
</sup>

#### License

<sup>
	Licensed under <a href="LICENSE">Blue Oak 1.0.0</a>
</sup>

<br>

<sub>
	Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this crate by you, as defined in the Apache-2.0 license, shall
be licensed as above, without any additional terms or conditions.
</sub>

