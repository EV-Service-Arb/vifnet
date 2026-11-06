import { bookingRoute } from "@/shared/lib/sites-tools/next";
import { serverEnv, webhook } from "@/shared/config/env";

/**
 * A priced lead's booking request (`booking.requested@1`), posted by the
 * card when the visitor opens a booking page or sends a `manual` preference.
 * Queued on the lead webhook's outbox only under `PANEL_BOOKING`; off, it is
 * answered and dropped.
 */
export const dynamic = "force-dynamic";

export const POST = bookingRoute({ env: serverEnv, webhook });
