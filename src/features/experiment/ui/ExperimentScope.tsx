"use client";

import { cookieName } from "@evinvest/experiments";
import { ExperimentTracker, readCookie } from "@evinvest/experiments/react";
import type { AnalyticsTarget } from "@/shared/lib/sites-tools";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { QA_COOKIE } from "@/shared/config/experiments";
import { contactOf, experimentEvent, experimentSink } from "../model/events";

export interface ExperimentScopeProps {
  /** Plain data from the server page: the key is read from the container, never inlined. */
  target: AnalyticsTarget;
  placeSlug: string;
  experiment: string;
  /** The variant this page was rendered as — the path's bucket, not the cookie. */
  variant: string;
  /** Whether the experiment runs at all; a disabled one sends nothing. */
  enabled: boolean;
  /** The messengers the card offered (`wa,tg` | `wa` | `tg` | `none`), on every event: an inert test's weeks read apart. */
  channelsAvailable?: string | undefined;
  /** On `lead_form`'s events: the visitor's `lead_channel` arm, and whether that test drew the card instead (`cardArms`). */
  leadChannel?: string | undefined;
  superseded?: boolean | undefined;
  children: ReactNode;
}

/**
 * The experiment's client island around the server-rendered page. It sends
 * `experiment_exposed` once per page view and `experiment_contact` for every
 * call or form intent. Only a
 * browser the proxy assigned (an `ab_<key>` cookie) counts: a crawler gets the
 * same cached control page, runs its script and must not be an exposure.
 */
export function ExperimentScope({ target, placeSlug, experiment, variant, enabled, channelsAvailable, leadChannel, superseded, children }: ExperimentScopeProps) {
  const { key, host, brandId } = target;
  const sink = useMemo(() => experimentSink({ key, host, brandId }, placeSlug), [key, host, brandId, placeSlug]);
  const onEvent = useCallback(
    (event: string, props: Record<string, unknown> = {}) => {
      if (!enabled || readCookie(cookieName(experiment)) === undefined) return;
      const extra = {
        ...(channelsAvailable === undefined ? {} : { channels_available: channelsAvailable }),
        ...(leadChannel === undefined ? {} : { lead_channel: leadChannel }),
        ...(superseded ? { superseded: true } : {}),
      };
      // Any value marks a test visit (`isQaMark`, kept off this client module's imports): it holds the visitor's own arms.
      const mapped = experimentEvent(experiment, event, { ...props, ...extra }, (readCookie(QA_COOKIE) ?? "") !== "");
      if (mapped) sink.capture(mapped[0], mapped[1], { transport: "beacon" });
    },
    [sink, experiment, enabled, channelsAvailable, leadChannel, superseded],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const channel = contactOf(event.target);
      if (channel) onEvent(`${experiment}_contact`, { variant, channel });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [onEvent, experiment, variant]);

  return (
    <ExperimentTracker experiment={experiment} variant={variant} onEvent={onEvent}>
      {children}
    </ExperimentTracker>
  );
}
