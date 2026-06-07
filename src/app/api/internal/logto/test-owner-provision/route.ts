import { NextResponse, type NextRequest } from "next/server";
import { getOptionalEnvValue } from "@/lib/env";
import {
    LogtoTestOwnerProvisioningError,
    createLogtoTestOwnerProvisioningService,
    isLogtoTestProvisioningSecretAuthorized,
    type LogtoTestOwnerProvisioningInput,
} from "@/server/auth/logto/testOwnerProvisioning";
import { createQueryBackedLogtoTestOwnerProvisioningRepository } from "@/server/auth/logto/testOwnerProvisioningRepository";

export const dynamic = "force-dynamic";

type ProvisioningBody = Partial<Record<keyof LogtoTestOwnerProvisioningInput, unknown>>;

function getOperatorSecret(request: NextRequest): string | undefined {
    const headerSecret = request.headers.get("x-logto-test-provisioning-secret")?.trim();
    if (headerSecret) {
        return headerSecret;
    }

    const authorization = request.headers.get("authorization")?.trim();
    if (!authorization?.toLowerCase().startsWith("bearer ")) {
        return undefined;
    }

    const token = authorization.slice("bearer ".length).trim();
    return token || undefined;
}

function parseProvisioningBody(body: ProvisioningBody | null): LogtoTestOwnerProvisioningInput {
    if (!body) {
        throw new LogtoTestOwnerProvisioningError("Invalid JSON payload.");
    }

    const businessSlug = typeof body.businessSlug === "string" ? body.businessSlug : "";
    const displayName = typeof body.displayName === "string" ? body.displayName : undefined;
    const email = typeof body.email === "string" ? body.email : undefined;
    const logtoSub = typeof body.logtoSub === "string" ? body.logtoSub : "";
    const role = body.role === "owner" ? "owner" : null;
    const username = typeof body.username === "string" ? body.username : undefined;

    if (!businessSlug || !logtoSub || !role) {
        throw new LogtoTestOwnerProvisioningError(
            "businessSlug, logtoSub, and role=owner are required.",
        );
    }

    return {
        businessSlug,
        displayName,
        email,
        logtoSub,
        role,
        username,
    };
}

export async function POST(request: NextRequest) {
    const configuredSecret = getOptionalEnvValue("LOGTO_TEST_PROVISIONING_SECRET");
    if (!configuredSecret) {
        return NextResponse.json(
            { success: false, error: "Not found" },
            { status: 404 },
        );
    }

    const receivedSecret = getOperatorSecret(request);
    if (!isLogtoTestProvisioningSecretAuthorized(configuredSecret, receivedSecret)) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 },
        );
    }

    try {
        const body = await request.json().catch(() => null) as ProvisioningBody | null;
        const input = parseProvisioningBody(body);
        const service = createLogtoTestOwnerProvisioningService({
            repository: createQueryBackedLogtoTestOwnerProvisioningRepository(),
        });
        const result = await service.provision(input);

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        if (error instanceof LogtoTestOwnerProvisioningError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                },
                { status: error.statusCode },
            );
        }

        console.error("[internal/logto/test-owner-provision] unexpected error", error);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 },
        );
    }
}
