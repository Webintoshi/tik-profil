export type LogtoActorHint = "auto" | "platform_admin" | "business" | "customer";

export interface LogtoPlatformAdminCandidate {
    username: string;
}

export interface LogtoCustomerCandidate {
    appUserId: string;
}

export interface LogtoBusinessMembershipCandidate {
    businessId: string;
    role: string;
}

export interface SelectPreferredLogtoActorInput {
    customer: LogtoCustomerCandidate | null;
    platformAdmin: LogtoPlatformAdminCandidate | null;
    memberships: LogtoBusinessMembershipCandidate[];
}

export interface BuildLogtoAuthorizationUrlInput {
    authorizationEndpoint: string;
    appId: string;
    redirectUri: string;
    codeChallenge: string;
    nonce: string;
    scopes: string[];
    state: string;
}

export interface BuildLogtoEndSessionUrlInput {
    appId: string;
    endSessionEndpoint: string;
    postLogoutRedirectUri: string;
}

function trimToNull(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function normalizeRolePriority(role: string): number {
    switch (role.trim().toLowerCase()) {
        case "owner":
        case "business_owner":
            return 3;
        case "manager":
        case "business_manager":
            return 2;
        default:
            return 1;
    }
}

export function normalizeLogtoActorHint(value: string | null | undefined): LogtoActorHint {
    switch (trimToNull(value)?.toLowerCase()) {
        case "platform_admin":
            return "platform_admin";
        case "business":
            return "business";
        case "customer":
            return "customer";
        default:
            return "auto";
    }
}

export function normalizeLogtoRedirectPath(
    value: string | null | undefined,
    fallbackPath: string,
): string {
    const fallback = trimToNull(fallbackPath) ?? "/";
    const candidate = trimToNull(value);

    if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
        return fallback;
    }

    return candidate;
}

export function buildLogtoAuthorizationUrl({
    authorizationEndpoint,
    appId,
    redirectUri,
    codeChallenge,
    nonce,
    scopes,
    state,
}: BuildLogtoAuthorizationUrlInput): string {
    const url = new URL(authorizationEndpoint);

    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    return url.toString();
}

export function buildLogtoEndSessionUrl({
    appId,
    endSessionEndpoint,
    postLogoutRedirectUri,
}: BuildLogtoEndSessionUrlInput): string {
    const url = new URL(endSessionEndpoint);

    url.searchParams.set("client_id", appId);
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

    return url.toString();
}

function selectHighestPriorityMembership(
    memberships: LogtoBusinessMembershipCandidate[],
): LogtoBusinessMembershipCandidate | null {
    if (memberships.length === 0) {
        return null;
    }

    return [...memberships].sort(
        (left, right) => normalizeRolePriority(right.role) - normalizeRolePriority(left.role),
    )[0] ?? null;
}

export function selectPreferredLogtoActor(
    input: SelectPreferredLogtoActorInput,
    hint: LogtoActorHint,
):
    | { kind: "customer"; value: LogtoCustomerCandidate }
    | { kind: "platform_admin"; value: LogtoPlatformAdminCandidate }
    | { kind: "business"; value: LogtoBusinessMembershipCandidate }
    | null {
    const preferredMembership = selectHighestPriorityMembership(input.memberships);

    if (hint === "platform_admin") {
        return input.platformAdmin ? { kind: "platform_admin", value: input.platformAdmin } : null;
    }

    if (hint === "business") {
        return preferredMembership ? { kind: "business", value: preferredMembership } : null;
    }

    if (hint === "customer") {
        return input.customer ? { kind: "customer", value: input.customer } : null;
    }

    if (preferredMembership) {
        return { kind: "business", value: preferredMembership };
    }

    if (input.platformAdmin) {
        return { kind: "platform_admin", value: input.platformAdmin };
    }

    return null;
}
