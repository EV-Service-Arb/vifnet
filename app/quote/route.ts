import { quoteRoute } from "@/shared/lib/sites-tools/next";
import { after } from "next/server";
import { TEXT } from "@/entities/content";
import { experimentSink, withExperimentLead, witnessedDefer } from "@/features/experiment/server";
import { liveExperiments, notifier, pricing, serverEnv, webhook } from "@/shared/config/env";
import { QA_COOKIE } from "@/shared/config/experiments";
import { ANCHORS } from "@/shared/config/nav";
import { site } from "@/shared/config/site";

/** The no-JS path: a plain form POST answered with a 303. */
export const dynamic = "force-dynamic";

const route = quoteRoute(site, {
  env: serverEnv,
  // A QA browser's lead_form_submit says forced: true, as its page events do.
  qaCookie: QA_COOKIE,
  notifier,
  webhook,
  // The server prices an estimate itself, from the posted answers: a posted amount is never read.
  pricing,
  defer: witnessedDefer(after),
  // A refusal lands back on the card. LeadCapture posts its id (`card`) too;
  // this covers a post without it — a page cached before kitstart 0.9.0.
  anchor: ANCHORS.quote,
  unavailable: locale => {
    const t = TEXT[locale];
    const f = { place: site.brand.name, phone: site.brand.phone };
    return { title: t.serverError.title, heading: t.serverError.headline.join(""), body: t.serverError.body(f), callLabel: t.callLabel(f) };
  },
});

export const POST = withExperimentLead(route, {
  defer: after,
  experiments: liveExperiments,
  sink: () => {
    const env = serverEnv();
    return experimentSink({ key: env.posthogKey, host: env.posthogHost, brandId: site.brand.id }, null);
  },
});
