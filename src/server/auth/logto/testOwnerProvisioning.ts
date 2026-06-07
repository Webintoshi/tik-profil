import { timingSafeEqual } from "node:crypto";

export type ProvisioningStatus = "created" | "found" | "updated";

export interface LogtoProvisioningAppUser {
    displayName: null | string;
    email: null | string;
    id: string;
    status: string;
}

export interface LogtoProvisioningProviderLink {
    appUserId: string;
    id: string;
    logtoUserId: null | string;
    providerEmail: null | string;
    providerMetadata: Record<string, unknown>;
    providerUserId: string;
}

export interface LogtoProvisioningBusiness {
    id: string;
    name: string;
    slug: string;
}

export interface LogtoProvisioningBusinessRole {
    businessId: string;
    displayName: string;
    id: string;
    isSystem: boolean;
    roleKey: string;
}

export interface LogtoProvisioningBusinessMembership {
    appUserId: string;
    businessId: string;
    id: string;
    membershipStatus: string;
    roleId: null | string;
}

export interface LogtoTestOwnerProvisioningRepository {
    createAppUser(input: {
        displayName: null | string;
        email: null | string;
        status: string;
    }): Promise<LogtoProvisioningAppUser>;
    createBusinessMembership(input: {
        appUserId: string;
        businessId: string;
        membershipStatus: string;
        roleId: string;
    }): Promise<LogtoProvisioningBusinessMembership>;
    createBusinessRole(input: {
        businessId: string;
        description: string;
        displayName: string;
        isSystem: boolean;
        roleKey: string;
    }): Promise<LogtoProvisioningBusinessRole>;
    createLogtoProviderLink(input: {
        appUserId: string;
        email: null | string;
        logtoSub: string;
        metadata: Record<string, unknown>;
    }): Promise<LogtoProvisioningProviderLink>;
    findAppUserByEmail(email: string): Promise<LogtoProvisioningAppUser | null>;
    findAppUserById(id: string): Promise<LogtoProvisioningAppUser | null>;
    findBusinessBySlug(slug: string): Promise<LogtoProvisioningBusiness | null>;
    findBusinessMembership(businessId: string, appUserId: string): Promise<LogtoProvisioningBusinessMembership | null>;
    findBusinessRoleByKey(businessId: string, roleKey: string): Promise<LogtoProvisioningBusinessRole | null>;
    findLinkedProviderLink(logtoSub: string): Promise<LogtoProvisioningProviderLink | null>;
    updateBusinessMembership(id: string, input: {
        membershipStatus: string;
        roleId: string;
    }): Promise<LogtoProvisioningBusinessMembership>;
    updateLogtoProviderLink(id: string, input: {
        appUserId: string;
        email: null | string;
        logtoSub: string;
        metadata: Record<string, unknown>;
    }): Promise<LogtoProvisioningProviderLink>;
}

export interface LogtoTestOwnerProvisioningInput {
    businessSlug: string;
    displayName?: null | string;
    email?: null | string;
    logtoSub: string;
    role: "owner";
    username?: null | string;
}

export interface LogtoTestOwnerProvisioningResult {
    appUser: {
        id: string;
        status: ProvisioningStatus;
    };
    authProviderLink: {
        id: string;
        status: ProvisioningStatus;
    };
    business: {
        id: string;
        slug: string;
    };
    businessMembership: {
        id: string;
        status: ProvisioningStatus;
    };
    businessRole: {
        id: string;
        roleKey: string;
        status: ProvisioningStatus;
    };
    counts: {
        created: number;
        found: number;
        updated: number;
    };
}

export class LogtoTestOwnerProvisioningError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "LogtoTestOwnerProvisioningError";
        this.statusCode = statusCode;
    }
}

const TEST_BUSINESS_SLUG_PATTERNS = [
    /^atlas-smoke-/i,
    /^atlas-r2-smoke-/i,
    /^codex-/i,
    /(?:^|[-_])smoke(?:[-_]|$)/i,
    /(?:^|[-_])test(?:[-_]|$)/i,
];

const TEST_IDENTIFIER_PATTERNS = [
    /(?:^|[-_+.])smoke(?:[-_+.@]|$)/i,
    /(?:^|[-_+.])test(?:[-_+.@]|$)/i,
    /(?:^|[-_+.])codex(?:[-_+.@]|$)/i,
    /@example\.(?:com|invalid)$/i,
];

function trimToNull(value: null | string | undefined): null | string {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function isSafeTestBusinessSlug(value: string): boolean {
    return TEST_BUSINESS_SLUG_PATTERNS.some((pattern) => pattern.test(value));
}

function isSafeTestIdentifier(value: null | string): boolean {
    if (!value) {
        return false;
    }

    return TEST_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value));
}

function buildProviderMetadata(input: {
    displayName: null | string;
    email: null | string;
    username: null | string;
}): Record<string, unknown> {
    return {
        displayName: input.displayName,
        email: input.email,
        provisionedBy: "logto_test_owner_provisioning",
        testOnly: true,
        username: input.username,
    };
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

function assertTestOnlyInput(input: LogtoTestOwnerProvisioningInput & {
    displayName: null | string;
    email: null | string;
    username: null | string;
}) {
    if (input.role !== "owner") {
        throw new LogtoTestOwnerProvisioningError("Only test-only owner provisioning is supported.");
    }

    if (!trimToNull(input.logtoSub)) {
        throw new LogtoTestOwnerProvisioningError("Logto subject is required.");
    }

    if (!isSafeTestBusinessSlug(input.businessSlug)) {
        throw new LogtoTestOwnerProvisioningError("Provisioning is restricted to test-only business slugs.");
    }

    if (!isSafeTestIdentifier(input.email) && !isSafeTestIdentifier(input.username) && !isSafeTestIdentifier(input.displayName)) {
        throw new LogtoTestOwnerProvisioningError("Provisioning is restricted to test-only identifiers.");
    }
}

function nextStatusCounts(statuses: ProvisioningStatus[]): LogtoTestOwnerProvisioningResult["counts"] {
    return statuses.reduce<LogtoTestOwnerProvisioningResult["counts"]>((counts, status) => {
        counts[status] += 1;
        return counts;
    }, {
        created: 0,
        found: 0,
        updated: 0,
    });
}

function areSecretsEqual(expectedSecret: string, receivedSecret: string): boolean {
    const expectedBuffer = Buffer.from(expectedSecret);
    const receivedBuffer = Buffer.from(receivedSecret);

    return expectedBuffer.length === receivedBuffer.length
        && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isLogtoTestProvisioningSecretAuthorized(
    expectedSecret: null | string | undefined,
    receivedSecret: null | string | undefined,
): boolean {
    const normalizedExpected = trimToNull(expectedSecret);
    const normalizedReceived = trimToNull(receivedSecret);

    if (!normalizedExpected || !normalizedReceived) {
        return false;
    }

    return areSecretsEqual(normalizedExpected, normalizedReceived);
}

export function createLogtoTestOwnerProvisioningService(input: {
    repository: LogtoTestOwnerProvisioningRepository;
}) {
    return {
        async provision(rawInput: LogtoTestOwnerProvisioningInput): Promise<LogtoTestOwnerProvisioningResult> {
            const normalizedInput = {
                businessSlug: rawInput.businessSlug.trim(),
                displayName: trimToNull(rawInput.displayName),
                email: trimToNull(rawInput.email)?.toLowerCase() ?? null,
                logtoSub: rawInput.logtoSub.trim(),
                role: rawInput.role,
                username: trimToNull(rawInput.username),
            };
            assertTestOnlyInput(normalizedInput);

            const business = await input.repository.findBusinessBySlug(normalizedInput.businessSlug);
            if (!business) {
                throw new LogtoTestOwnerProvisioningError("Target business was not found.", 404);
            }

            const existingProviderLink = await input.repository.findLinkedProviderLink(normalizedInput.logtoSub);
            const emailMatchedAppUser = normalizedInput.email
                ? await input.repository.findAppUserByEmail(normalizedInput.email)
                : null;

            if (existingProviderLink && emailMatchedAppUser && existingProviderLink.appUserId !== emailMatchedAppUser.id) {
                throw new LogtoTestOwnerProvisioningError(
                    "Logto subject is already linked to a different app user than the provided test email.",
                    409,
                );
            }

            let appUserStatus: ProvisioningStatus = "found";
            let appUser = existingProviderLink
                ? await input.repository.findAppUserById(existingProviderLink.appUserId)
                : emailMatchedAppUser;

            if (existingProviderLink && !appUser) {
                throw new LogtoTestOwnerProvisioningError("Linked app user could not be loaded for the Logto subject.", 409);
            }

            if (!appUser) {
                appUser = await input.repository.createAppUser({
                    displayName: normalizedInput.displayName ?? normalizedInput.username ?? normalizedInput.email,
                    email: normalizedInput.email,
                    status: "active",
                });
                appUserStatus = "created";
            }

            const desiredProviderMetadata = buildProviderMetadata({
                displayName: normalizedInput.displayName,
                email: normalizedInput.email,
                username: normalizedInput.username,
            });

            let authProviderLinkStatus: ProvisioningStatus = "found";
            let authProviderLink = existingProviderLink;
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

            let businessRoleStatus: ProvisioningStatus = "found";
            let businessRole = await input.repository.findBusinessRoleByKey(business.id, "owner");
            if (!businessRole) {
                businessRole = await input.repository.createBusinessRole({
                    businessId: business.id,
                    description: "System owner role used by guarded Logto test provisioning.",
                    displayName: "Owner",
                    isSystem: true,
                    roleKey: "owner",
                });
                businessRoleStatus = "created";
            }

            let businessMembershipStatus: ProvisioningStatus = "found";
            let businessMembership = await input.repository.findBusinessMembership(business.id, appUser.id);
            if (!businessMembership) {
                businessMembership = await input.repository.createBusinessMembership({
                    appUserId: appUser.id,
                    businessId: business.id,
                    membershipStatus: "active",
                    roleId: businessRole.id,
                });
                businessMembershipStatus = "created";
            } else if (businessMembership.membershipStatus !== "active" || businessMembership.roleId !== businessRole.id) {
                businessMembership = await input.repository.updateBusinessMembership(businessMembership.id, {
                    membershipStatus: "active",
                    roleId: businessRole.id,
                });
                businessMembershipStatus = "updated";
            }

            const statuses: ProvisioningStatus[] = [
                appUserStatus,
                authProviderLinkStatus,
                businessRoleStatus,
                businessMembershipStatus,
            ];

            return {
                appUser: {
                    id: appUser.id,
                    status: appUserStatus,
                },
                authProviderLink: {
                    id: authProviderLink.id,
                    status: authProviderLinkStatus,
                },
                business: {
                    id: business.id,
                    slug: business.slug,
                },
                businessMembership: {
                    id: businessMembership.id,
                    status: businessMembershipStatus,
                },
                businessRole: {
                    id: businessRole.id,
                    roleKey: businessRole.roleKey,
                    status: businessRoleStatus,
                },
                counts: nextStatusCounts(statuses),
            };
        },
    };
}
