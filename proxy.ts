import { cookieName, forcedVariant } from "@evinvest/experiments";
import { abProxy } from "@evinvest/experiments/next";
import { createRouting, parsePlaceParam } from "@/shared/lib/sites-tools";
import { createProxy, GONE_HEADER, LANG_COOKIE } from "@/shared/lib/sites-tools/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { liveExperiments } from "@/shared/config/env";
import { EXPERIMENTS, type ExperimentKey, FORCE_PARAM, type LiveExperiments, QA_COOKIE, QA_PAUSED_COOKIE } from "@/shared/config/experiments";
import { site } from "@/shared/config/site";
import { assignedBy, type Bucket, bucketSuffix, isBot, isQaMark, parseLocation, parseQaSnapshot, pausedOf, qaSnapshot, runningOf, storedArms } from "@/shared/lib/experiments";

const kitstart = createProxy(site);
const routing = createRouting(site);
const KEYS = Object.keys(EXPERIMENTS) as ExperimentKey[];
const ASSIGNMENT_MAX_AGE = 60 * 60 * 24 * 30;

/** `/<locale>/<place param>`: a place's home page, the one page with experiments. */
function homeOf(pathname: string): { locale: string; param: string } | null {
  const [, locale = "", param = "", ...rest] = pathname.split("/");
  if (rest.length || !site.i18n.isLocale(locale) || !param) return null;
  return { locale, param };
}

function withoutGoneHeader(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete(GONE_HEADER);
  return headers;
}

/**
 * kitstart's routing, then the home page's experiments under the panel's
 * overrides (`liveExperiments`): `abProxy` assigns the sticky `ab_<key>`
 * cookies (bots skipped), and the visitor is rewritten to the bucket's own
 * path — `/fr/_vifnet~lead_form.b~booking_provider.a`, every experiment
 * that runs spelt out — so every bucket is an ISR entry and no page reads the
 * request or the panel.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const home = homeOf(url.pathname);

  // A bucket's path, as this proxy wrote it (Next may run the proxy again on
  // a rewrite target): served as it is, unless it names an experiment the
  // panel has since switched off — that one is dropped, so a cached page of
  // a stopped test is never served again. kitstart would call it a dead path.
  const internal = home?.param.includes("~") ? parseLocation(home.param) : null;
  if (home && internal && site.placeSlugs.includes(parsePlaceParam(internal.place).slug)) {
    const headers = withoutGoneHeader(request);
    const suffix = bucketSuffix(runningOf(await liveExperiments(), internal.bucket));
    if (`${internal.place}${suffix}` === home.param) return NextResponse.next({ request: { headers } });
    return NextResponse.rewrite(new URL(`/${home.locale}/${internal.place}${suffix}${url.search}`, url), { request: { headers } });
  }

  const routed = kitstart(request);
  const decision = routing.decide({
    host: request.headers.get("host") ?? url.host,
    pathname: url.pathname,
    query: url.searchParams,
    acceptLanguage: request.headers.get("accept-language"),
    cookieLang: request.cookies.get(LANG_COOKIE)?.value ?? null,
  });
  if (decision.kind !== "serve" || !homeOf(decision.pathname) || isBot(request.headers.get("user-agent"))) return routed;

  const live = await liveExperiments();
  const sent = storedArms(name => request.cookies.get(name)?.value);
  const visit = qaVisitOf(live, request, sent);
  // A running test the snapshot cannot give back goes, so `abProxy` draws it afresh.
  for (const key of visit.redrawn) request.cookies.delete(cookieName(key));
  // Draws an arm into `request.cookies` for every running test the visitor has
  // none of; no force here — a forced arm is the URL's, laid over these below.
  abProxy(live, request);
  const qa = qaState(request, visit);
  const { assigned: bucket } = assignedBy(live, name => request.cookies.get(name)?.value);
  const suffix = bucketSuffix(bucket);
  const response = suffix ? NextResponse.rewrite(new URL(`${decision.pathname}${suffix}${url.search}`, url), { request: { headers: withoutGoneHeader(request) } }) : routed;

  // Only what changed against what the browser sent: a visitor who is not QA
  // and has every arm gets no cookie at all.
  const stored = storedArms(name => request.cookies.get(name)?.value);
  for (const key of KEYS) {
    const value = stored[key];
    if (value !== undefined && value !== sent[key]) response.cookies.set(cookieName(key), value, { path: "/", maxAge: ASSIGNMENT_MAX_AGE, sameSite: "lax" });
  }
  // Sent on every forced visit, unchanged or not: QA lasts 30 days from the last force.
  if (qa.kind === "forced") response.cookies.set(QA_COOKIE, qa.snapshot, { path: "/", maxAge: ASSIGNMENT_MAX_AGE, sameSite: "lax" });
  // A forced visit is QA already: its menu mounts on this very page.
  if (qa.kind === "forced" || qa.kind === "kept") {
    pausedForQa(request, response, live);
  } else if (qa.kind === "left") {
    response.cookies.set(QA_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
    if (request.cookies.has(QA_PAUSED_COOKIE)) response.cookies.set(QA_PAUSED_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
  }
  return response;
}

/** `QA_COOKIE`'s value before it held a snapshot. */
const LEGACY_QA_MARK = "1";

type QaState = { kind: "none" } | { kind: "forced"; snapshot: string } | { kind: "kept" } | { kind: "left" };

/** What a home page request is to QA, read before `abProxy` draws anything. */
interface QaVisit {
  /** The URL's valid forces. */
  forced: Bucket;
  /** The visitor's own arms from `QA_COOKIE`; `null` when the browser is not QA. */
  saved: Bucket | null;
  /** Whether the site itself led here ({@link fromInsideSite}). */
  inSite: boolean;
  /** Whether this request ends QA ({@link leavesQa}). */
  leaves: boolean;
  /** The running tests whose cookie goes before `abProxy`, to be drawn afresh. */
  redrawn: ExperimentKey[];
}

/**
 * `sent`: the `ab_<key>` the browser sent. Leaving QA, a running test the
 * snapshot lacks is drawn afresh: whatever its cookie holds may be a forced
 * arm, and kept it would count as real traffic once the mark is gone. Under
 * the legacy mark `1` (no snapshot) that is every running test. A paused
 * test's cookie stays: a pause keeps every visitor's arm.
 */
function qaVisitOf(live: LiveExperiments, request: NextRequest, sent: Bucket): QaVisit {
  const params = request.nextUrl.searchParams;
  const forcedArms: Record<string, string> = {};
  for (const key of KEYS) {
    const variant = forcedVariant(live, key, params.get(`${FORCE_PARAM}${key}`));
    if (variant !== undefined) forcedArms[key] = variant;
  }
  // Each value is `forcedVariant`'s, one of its key's variants.
  const forced = forcedArms as Bucket;
  const mark = request.cookies.get(QA_COOKIE)?.value;
  const saved = isQaMark(mark) ? parseQaSnapshot(mark) : null;
  const inSite = fromInsideSite(request);
  const leaves = saved !== null && !Object.keys(forced).length && leavesQa(live, inSite, sent);
  const running = KEYS.filter(key => live[key].enabled !== false);
  // The pre-snapshot mark `1` holds no own arm and its cookies may be forced:
  // its next force draws them afresh, or the snapshot would save forced arms
  // as the visitor's own and leaving QA would count them as real.
  const unsaved = mark === LEGACY_QA_MARK && Object.keys(forced).length > 0;
  const redrawn = leaves ? running.filter(key => saved[key] === undefined) : unsaved ? running : [];
  return { forced, saved, inSite, leaves, redrawn };
}

/**
 * The QA side of a home page request, applied to `request.cookies` (the
 * bucket of this render, and what events and the lead's post read off
 * `ab_<key>` after it); `request.cookies` must already hold `abProxy`'s draw.
 *
 * A forced request takes the URL's arms. A test the URL does not name takes,
 * coming from inside the site, its current cookie: after the logo or the
 * language switch the URL has lost the earlier forces, and the menu's tap
 * adds only its own key, so going by the snapshot would undo the others
 * unasked. Coming from outside, the URL is the whole state — an unnamed test
 * is the visitor's own, so `?ab_lead_channel=a` typed after `?ab_lead_form=b`
 * puts lead_form back.
 *
 * The visitor's own arms are the snapshot in `QA_COOKIE`, taken on the first
 * forced visit (after `abProxy` drew a newcomer's) and never retaken while it
 * lasts, since by then `ab_<key>` holds forced arms. A key the snapshot lacks
 * (a test switched on mid-QA) is taken from the cookie as it stands: no force
 * has touched it yet. The legacy `1` holds no arm and its cookies may be
 * forced, so a force draws the running tests afresh first ({@link qaVisitOf})
 * and saves that draw.
 *
 * The home page with no force keeps QA when the site itself led there (the
 * logo, the language switch, Next's own RSC fetches and prefetches), so a
 * variant can be checked in another language. It ends QA ({@link leavesQa})
 * on an outside entry or the menu's Reset: the own arms come back and the
 * mark goes, the menu with it. A paused test's arm is restored too: a pause
 * keeps every visitor's `ab_<key>`.
 */
function qaState(request: NextRequest, visit: QaVisit): QaState {
  const { forced, saved, inSite, leaves } = visit;
  if (!Object.keys(forced).length) {
    if (saved === null) return { kind: "none" };
    if (!leaves) return { kind: "kept" };
    setArms(request, saved);
    return { kind: "left" };
  }
  const current = storedArms(name => request.cookies.get(name)?.value);
  const own: Bucket = { ...current, ...saved };
  setArms(request, { ...(inSite ? current : own), ...forced });
  return { kind: "forced", snapshot: qaSnapshot(own) };
}

/**
 * Whether a navigation comes from inside the site: `Sec-Fetch-Site`
 * `same-origin` — the logo, the language switch, the menu's taps, Next's RSC
 * fetches and prefetches — or `same-site`. `none` (typed, a bookmark, a
 * reload of such a URL), `cross-site` (a link from another site) and no
 * header at all (a browser too old to send it; leaving QA was the owner's
 * first ask) are from outside.
 */
function fromInsideSite(request: NextRequest): boolean {
  const from = request.headers.get("sec-fetch-site");
  return from === "same-origin" || from === "same-site";
}

/**
 * Whether a QA browser's home page request with no force ends QA: one from
 * outside the site ({@link fromInsideSite}), or the menu's Reset.
 *
 * Reset is a same-origin `location.replace`: kitstart's
 * `abReset("reassign")` drops every `ab_<key>` and keeps the mark, and no
 * other path sends a live mark without a single running test's arm. With no
 * test running at all that says nothing, so it is not read as Reset. `sent`
 * is read before `abProxy`, which would draw them again.
 */
function leavesQa(live: LiveExperiments, inSite: boolean, sent: Bucket): boolean {
  if (!inSite) return true;
  const running = KEYS.filter(key => live[key].enabled !== false);
  return running.length > 0 && running.every(key => sent[key] === undefined);
}

function setArms(request: NextRequest, bucket: Bucket): void {
  for (const key of KEYS) {
    const value = bucket[key];
    if (value !== undefined) request.cookies.set(cookieName(key), value);
  }
}

/**
 * A QA browser — forced now, or kept QA (the caller checks) — learns which tests the panel has paused (`QA_PAUSED_COOKIE`),
 * for its menu. Only the paused list: a pause keeps every visitor's
 * `ab_<key>`, so a test switched back on carries on with the same arms.
 * Nobody else gets a cookie from this.
 */
function pausedForQa(request: NextRequest, response: NextResponse, live: LiveExperiments): void {
  const paused = pausedOf(live).join(",");
  if (paused) response.cookies.set(QA_PAUSED_COOKIE, paused, { path: "/", sameSite: "lax" });
  else if (request.cookies.has(QA_PAUSED_COOKIE)) response.cookies.set(QA_PAUSED_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
}

export const config = {
  // A literal: Next reads it statically. Everything but the build output,
  // files included: `decide` passes the routes outside `[locale]` and
  // `site.publicFiles`, and sends any other path to the 404.
  matcher: ["/((?!_next/).*)"],
};
