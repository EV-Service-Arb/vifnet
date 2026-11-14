import { kitPhotoRoute } from "@/shared/lib/sites-tools/next";
import { serverEnv } from "@/shared/config/env";

export const dynamic = "force-dynamic";

export const GET = kitPhotoRoute({ env: serverEnv });
