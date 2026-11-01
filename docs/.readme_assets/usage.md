Start the site:

```sh
nix run .#dev            # http://localhost:59082/fr
```

#### Local stack

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

#### Visual baselines

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
