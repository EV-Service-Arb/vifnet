The landing site of Vifnet, a cleaning business in France that works at the
customer's address and has no storefront of its own.

A Next.js app on [`@evinvest/sites-tools`](https://github.com/EV-Service-Arb/sites_tools/tree/main/ts/kitstart),
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
