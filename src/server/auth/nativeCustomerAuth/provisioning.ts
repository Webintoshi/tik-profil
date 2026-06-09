import { NativeCustomerAuthError } from "./errors.ts";

export type NativeCustomerAuthProvider = "google" | "native_otp";
export type ProvisioningStatus = "created" | "found" | "updated";

export interface NativeCustomerProvisioningAppUser {
    displayName: null | string;
    email: null | string;
    id: string;
    phone: null | string;
    status: string;
}

export interface NativeCustomerProvisioningProviderLink {
    appUserId: string;
    id: string;
    logtoUserId: null | string;
    provider: string;
    providerEmail: null | string;
    providerMetadata: Record<string, unknown>;
    providerUserId: string;
}

export interface NativeCustomerProvisioningRepository {
    createAppUser(input: {
        displayName: null | string;
        email: null | string;
        phone: null | string;
        status: string;
    }): Promise<NativeCustomerProvisioningAppUser>;
    createProviderLink(input: {
        appUserId: string;
        email: null | string;
        metadata: Record<string, unknown>;
        provider: NativeCustomerAuthProvider;
        providerUserId: string;
    }): Promise<NativeCustomerProvisioningProviderLink>;
    findAppUserByEmail(email: string): Promise<NativeCustomerProvisioningAppUser | null>;
    findAppUserById(id: string): Promise<NativeCustomerProvisioningAppUser | null>;
    findAppUserByPhone(phone: string): Promise<NativeCustomerProvisioningAppUser | null>;
    findProviderLink(
        provider: NativeCustomerAuthProvider,
        providerUserId: string,
    ): Promise<NativeCustomerProvisioningProviderLink | null>;
    updateAppUser(id: string, input: {
        displayName?: null | string;
        email?: null | string;
        phone?: null | string;
    }): Promise<NativeCustomerProvisioningAppUser>;
    updateProviderLink(id: string, input: {
        appUserId: string;
        email: null | string;
        metadata: Record<string, unknown>;
    }): Promise<NativeCustomerProvisioningProviderLink>;
}

export interface NativeCustomerProvisioningInput {
    avatarUrl?: null | string;
    displayName?: null | string;
    email?: null | string;
    phone?: null | string;
    provider: NativeCustomerAuthProvider;
    providerUserId: string;
}

export interface NativeCustomerProvisioningResult {
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
    phone: null | string;
    provider: NativeCustomerAuthProvider;
    providerUserId: string;
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

function nextStatusCounts(statuses: ProvisioningStatus[]): NativeCustomerProvisioningResult["counts"] {
    return statuses.reduce<NativeCustomerProvisioningResult["counts"]>((counts, status) => {
        counts[status] += 1;
        return counts;
    }, {
        created: 0,
        found: 0,
        updated: 0,
    });
}

function buildProviderMetadata(input: {
    avatarUrl: null | string;
    displayName: null | string;
    email: null | string;
    phone: null | string;
    provider: NativeCustomerAuthProvider;
}): Record<string, unknown> {
    return {
        avatarUrl: input.avatarUrl,
        displayName: input.displayName,
        email: input.email,
        phone: input.phone,
        provisionedBy: `native_customer_${input.provider}`,
    };
}

function needsAppUserUpdate(
    appUser: NativeCustomerProvisioningAppUser,
    input: {
        displayName: null | string;
        email: null | string;
        phone: null | string;
    },
): boolean {
    return Boolean(
        (!appUser.displayName && input.displayName)
        || (!appUser.email && input.email)
        || (!appUser.phone && input.phone),
    );
}

export function createNativeCustomerProvisioningService(input: {
    repository: NativeCustomerProvisioningRepository;
}) {
    return {
        async provision(rawInput: NativeCustomerProvisioningInput): Promise<NativeCustomerProvisioningResult> {
            const normalized = {
                avatarUrl: trimToNull(rawInput.avatarUrl),
                displayName: trimToNull(rawInput.displayName),
                email: trimToNull(rawInput.email)?.toLowerCase() ?? null,
                phone: trimToNull(rawInput.phone),
                provider: rawInput.provider,
                providerUserId: trimToNull(rawInput.providerUserId),
            };

            if (normalized.provider !== "native_otp" && normalized.provider !== "google") {
                throw new NativeCustomerAuthError("PROVIDER_INVALID", "Gecersiz musteri kimlik saglayicisi.");
            }

            if (!normalized.providerUserId) {
                throw new NativeCustomerAuthError("PROVIDER_SUBJECT_REQUIRED", "Musteri kimlik konusu gerekli.");
            }

            const existingProviderLink = await input.repository.findProviderLink(
                normalized.provider,
                normalized.providerUserId,
            );
            const matchedAppUser = normalized.phone
                ? await input.repository.findAppUserByPhone(normalized.phone)
                : normalized.email
                    ? await input.repository.findAppUserByEmail(normalized.email)
                    : null;

            if (existingProviderLink && matchedAppUser && existingProviderLink.appUserId !== matchedAppUser.id) {
                throw new NativeCustomerAuthError(
                    "PROVIDER_LINK_CONFLICT",
                    "Provider subject is already linked to a different app user than the supplied identity.",
                    409,
                );
            }

            let appUserStatus: ProvisioningStatus = "found";
            let appUser = existingProviderLink
                ? await input.repository.findAppUserById(existingProviderLink.appUserId)
                : matchedAppUser;

            if (existingProviderLink && !appUser) {
                throw new NativeCustomerAuthError(
                    "APP_USER_MISSING",
                    "Linked app user could not be loaded for the provider subject.",
                    409,
                );
            }

            if (!appUser) {
                appUser = await input.repository.createAppUser({
                    displayName: normalized.displayName ?? normalized.email ?? normalized.phone,
                    email: normalized.email,
                    phone: normalized.phone,
                    status: "active",
                });
                appUserStatus = "created";
            } else if (needsAppUserUpdate(appUser, normalized)) {
                appUser = await input.repository.updateAppUser(appUser.id, {
                    displayName: appUser.displayName ? undefined : normalized.displayName,
                    email: appUser.email ? undefined : normalized.email,
                    phone: appUser.phone ? undefined : normalized.phone,
                });
                appUserStatus = "updated";
            }

            const desiredProviderMetadata = buildProviderMetadata(normalized);
            let authProviderLink = existingProviderLink;
            let authProviderLinkStatus: ProvisioningStatus = "found";

            if (!authProviderLink) {
                authProviderLink = await input.repository.createProviderLink({
                    appUserId: appUser.id,
                    email: normalized.email,
                    metadata: desiredProviderMetadata,
                    provider: normalized.provider,
                    providerUserId: normalized.providerUserId,
                });
                authProviderLinkStatus = "created";
            } else if (
                authProviderLink.appUserId !== appUser.id
                || authProviderLink.providerEmail !== normalized.email
                || !isEquivalentJson(authProviderLink.providerMetadata, desiredProviderMetadata)
            ) {
                authProviderLink = await input.repository.updateProviderLink(authProviderLink.id, {
                    appUserId: appUser.id,
                    email: normalized.email,
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
                displayName: appUser.displayName ?? normalized.displayName,
                email: appUser.email ?? normalized.email,
                phone: appUser.phone ?? normalized.phone,
                provider: normalized.provider,
                providerUserId: normalized.providerUserId,
            };
        },
    };
}
