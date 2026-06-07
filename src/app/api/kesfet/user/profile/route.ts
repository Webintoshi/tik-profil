import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { createCustomerFeatureNotReadyError } from "@/server/auth/customerAccess";
import { loadCustomerAccountProfile } from "@/server/auth/customerProfile";
import { requireCustomer } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const customerSession = await requireCustomer();
        const profile = await loadCustomerAccountProfile(customerSession);

        return NextResponse.json({
            success: true,
            data: profile,
        });
    } catch (error) {
        return AppError.toResponse(error, "kesfet-user-profile");
    }
}

export async function PUT() {
    try {
        await requireCustomer();
        const feature = createCustomerFeatureNotReadyError("Customer profile updates");
        throw AppError.featureNotReady(feature.message);
    } catch (error) {
        return AppError.toResponse(error, "kesfet-user-profile");
    }
}
