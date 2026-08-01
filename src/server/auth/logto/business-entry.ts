import { normalizeLogtoRedirectPath } from "./helpers";

export interface BusinessLogtoEntryInput {
    authError?: string | null;
    callbackUrl?: string | null;
    logout?: string | null;
}

export type BusinessLogtoEntry =
    | {
        href: string;
        kind: "redirect";
    }
    | {
        authError: string | null;
        kind: "recovery";
        loggedOut: boolean;
        retryHref: string;
    };

export function resolveBusinessLogtoEntry(input: BusinessLogtoEntryInput): BusinessLogtoEntry {
    const callbackUrl = normalizeLogtoRedirectPath(input.callbackUrl, "/panel/profile");
    const params = new URLSearchParams({
        actor: "business",
        callbackUrl,
    });
    const retryHref = `/api/auth/logto/sign-in?${params.toString()}`;
    const authError = input.authError?.trim() || null;
    const loggedOut = input.logout === "success";

    if (authError || loggedOut) {
        return {
            authError,
            kind: "recovery",
            loggedOut,
            retryHref,
        };
    }

    return {
        href: retryHref,
        kind: "redirect",
    };
}
