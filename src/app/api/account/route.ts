import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { requireCustomer } from "@/server/auth/guards";
import { loadCustomerAccountProfile } from "@/server/auth/customerProfile";

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
        return AppError.toResponse(error, "account");
    }
}
