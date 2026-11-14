import { kitPage } from "@/shared/lib/sites-tools/next-kit";
import { serverEnv } from "@/shared/config/env";
import { site } from "@/shared/config/site";

/** The review kit's page: every load is a view the conductor leases, never cached. */
export const dynamic = "force-dynamic";

export default kitPage(site, { env: serverEnv });
