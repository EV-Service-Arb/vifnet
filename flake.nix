{
  nixConfig = {
    extra-substituters = [ "https://valeratrades.cachix.org" ];
    extra-trusted-public-keys = [ "valeratrades.cachix.org-1:gXVwhzO5YB+BaiEJYT48qZgzdaErGQew6xtZcz4Fo1Q=" ];
  };

  inputs = {
    v_flakes.url = "github:valeratrades/v_flakes?ref=v1.6";
    # sites_tools at the tag of the @evinvest/sites-tools version in
    # package-lock.json — mkLanding refuses a mismatch.
    sites_tools.url = "github:EV-Service-Arb/sites_tools?ref=@evinvest/sites-tools-v0.34.0";
    sites_tools.inputs.v_flakes.follows = "v_flakes";
  };

  # The landing machinery (hermetic build, image, bundle budget, smoke, the checks
  # as particles, apps) is sites_tools' `mkLanding`; what stays here is Vifnet's config,
  # the generated repo files, and the release tag.
  outputs = { self, v_flakes, sites_tools }:
    let
      # vifnet's port in sites' ten of SA_PORT_RANGE: site_conductor's docs/port_range.md
      SA_PORT = 52822;
      inherit (v_flakes) flake-utils pre-commit-hooks;
      manifest = builtins.fromJSON (builtins.readFile ./package.json);
      pname = manifest.name;
    in
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import v_flakes.default_nixpkgs { inherit system; };
        lib = pkgs.lib;
        # v_flakes' own hook scripts run on cargo, which `combine` puts on PATH
        rust = v_flakes.rs.default_nightly system;
        # the container's exposed port and the prod env
        sitePort = "59082";
        prodEnv = import ./deploy/config.nix { port = sitePort; };

        landing = sites_tools.lib.mkLanding {
          inherit pkgs v_flakes sitePort pname prodEnv;
          root = ./.;
          # the e2e build under test, so a `nix run .#dev` is never mistaken for it
          e2ePort = toString (SA_PORT + 5);
          # reads sites_panel and posts leads to the conductor; devops wires both addresses
          connected = true;
          # What `npm run build` reads — not the 81 MB of source photos in
          # assets/profile_images, only the web cuts of them.
          buildFiles = [
            "package.json"
            "package-lock.json"
            "app"
            "src"
            "assets/brand.toml"
            "assets/card.toml"
            "assets/mark.svg"
            "assets/fonts"
            "assets/icons"
            "assets/photos"
            "next.config.ts"
            "tsconfig.json"
            "postcss.config.mjs"
            "proxy.ts"
            "instrumentation.ts"
          ];
          requiredFiles = [ "assets/fonts/Inter-Regular.ttf" ];
          smoke = {
            page = "/fr";
            og = "/og?l=vifnet";
            quote = { location = "vifnet"; subject = "deep"; locality = "83702"; mobile = "+12085550192"; bedrooms = "3"; };
          };
        };


        # ── `nix run .#dev`: mkLanding's, but on $PORT ───────────────────────
        # mkLanding's dev app passes `--port ${sitePort}`, the container's; this one
        # the PORT the dev shell or the conductor's `nix run .#local-stack` sets. The
        # rest of the environment reaches `next dev` as it is (README, "Local stack").
        runDev = pkgs.writeShellApplication {
          name = "${pname}-dev";
          runtimeInputs = with pkgs; [ nodejs_22 git coreutils ];
          text = ''
            cd "$(git rev-parse --show-toplevel)"
            stamp="node_modules/.${pname}-lock"
            want="$(sha256sum package-lock.json | cut -d' ' -f1)"
            if [ "$(cat "$stamp" 2>/dev/null)" != "$want" ]; then
              npm ci
              echo "$want" > "$stamp"
            fi
            exec npm run dev -- --port "''${PORT:?the dev shell sets it, or the caller}"
          '';
        };

        # ── bump the latest remote vX.Y.Z tag and push: `.#publish major|minor|patch [note]` ──
        # The version lives in the tag, not in a file. The tag is the release:
        # `release-container.yml` ships the image on it.
        runPublish = pkgs.writeShellApplication {
          name = "publish";
          runtimeInputs = with pkgs; [ git ];
          text = ''
            part="''${1:-}"
            case "$part" in
              major | minor | patch) ;;
              *) echo "usage: nix run .#publish -- major|minor|patch [release note]" >&2; exit 1 ;;
            esac
            [ -z "$(git status --porcelain)" ] || { echo "uncommitted changes — commit or stash first" >&2; exit 1; }
            shift
            note="$*"

            # Not silenced: computing the next version from a stale tag list is
            # how a release number gets reused, so a failed fetch must be loud.
            git fetch --tags --force origin >/dev/null
            last="$(git tag -l 'v*' --sort=-v:refname | head -n1)"
            ver="''${last#v}"; [ -n "$ver" ] || ver="0.0.0"
            ma="''${ver%%.*}"; rest="''${ver#*.}"; mi="''${rest%%.*}"; pa="''${rest##*.}"
            case "$part" in
              major) ma=$((ma + 1)); mi=0; pa=0 ;;
              minor) mi=$((mi + 1)); pa=0 ;;
              patch) pa=$((pa + 1)) ;;
            esac
            next="v$ma.$mi.$pa"
            echo "''${last:-<no tag>} → $next"

            # Annotated, never lightweight: `push --follow-tags` silently skips
            # lightweight tags, and they have nowhere to put a release note.
            if [ -n "$note" ]; then
              printf '%s\n\n%s\n' "$next" "$note" | git tag -a "$next" -F -
            else
              git tag -a "$next" -m "$next"
            fi
            # The push fires the pre-push hook, so `.#test` gates the release.
            git push origin "$next"
          '';
        };

        # ── generated repo files and the checks ─────────────────────────────
        # `.github/workflows/*`, `.gitignore`, `.envrc` and README.md are written by
        # the devShell from here; edit this file, not them.
        github = v_flakes.github {
          inherit pkgs pname;
          inherit (landing) js;
          enable = true;
          jobs = {
            errors.default = true;
            errors.augment = with landing.particles; [ e2e-typecheck e2e checks container-smoke ];
            warnings.default = true;
            warnings.exclude = [ "code-duplication" ];
            # the copy is one `Text` in two languages, alike line for line
            warnings.augment = [ landing.particles.npm-audit { name = "code-duplication"; args.excludePatterns = [ "src/entities/content/model/{fr,en}.ts" ]; } ];
            other.augment = [ "loc-badge" ];
          };
          containerRelease = { registry = "ghcr.io/ev-service-arb"; };
          figma = { on = "gha"; };
          publishCachix = "valeratrades";
          # e2e compares every PR's render to these by its tolerance; this holds a refresh to CI's render
          visualBaselines = { dir = "tests/e2e/__screenshots__"; render = "accept-test"; paths = [ "tests/e2e/__screenshots__/**" ]; };
          gitignore.extra = ''
            next-env.d.ts
            tests/e2e/node_modules
            test-results/
            playwright-report/'';
        };
        treefmt = (pkgs.formats.toml { }).generate "treefmt.toml" {
          formatter.nix = { command = "nixpkgs-fmt"; includes = [ "*.nix" ]; };
        };
        readme = v_flakes.readme-fw {
          inherit pkgs pname;
          defaults = true;
          lastSupportedVersion = null;
          rootDir = ./.;
          badges = [ "loc" "ci" ];
        };
        combined = v_flakes.utils.combine { inherit rust; modules = [ github readme landing.js ]; };

        # `.#test` on pre-push, not pre-commit: a full run per commit is too slow
        # to survive contact with actual work.
        preCommitBase = v_flakes.files.preCommit { inherit pkgs; };
        pre-commit-check = pre-commit-hooks.lib.${system}.run (preCommitBase // {
          hooks = preCommitBase.hooks // {
            treefmt = preCommitBase.hooks.treefmt // {
              settings = preCommitBase.hooks.treefmt.settings // {
                formatters = [ pkgs.nixpkgs-fmt ];
              };
            };
            test = {
              enable = true;
              name = "nix run .#test";
              entry = lib.getExe github.test;
              pass_filenames = false;
              stages = [ "pre-push" ];
            };
          };
        });
      in
      {
        apps = landing.apps // {
          dev = { type = "app"; program = "${runDev}/bin/${pname}-dev"; };
          publish = { type = "app"; program = "${runPublish}/bin/publish"; };
        };

        inherit (landing) packages checks containers;

        devShells.default = landing.devShell.overrideAttrs (old: {
          shellHook = (old.shellHook or "") + pre-commit-check.shellHook + combined.shellHook + ''
            cp -f ${treefmt} ./.treefmt.toml
          '';
          nativeBuildInputs = (old.nativeBuildInputs or [ ]) ++ [ pkgs.nixpkgs-fmt pkgs.vips ]
            ++ pre-commit-check.enabledPackages ++ combined.enabledPackages;
          env = old.env // { PORT = toString SA_PORT; };
        });
      }
    );
}
