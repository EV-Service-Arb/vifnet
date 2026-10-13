{
  nixConfig = {
    extra-substituters = [ "https://valeratrades.cachix.org" ];
    extra-trusted-public-keys = [ "valeratrades.cachix.org-1:gXVwhzO5YB+BaiEJYT48qZgzdaErGQew6xtZcz4Fo1Q=" ];
  };

  inputs = {
    v_flakes.url = "github:valeratrades/v_flakes?ref=v1.6";
    # The lib flake at the tag of the @evinvest/kitstart version in
    # package-lock.json — mkLanding refuses a mismatch.
    ev.url = "github:EV-invest/lib?ref=@evinvest/kitstart-v0.18.0";
    ev.inputs.v_flakes.follows = "v_flakes";
  };

  # The landing machinery (hermetic build, image, bundle budget, smoke, dev and
  # test apps) is the lib's `mkLanding`; what stays here is Vifnet's config,
  # the generated repo files, and the release tag.
  outputs = { self, v_flakes, ev }:
    let
      inherit (v_flakes) flake-utils pre-commit-hooks;
      manifest = builtins.fromJSON (builtins.readFile ./package.json);
      pname = manifest.name;
    in
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import v_flakes.default_nixpkgs { inherit system; };
        lib = pkgs.lib;
        # aquafix is on 59081.
        sitePort = "59082";
        prodEnv = import ./deploy/config.nix { port = sitePort; };

        landing = ev.lib.mkLanding {
          inherit pkgs v_flakes sitePort pname prodEnv;
          root = ./.;
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


        # ── `nix run .#dev`: mkLanding's, but on $PORT when it is set ─────────
        # mkLanding's dev app passes `--port ${sitePort}`, which beats the PORT
        # `next dev` would read; a local stack starting this site beside others
        # (the panel's `nix run .#local-stack`) must choose the port. The rest
        # of the environment reaches `next dev` as it is (README, "Local stack").
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
            exec npm run dev -- --port "''${PORT:-${sitePort}}"
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

        # ── generated repo files ────────────────────────────────────────────
        # `.github/workflows/*`, `.gitignore`, `.treefmt.toml` and README.md are
        # written by the devShell from here; edit this file, not them.
        workflows = import ./nix/workflows.nix { inherit pkgs; };
        # v_flakes' own generators for what is not language-specific: the
        # container release on a `v*` tag, the LoC badge and the Claude review.
        # Its `github` module would add Rust jobs and require a Rust toolchain.
        sharedWorkflows = v_flakes.workflows {
          inherit pkgs pname;
          jobsErrors = [ ];
          jobsWarnings = [ ];
          jobsOther = [ "loc-badge" ];
          containerRelease = { registry = "ghcr.io/service-arb"; };
          claude = true;
        };
        gitignore = v_flakes.files.gitignore {
          inherit pkgs;
          langs = [ "js" ];
          extra = ''
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
        generateRepoFiles = ''
          mkdir -p .github/workflows
          ${v_flakes.utils.unwrapShellHook sharedWorkflows.shellHook}
          ${workflows.shellHook}
          cp -f ${gitignore} ./.gitignore
          cp -f ${treefmt} ./.treefmt.toml
          ${v_flakes.utils.unwrapShellHook readme.shellHook}
        '';

        # The same writes without entering the shell (and without its hook installs).
        runGenerate = pkgs.writeShellApplication {
          name = "generate";
          runtimeInputs = with pkgs; [ git coreutils gnused gnugrep ];
          text = ''
            cd "$(git rev-parse --show-toplevel)"
            ${generateRepoFiles}
          '';
        };

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
              entry = landing.apps.test.program;
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
          generate = { type = "app"; program = "${runGenerate}/bin/generate"; };
        };

        inherit (landing) packages checks containers;

        devShells.default = landing.devShell.overrideAttrs (old: {
          shellHook = (old.shellHook or "") + pre-commit-check.shellHook + ''
            # Generated files are written only from the repo root, and never in
            # CI, where the checkout is the thing under test.
            if [ -z "''${CI:-}" ] && [ "$PWD" = "$(git rev-parse --show-toplevel 2>/dev/null)" ]; then
              ${generateRepoFiles}
            fi
          '';
          nativeBuildInputs = (old.nativeBuildInputs or [ ]) ++ [ pkgs.treefmt pkgs.nixpkgs-fmt pkgs.vips ]
            ++ pre-commit-check.enabledPackages ++ readme.enabledPackages;
          # Where CI links the flake's `@playwright/test` for the e2e specs' tsc.
          E2E_PLAYWRIGHT_MODULES = "${pkgs.playwright-test}/lib/node_modules";
        });
      }
    );
}
