import { SignJWT } from "jose";
import { getSessionSecretBytes } from "../../../lib/env.ts";
import type { CustomerAuthProvider } from "../../../lib/customerAuth.ts";

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
