import { NextResponse } from "next/server";
import { createNetgsmOtpDeliveryProvider } from "@/server/auth/nativeCustomerAuth/netgsm";
import { createOtpService } from "@/server/auth/nativeCustomerAuth/otp";
import { createQueryBackedOtpChallengeRepository } from "@/server/auth/nativeCustomerAuth/otpRepository";
import { nativeCustomerAuthErrorResponse } from "@/server/auth/nativeCustomerAuth/http";

export const dynamic = "force-dynamic";

async function readBody(request: Request): Promise<{ phone?: unknown }> {
    try {
        return await request.json() as { phone?: unknown };
    } catch {
        return {};
    }
}

export async function POST(request: Request) {
    try {
        const body = await readBody(request);
        const otpService = createOtpService({
            provider: createNetgsmOtpDeliveryProvider(),
            repository: createQueryBackedOtpChallengeRepository(),
        });
        const result = await otpService.start({
            phone: body.phone,
        });

        return NextResponse.json({
            data: result,
            success: true,
        });
    } catch (error) {
        return nativeCustomerAuthErrorResponse(error, "mobile-customer-otp-start");
    }
}
