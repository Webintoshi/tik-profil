import { SignJWT } from "jose";
import { getSessionSecretBytes } from "../../../lib/env.ts";
import type { CustomerAuthProvider } from "../../../lib/customerAuth.ts";

const CUSTOMER_SESSION_COOKIE = "tikprofil_customer_session";
const CUSTOMER_SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export interface NativeCustomerSessionInput {
    appUserId: string;
    authProvider: Exclude<CustomerAuthProvider, "logto">;
    displayName: null | string;
    email: null | string;
    subject: string;
}

export async function createNativeCustomerSessionToken(input: NativeCustomerSessionInput): Promise<string> {
    return new SignJWT({
        appUserId: input.appUserId,
        authProvider: input.authProvider,
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.email ? { email: input.email } : {}),
        logtoSub: input.subject,
        role: "customer",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getSessionSecretBytes());
}

function buildCustomerSessionCookieOptions() {
    return {
        httpOnly: true,
        maxAge: CUSTOMER_SESSION_DURATION_SECONDS,
        path: "/",
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
    };
}

export function buildNativeCustomerSessionSetCookieHeader(token: string): string {
    const options = buildCustomerSessionCookieOptions();
    const parts = [
        `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
        `Max-Age=${options.maxAge}`,
        `Path=${options.path}`,
        "HttpOnly",
        "SameSite=Lax",
    ];

    if (options.secure) {
        parts.push("Secure");
    }

    return parts.join("; ");
}

export function setNativeCustomerSessionCookie(
    response: {
        cookies: {
            set(name: string, value: string, options: ReturnType<typeof buildCustomerSessionCookieOptions>): void;
        };
    },
    token: string,
) {
    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, buildCustomerSessionCookieOptions());
}
