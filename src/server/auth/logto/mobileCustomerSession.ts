import { getOptionalEnvValue } from "../../../lib/env.ts";
import {
    LogtoCustomerProvisioningError,
    type LogtoCustomerProvisioningInput,
    type LogtoCustomerProvisioningResult,
} from "./customerProvisioning.ts";
import { verifyLogtoIdTokenForAudiences } from "./oidc.ts";

export interface VerifiedLogtoMobileCustomerIdToken {
    audience: string;
    email: null | string;
    logtoRoles: string[];
    logtoSub: string;
    name: null | string;
    username: null | string;
}

export interface LogtoMobileCustomerSessionClaims {
    appUserId: string;
    authProvider: "logto";
    displayName?: string;
    email?: string;
    logtoRoles: string[];
    logtoSub: string;
    role: "customer";
}

export interface LogtoMobileCustomerSafeSession {
    actorType: "customer";
    appUserId: string;
    displayName: null | string;
    email: null | string;
    logtoSub: string;
    provider: "logto";
    role: "customer";
    success: true;
}

export class LogtoMobileCustomerSessionError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "LogtoMobileCustomerSessionError";
        this.statusCode = statusCode;
    }
}

interface LogtoMobileCustomerIdTokenVerificationConfig {
    appId: string;
    endpoint: string;
}

function trimToNull(value: null | string | undefined): null | string {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function getStringClaim(payload: Record<string, unknown>, key: string): null | string {
    return trimToNull(typeof payload[key] === "string" ? String(payload[key]) : null);
}

function getStringArrayClaim(payload: Record<string, unknown>, key: string): string[] {
    const value = payload[key];
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function getMatchedAudience(payload: Record<string, unknown>, allowedAudiences: string[]): null | string {
    const audienceClaim = payload.aud;
    const audiences = Array.isArray(audienceClaim)
        ? audienceClaim.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : typeof audienceClaim === "string" && audienceClaim.trim()
            ? [audienceClaim]
            : [];

    return audiences.find((audience) => allowedAudiences.includes(audience)) ?? null;
}

export function resolveLogtoMobileCustomerAudienceIds(input: {
    defaultAppId?: null | string;
    mobileAppId?: null | string;
}): string[] {
    const audiences = [
        trimToNull(input.mobileAppId),
        trimToNull(input.defaultAppId),
    ].filter((value): value is string => Boolean(value));

    return [...new Set(audiences)];
}

export async function verifyLogtoMobileCustomerIdToken(
    config: LogtoMobileCustomerIdTokenVerificationConfig,
    idToken: string,
    mobileAppId = getOptionalEnvValue("LOGTO_MOBILE_CUSTOMER_APP_ID"),
): Promise<VerifiedLogtoMobileCustomerIdToken> {
    const allowedAudiences = resolveLogtoMobileCustomerAudienceIds({
        defaultAppId: config.appId,
        mobileAppId,
    });

    if (allowedAudiences.length === 0) {
        throw new LogtoMobileCustomerSessionError("No allowed Logto mobile audiences are configured.", 503);
    }

    const payload = await verifyLogtoIdTokenForAudiences(
        { endpoint: config.endpoint },
        idToken,
        allowedAudiences,
    ) as Record<string, unknown>;
    const matchedAudience = getMatchedAudience(payload, allowedAudiences);
    const logtoSub = getStringClaim(payload, "sub");

    if (!matchedAudience || !logtoSub) {
        throw new LogtoMobileCustomerSessionError("Mobile Logto id token claims are incomplete.", 401);
    }

    return {
        audience: matchedAudience,
        email: getStringClaim(payload, "email"),
        logtoRoles: getStringArrayClaim(payload, "roles"),
        logtoSub,
        name: getStringClaim(payload, "name"),
        username: getStringClaim(payload, "username") ?? getStringClaim(payload, "preferred_username"),
    };
}

export function createLogtoMobileCustomerSessionService(input: {
    provisionCustomer: (identity: LogtoCustomerProvisioningInput) => Promise<LogtoCustomerProvisioningResult>;
    verifyIdToken: (idToken: string) => Promise<VerifiedLogtoMobileCustomerIdToken>;
}) {
    return {
        async establishSession(payload: {
            actor?: null | string;
            idToken?: null | string;
        }): Promise<{
            audience: string;
            customerSession: LogtoMobileCustomerSessionClaims;
            provisioning: LogtoCustomerProvisioningResult;
            safeSession: LogtoMobileCustomerSafeSession;
        }> {
            const actor = trimToNull(payload.actor);
            if (actor !== "customer") {
                throw new LogtoMobileCustomerSessionError(
                    "Only customer mobile session bootstrap is supported.",
                    403,
                );
            }

            const idToken = trimToNull(payload.idToken);
            if (!idToken) {
                throw new LogtoMobileCustomerSessionError("Mobile Logto id token is required.", 401);
            }

            let verifiedToken: VerifiedLogtoMobileCustomerIdToken;
            try {
                verifiedToken = await input.verifyIdToken(idToken);
            } catch (error) {
                if (error instanceof LogtoMobileCustomerSessionError) {
                    throw error;
                }

                throw new LogtoMobileCustomerSessionError(
                    "Mobile Logto id token could not be verified.",
                    401,
                );
            }

            let provisioning: LogtoCustomerProvisioningResult;
            try {
                provisioning = await input.provisionCustomer({
                    email: verifiedToken.email,
                    logtoSub: verifiedToken.logtoSub,
                    name: verifiedToken.name,
                    username: verifiedToken.username,
                });
            } catch (error) {
                if (error instanceof LogtoCustomerProvisioningError) {
                    throw new LogtoMobileCustomerSessionError(error.message, error.statusCode);
                }

                throw error;
            }

            const customerSession: LogtoMobileCustomerSessionClaims = {
                appUserId: provisioning.appUser.id,
                authProvider: "logto",
                displayName: provisioning.displayName ?? undefined,
                email: provisioning.email ?? undefined,
                logtoRoles: verifiedToken.logtoRoles,
                logtoSub: verifiedToken.logtoSub,
                role: "customer",
            };

            return {
                audience: verifiedToken.audience,
                customerSession,
                provisioning,
                safeSession: {
                    actorType: "customer",
                    appUserId: customerSession.appUserId,
                    displayName: customerSession.displayName ?? null,
                    email: customerSession.email ?? null,
                    logtoSub: customerSession.logtoSub,
                    provider: "logto",
                    role: "customer",
                    success: true,
                },
            };
        },
    };
}
