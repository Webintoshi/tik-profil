import { requirePlatformAdmin } from "../../../../../../../server/auth/platform-admin.ts";
import { createCredentialAcknowledgeRoute } from "../../../../../../../server/business-imports/admin-credential-route-handlers.ts";
import { businessProvisioningService } from "../../../../../../../server/business-imports/provisioning.ts";

export const POST = createCredentialAcknowledgeRoute({
    requireAdmin: () => requirePlatformAdmin(),
    service: businessProvisioningService,
});
