# The prod environment of the server, baked into the image as plain env
# (flake.nix: `prodEnv`). Secret-free: SMTP_URL and SMS_TOKEN (and
# LEAD_NOTIFY_TO/FROM when used) arrive from the container environment a
# Secret injects. So do LEAD_WEBHOOK_URL, LEAD_WEBHOOK_KEY_ID and
# LEAD_WEBHOOK_SECRET, together: the URL alone fails boot, and it is not set
# here because without it the lead webhook is simply off. POSTHOG_KEY is not a
# secret: a project's ingest token is public by design — every page view
# carries it to the browser.
#
# Explicit because the defaults are dev's: without HOSTNAME the standalone
# server binds one interface the readiness probe may not reach; without
# LEADS_DB_PATH or TRUSTED_PROXY the server refuses to start in production
# (instrumentation.ts), so the pod never turns ready rather than losing a lead
# or counting the wrong address against the rate limit.
{ port }:
{
  # The mount, not $HOME. Leads are the only durable state this service has.
  LEADS_DB_PATH = "/data/leads.db";
  # "cloudflare" is right only when the origin cannot be reached around the
  # tunnel (no public port, no ingress of its own): then CF-Connecting-IP is
  # the visitor. If anything else can reach the pod, a client could write that
  # header itself — use "xff:<n>" for the n proxies of yours in front instead.
  TRUSTED_PROXY = "cloudflare";
  HOSTNAME = "0.0.0.0";
  PORT = toString port;
  NODE_ENV = "production";
  NEXT_TELEMETRY_DISABLED = "1";
  # PostHog Cloud US, project 614067, shared by the EV fronts; brands are told
  # apart by `brand_id`. The experiments (docs/EXPERIMENTS.md) read it too.
  POSTHOG_KEY = "phc_sBwWEgdgockVmfyucBRkTTo6iZ4Y2eApSGorD22WLzj3";
  POSTHOG_HOST = "https://us.i.posthog.com";
  # sites_panel's internal API for this brand, inside the cluster
  # (the NetworkPolicy admits vifnet → sites-panel:59121): the live place
  # (`/locations/vifnet`) and the price list (`/pricing`). Not a secret. Until
  # the panel has them set it answers `{}`, and the page shows the baked
  # place and prices, as it does when the panel is down.
  LOCATIONS_API_URL = "http://sites-panel.service-arb.svc.cluster.local:59121/api/internal/brands/vifnet";
}
