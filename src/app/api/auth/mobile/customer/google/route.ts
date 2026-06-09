import { NextResponse } from "next/server";
import { setCustomerSessionCookie } from "@/server/auth/logto/session";
import {
    verifyGoogleCustomerIdToken,
} from "@/server/auth/nativeCustomerAuth/google";
import {
    invalidGoogleTokenResponse,
    nativeCustomerAuthErrorResponse,
} from "@/server/auth/nativeCustomerAuth/http";
import { NativeCustomerAuthError } from "@/server/auth/nativeCustomerAuth/errors";
import { createNativeCustomerProvisioningService } from "@/server/auth/nativeCustomerAuth/provisioning";
import { createQueryBackedNativeCustomerProvisioningRepository } from "@/server/auth/nativeCustomerAuth/provisioningRepository";
import { createNativeCustomerSessionToken } from "@/server/auth/nativeCustomerAuth/session";

export const dynamic = "force-dynamic";

async function readBody(request: Request): Promise<{ actor?: unknown; idToken?: unknown }> {
    try {
        return await request.json() as { actor?: unknown; idToken?: unknown };
    } catch {
        return {};
    }
}

export async function POST(request: Request) {
    try {
        const body = await readBody(request);

        if (body.actor !== "customer") {
            return NextResponse.json(
                {
                    code: "ACTOR_FORBIDDEN",
                    error: "Bu giris sadece musteri icindir.",
                    success: false,
                },
                { status: 403 },
            );
        }

        if (typeof body.idToken !== "string" || !body.idToken.trim()) {
            return NextResponse.json(
                {
                    code: "GOOGLE_TOKEN_REQUIRED",
                    error: "Google oturumu gerekli.",
                    success: false,
                },
                { status: 401 },
            );
        }

        let googleClaims;
        try {
            googleClaims = await verifyGoogleCustomerIdToken({
                idToken: body.idToken,
            });
        } catch (error) {
            if (error instanceof NativeCustomerAuthError) {
                throw error;
            }

            return invalidGoogleTokenResponse();
        }

        const provisioning = await createNativeCustomerProvisioningService({
            repository: createQueryBackedNativeCustomerProvisioningRepository(),
        }).provision({
            avatarUrl: googleClaims.avatarUrl,
            displayName: googleClaims.displayName,
            email: googleClaims.email,
            phone: null,
            provider: "google",
            providerUserId: googleClaims.providerUserId,
        });
        const token = await createNativeCustomerSessionToken({
            appUserId: provisioning.appUser.id,
            authProvider: "google",
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
                provider: "google",
                role: "customer",
                success: true,
            },
            success: true,
        });

        setCustomerSessionCookie(response, token);

        return response;
    } catch (error) {
        return nativeCustomerAuthErrorResponse(error, "mobile-customer-google");
    }
}
