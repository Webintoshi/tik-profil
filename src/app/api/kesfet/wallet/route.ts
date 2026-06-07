import { AppError } from "@/lib/errors";
import { createCustomerFeatureNotReadyError } from "@/server/auth/customerAccess";
import { requireCustomer } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await requireCustomer();
        const feature = createCustomerFeatureNotReadyError("Customer wallet");
        throw AppError.featureNotReady(feature.message);
    } catch (error) {
        return AppError.toResponse(error, "kesfet-wallet");
    }
}
