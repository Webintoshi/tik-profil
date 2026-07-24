import { requirePlatformAdmin } from "../../../../../../server/auth/platform-admin.ts";
import { createProvisionBatchRoute } from "../../../../../../server/business-imports/admin-import-route-handlers.ts";
import { businessProvisioningService } from "../../../../../../server/business-imports/provisioning.ts";

export const POST = createProvisionBatchRoute({
    requireAdmin: () => requirePlatformAdmin(),
    service: businessProvisioningService,
});
