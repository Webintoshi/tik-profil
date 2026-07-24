import { requirePlatformAdmin } from "../../../../../../../server/auth/platform-admin.ts";
import { createCandidateReviewRoute } from "../../../../../../../server/business-imports/admin-import-route-handlers.ts";
import { businessImportService } from "../../../../../../../server/business-imports/import-service.ts";

export const PATCH = createCandidateReviewRoute({
    requireAdmin: () => requirePlatformAdmin(),
    service: businessImportService,
});
