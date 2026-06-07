import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, validateOrThrow } from "@/lib/errors";
import { isLogtoAuthEnabled, resolveLogtoConfig } from "@/server/auth/logto/config";
import { createLogtoCustomerProvisioningService } from "@/server/auth/logto/customerProvisioning";
import { createQueryBackedLogtoCustomerProvisioningRepository } from "@/server/auth/logto/customerProvisioningRepository";
import {
    createLogtoMobileCustomerSessionService,
    LogtoMobileCustomerSessionError,
    verifyLogtoMobileCustomerIdToken,
} from "@/server/auth/logto/mobileCustomerSession";
import {
    clearAllLocalSessionCookies,
    createLogtoCustomerSessionToken,
    setCustomerSessionCookie,
} from "@/server/auth/logto/session";

const requestSchema = z.object({
    actor: z.string().optional(),
    idToken: z.string().optional(),
});

export const dynamic = "force-dynamic";

function toSessionErrorResponse(error: LogtoMobileCustomerSessionError) {
    switch (error.statusCode) {
        case 401:
            return AppError.unauthorized(error.message).toResponse();
        case 403:
            return AppError.forbidden(error.message).toResponse();
        case 409:
            return AppError.conflict(error.message).toResponse();
        default:
            return AppError.badRequest(error.message).toResponse();
    }
}

export async function POST(request: Request) {
    if (!isLogtoAuthEnabled()) {
        return NextResponse.json(
            {
                error: "Logto mobile customer session bridge is not enabled.",
                success: false,
            },
            { status: 503 },
        );
    }

    const config = resolveLogtoConfig(request.url);
    if (!config) {
        return NextResponse.json(
            {
                error: "Logto mobile customer session bridge is not configured.",
                success: false,
            },
            { status: 503 },
        );
    }

    try {
        let rawBody: unknown;

        try {
            rawBody = await request.json();
        } catch {
            throw AppError.badRequest("Gecersiz istek govdesi.");
        }

        const body = validateOrThrow(requestSchema, rawBody);
        const provisioningService = createLogtoCustomerProvisioningService({
            repository: createQueryBackedLogtoCustomerProvisioningRepository(),
        });
        const sessionService = createLogtoMobileCustomerSessionService({
            provisionCustomer: async (identity) => await provisioningService.provision(identity),
            verifyIdToken: async (idToken) => await verifyLogtoMobileCustomerIdToken(config, idToken),
        });
        const result = await sessionService.establishSession({
            actor: body.actor,
            idToken: body.idToken,
        });
        const response = NextResponse.json({
            success: true,
            data: result.safeSession,
        });

        clearAllLocalSessionCookies(response);

        const customerToken = await createLogtoCustomerSessionToken(result.customerSession);
        setCustomerSessionCookie(response, customerToken);
        return response;
    } catch (error) {
        if (error instanceof LogtoMobileCustomerSessionError) {
            return toSessionErrorResponse(error);
        }

        return AppError.toResponse(error, "logto-mobile-customer-session");
    }
}
