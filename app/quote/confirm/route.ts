import { confirmRoute } from "@/shared/lib/sites-tools/next";
import { leadCaptureText, TEXT } from "@/entities/content";
import { pricing } from "@/shared/config/env";
import { site } from "@/shared/config/site";

/**
 * Where a form posted without a script lands when the price it showed has
 * changed: never cached, it prices the answers afresh and asks to confirm.
 * The home page is ISR, so sending the visitor back there could show the old
 * price again and refuse every resubmit.
 */
export const dynamic = "force-dynamic";

export const GET = confirmRoute(site, { pricing, text: locale => leadCaptureText(TEXT[locale], locale) });
