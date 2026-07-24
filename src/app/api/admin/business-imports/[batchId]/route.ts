import { requirePlatformAdmin } from "../../../../../server/auth/platform-admin.ts";
import { createBatchRoute } from "../../../../../server/business-imports/admin-import-route-handlers.ts";
import { businessImportService } from "../../../../../server/business-imports/import-service.ts";

export const GET = createBatchRoute({
    requireAdmin: () => requirePlatformAdmin(),
    service: businessImportService,
});
