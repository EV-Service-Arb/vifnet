// The panel's internal endpoints for vifnet as the suite needs them, on
// `E2E_MOCK_PORT`, under the `/api/internal` that `SITES_PANEL_INTERNAL_URL`
// names in a deploy (kitstart asks `/brands/vifnet/…` below it): the live place adds nothing over the baked
// one (no number, so no call or WhatsApp anywhere), and the price list is
// down, so every price on the page and in the leads file is the baked model's.
// The operator has put every new visitor on booking_provider's b, so a spec
// can see the panel's weights reach the proxy; the rest keep the code's.
//
// Under `/messengers` the same panel answers for a place that offers both
// messengers (MESSENGER-CHANNELS-SPEC §4, the local stack's seed): a
// WhatsApp number and the fake bot `vifnet_devis_bot`. The place has one slug
// only, so it is a second server under test (`MESSENGER_PORT`) that reads this
// base, not a second place; the first server's pages — and the geometry the
// control's specs pin — never see a messenger.
import { createServer } from "node:http";

const port = Number(process.env["E2E_MOCK_PORT"]);
const base = "/api/internal/brands/vifnet";
const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

/** The place as each mode's panel serves it. */
const PLACES = {
  "": {},
  "/messengers": { phone: "+33612345678", whatsapp: "+33612345678", telegram: "vifnet_devis_bot" },
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://mock");
  if (url.pathname === "/health") return json(res, 200, { ok: true });
  const mode = url.pathname.startsWith("/messengers/") ? "/messengers" : "";
  const path = url.pathname.slice(mode.length);
  if (path === `${base}/pricing`) return json(res, 503, { error: "down" });
  if (path === `${base}/locations/vifnet`) return json(res, 200, PLACES[mode]);
  if (path === `${base}/experiments`) return json(res, 200, { experiments: { booking_provider: { weights: [0, 1] } } });
  return json(res, 404, { error: "no such route" });
}).listen(port, "127.0.0.1");
