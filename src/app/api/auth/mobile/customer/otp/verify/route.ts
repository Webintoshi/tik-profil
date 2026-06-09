import { NextResponse } from "next/server";
import { setCustomerSessionCookie } from "@/server/auth/logto/session";
import { createNetgsmOtpDeliveryProvider } from "@/server/auth/nativeCustomerAuth/netgsm";
import { createOtpService } from "@/server/auth/nativeCustomerAuth/otp";
import { createQueryBackedOtpChallengeRepository } from "@/server/auth/nativeCustomerAuth/otpRepository";
import { createNativeCustomerProvisioningService } from "@/server/auth/nativeCustomerAuth/provisioning";
import { createQueryBackedNativeCustomerProvisioningRepository } from "@/server/auth/nativeCustomerAuth/provisioningRepository";
import { createNativeCustomerSessionToken } from "@/server/auth/nativeCustomerAuth/session";
import { nativeCustomerAuthErrorResponse } from "@/server/auth/nativeCustomerAuth/http";

export const dynamic = "force-dynamic";

async function readBody(request: Request): Promise<{ code?: unknown; phone?: unknown }> {
    try {
        return await request.json() as { code?: unknown; phone?: unknown };
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
        const verifiedOtp = await otpService.verify({
            code: body.code,
            phone: body.phone,
        });
        const provisioning = await createNativeCustomerProvisioningService({
            repository: createQueryBackedNativeCustomerProvisioningRepository(),
        }).provision({
            displayName: null,
            email: null,
            phone: verifiedOtp.phone.e164,
            provider: "native_otp",
            providerUserId: verifiedOtp.providerUserId,
        });
        const token = await createNativeCustomerSessionToken({
            appUserId: provisioning.appUser.id,
            authProvider: "native_otp",
            displayName: provisioning.displayName,
            email: provisioning.email,
            subject: provisioning.providerUserId,
        });
        const response = NextResponse.json({
            data: {
                actorType: "customer",
                appUserId: provisioning.appUser.id,
                displayName: provisioning.displayName,
                email: provisioning.email,
                logtoSub: provisioning.providerUserId,
                phone: provisioning.phone,
                provider: "native_otp",
                role: "customer",
                success: true,
            },
            success: true,
        });

        setCustomerSessionCookie(response, token);

        return response;
    } catch (error) {
        return nativeCustomerAuthErrorResponse(error, "mobile-customer-otp-verify");
    }
}
