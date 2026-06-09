import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getSessionSecretBytes } from "./env";

export const CUSTOMER_SESSION_COOKIE = "tikprofil_customer_session";

export type CustomerAuthProvider = "google" | "logto" | "native_otp";

export interface CustomerSession {
    appUserId: string;
    authProvider: CustomerAuthProvider;
    displayName?: string;
    email?: string;
    logtoSub: string;
    role: "customer";
}

function getJwtSecret(): Uint8Array {
    return getSessionSecretBytes();
}

function asOptionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isCustomerAuthProvider(value: unknown): value is CustomerAuthProvider {
    return value === "logto" || value === "native_otp" || value === "google";
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

        if (!token) {
            return null;
        }

        const { payload } = await jwtVerify(token, getJwtSecret());
        const appUserId = asOptionalString(payload.appUserId);
        const authProvider = payload.authProvider;
        const logtoSub = asOptionalString(payload.logtoSub);

        if (!appUserId || !isCustomerAuthProvider(authProvider) || !logtoSub || payload.role !== "customer") {
            return null;
        }

        return {
            appUserId,
            authProvider,
            displayName: asOptionalString(payload.displayName),
            email: asOptionalString(payload.email),
            logtoSub,
            role: "customer",
        };
    } catch {
        return null;
    }
}
