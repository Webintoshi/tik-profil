import { after } from "next/server.js";

import { requirePlatformAdmin } from "../../../../../../server/auth/platform-admin.ts";
import { createStartPetshopRoute } from "../../../../../../server/business-imports/admin-import-route-handlers.ts";
import { businessImportService } from "../../../../../../server/business-imports/import-service.ts";

export const POST = createStartPetshopRoute({
    requireAdmin: () => requirePlatformAdmin(),
    service: businessImportService,
    after,
});
