export type ProvisioningStatus = "created" | "found" | "updated";

export interface LogtoCustomerProvisioningAppUser {
    displayName: null | string;
    email: null | string;
    id: string;
    status: string;
}

export interface LogtoCustomerProvisioningProviderLink {
    appUserId: string;
    id: string;
    logtoUserId: null | string;
    providerEmail: null | string;
    providerMetadata: Record<string, unknown>;
    providerUserId: string;
}

export interface LogtoCustomerProvisioningRepository {
    createAppUser(input: {
        displayName: null | string;
        email: null | string;
        status: string;
    }): Promise<LogtoCustomerProvisioningAppUser>;
    createLogtoProviderLink(input: {
        appUserId: string;
        email: null | string;
        logtoSub: string;
        metadata: Record<string, unknown>;
    }): Promise<LogtoCustomerProvisioningProviderLink>;
    findAppUserByEmail(email: string): Promise<LogtoCustomerProvisioningAppUser | null>;
    findAppUserById(id: string): Promise<LogtoCustomerProvisioningAppUser | null>;
    findAppUserByLegacyIdentifier(email: string): Promise<LogtoCustomerProvisioningAppUser | null>;
    findLinkedProviderLink(logtoSub: string): Promise<LogtoCustomerProvisioningProviderLink | null>;
    updateLogtoProviderLink(id: string, input: {
        appUserId: string;
        email: null | string;
        logtoSub: string;
        metadata: Record<string, unknown>;
    }): Promise<LogtoCustomerProvisioningProviderLink>;
}

export interface LogtoCustomerProvisioningInput {
    email?: null | string;
    logtoSub: string;
    name?: null | string;
    provisioningSource?: string;
    username?: null | string;
}

export interface LogtoCustomerProvisioningResult {
    appUser: {
        id: string;
        status: ProvisioningStatus;
    };
    authProviderLink: {
        id: string;
        status: ProvisioningStatus;
    };
    counts: {
        created: number;
        found: number;
        updated: number;
    };
    displayName: null | string;
    email: null | string;
}

export class LogtoCustomerProvisioningError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "LogtoCustomerProvisioningError";
        this.statusCode = statusCode;
    }
}

function trimToNull(value: null | string | undefined): null | string {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function sortJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortJsonValue);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entryValue]) => [key, sortJsonValue(entryValue)]),
        );
    }

    return value;
}

function isEquivalentJson(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    return JSON.stringify(sortJsonValue(left)) === JSON.stringify(sortJsonValue(right));
}

function buildProviderMetadata(input: {
    email: null | string;
    name: null | string;
    provisioningSource: string;
    username: null | string;
}): Record<string, unknown> {
    return {
        email: input.email,
        name: input.name,
        provisionedBy: input.provisioningSource,
        username: input.username,
    };
}

function nextStatusCounts(statuses: ProvisioningStatus[]): LogtoCustomerProvisioningResult["counts"] {
    return statuses.reduce<LogtoCustomerProvisioningResult["counts"]>((counts, status) => {
        counts[status] += 1;
        return counts;
    }, {
        created: 0,
        found: 0,
        updated: 0,
    });
}

export function createLogtoCustomerProvisioningService(input: {
    repository: LogtoCustomerProvisioningRepository;
}) {
    return {
        async provision(rawInput: LogtoCustomerProvisioningInput): Promise<LogtoCustomerProvisioningResult> {
            const normalizedInput = {
                email: trimToNull(rawInput.email)?.toLowerCase() ?? null,
                logtoSub: trimToNull(rawInput.logtoSub),
                name: trimToNull(rawInput.name),
                provisioningSource: trimToNull(rawInput.provisioningSource) ?? "logto_customer_auth",
                username: trimToNull(rawInput.username),
            };

            if (!normalizedInput.logtoSub) {
                throw new LogtoCustomerProvisioningError("Logto subject is required.");
            }

            const existingProviderLink = await input.repository.findLinkedProviderLink(normalizedInput.logtoSub);
            const emailMatchedAppUser = normalizedInput.email
                ? await input.repository.findAppUserByEmail(normalizedInput.email)
                    ?? await input.repository.findAppUserByLegacyIdentifier(normalizedInput.email)
                : null;

            if (existingProviderLink && emailMatchedAppUser && existingProviderLink.appUserId !== emailMatchedAppUser.id) {
                throw new LogtoCustomerProvisioningError(
                    "Logto subject is already linked to a different app user than the provided email.",
                    409,
                );
            }

            let appUserStatus: ProvisioningStatus = "found";
            let appUser = existingProviderLink
                ? await input.repository.findAppUserById(existingProviderLink.appUserId)
                : emailMatchedAppUser;

            if (existingProviderLink && !appUser) {
                throw new LogtoCustomerProvisioningError("Linked app user could not be loaded for the Logto subject.", 409);
            }

            if (!appUser) {
                appUser = await input.repository.createAppUser({
                    displayName: normalizedInput.name ?? normalizedInput.username ?? normalizedInput.email,
                    email: normalizedInput.email,
                    status: "active",
                });
                appUserStatus = "created";
            }

            const desiredProviderMetadata = buildProviderMetadata(normalizedInput);
            let authProviderLink = existingProviderLink;
            let authProviderLinkStatus: ProvisioningStatus = "found";

            if (!authProviderLink) {
                authProviderLink = await input.repository.createLogtoProviderLink({
                    appUserId: appUser.id,
                    email: normalizedInput.email,
                    logtoSub: normalizedInput.logtoSub,
                    metadata: desiredProviderMetadata,
                });
                authProviderLinkStatus = "created";
            } else if (
                authProviderLink.appUserId !== appUser.id
                || authProviderLink.logtoUserId !== normalizedInput.logtoSub
                || authProviderLink.providerUserId !== normalizedInput.logtoSub
                || authProviderLink.providerEmail !== normalizedInput.email
                || !isEquivalentJson(authProviderLink.providerMetadata, desiredProviderMetadata)
            ) {
                authProviderLink = await input.repository.updateLogtoProviderLink(authProviderLink.id, {
                    appUserId: appUser.id,
                    email: normalizedInput.email,
                    logtoSub: normalizedInput.logtoSub,
                    metadata: desiredProviderMetadata,
                });
                authProviderLinkStatus = "updated";
            }

            return {
                appUser: {
                    id: appUser.id,
                    status: appUserStatus,
                },
                authProviderLink: {
                    id: authProviderLink.id,
                    status: authProviderLinkStatus,
                },
                counts: nextStatusCounts([appUserStatus, authProviderLinkStatus]),
                displayName: appUser.displayName ?? normalizedInput.name,
                email: appUser.email ?? normalizedInput.email,
            };
        },
    };
}
