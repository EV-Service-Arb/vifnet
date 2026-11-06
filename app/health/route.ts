import { healthRoute } from "@/shared/lib/sites-tools/next";

/** The container's readiness probe. */
export const dynamic = "force-dynamic";

export const GET = healthRoute();
