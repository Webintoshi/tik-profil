import {
    createHash,
    createHmac,
    randomBytes,
    randomInt,
    timingSafeEqual,
} from "node:crypto";

import { jwtVerify, SignJWT, type JWTPayload } from "jose";

export const NATIVE_ACCESS_TOKEN_TTL_SECONDS = 10 * 60;
export const NATIVE_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NativeAccessClaims extends JWTPayload {
    email: string;
    role: "customer";
    sid: string;
}

export function normalizeEmail(email: string): string {
    return email.trim().toLocaleLowerCase("en-US");
}

export function generateOtpCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashIdentifier(value: string, secret: string): string {
    return createHmac("sha256", secret).update(value.trim()).digest("hex");
}

export function hashOtp(input: {
    challengeId: string;
    code: string;
    email: string;
    purpose: "sign_in" | "sign_up";
    secret: string;
}): string {
    return createHmac("sha256", input.secret)
        .update(`${input.challengeId}:${normalizeEmail(input.email)}:${input.purpose}:${input.code}`)
        .digest("hex");
}

export function constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "utf8");
    const rightBuffer = Buffer.from(right, "utf8");
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createRefreshToken(sessionId: string): { token: string; tokenHash: string } {
    const secret = randomBytes(32).toString("base64url");
    const token = `${sessionId}.${secret}`;
    return { token, tokenHash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function parseRefreshToken(token: string): { sessionId: string } | null {
    const separator = token.indexOf(".");
    if (separator < 1 || separator === token.length - 1) return null;
    const sessionId = token.slice(0, separator);
    const secret = token.slice(separator + 1);
    if (!SESSION_ID_PATTERN.test(sessionId) || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return null;
    return { sessionId };
}

export async function signNativeAccessToken(input: {
    appUserId: string;
    email: string;
    sessionId: string;
    secret: string;
}): Promise<string> {
    return new SignJWT({
        email: normalizeEmail(input.email),
        role: "customer",
        sid: input.sessionId,
    })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(input.appUserId)
        .setIssuer("tikprofil-auth")
        .setAudience("tikprofil-mobile-api")
        .setJti(randomBytes(16).toString("hex"))
        .setIssuedAt()
        .setExpirationTime(`${NATIVE_ACCESS_TOKEN_TTL_SECONDS}s`)
        .sign(new TextEncoder().encode(input.secret));
}

export async function verifyNativeAccessToken(token: string, secret: string): Promise<NativeAccessClaims> {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ["HS256"],
        audience: "tikprofil-mobile-api",
        issuer: "tikprofil-auth",
    });
    if (
        !payload.sub
        || typeof payload.email !== "string"
        || payload.role !== "customer"
        || typeof payload.sid !== "string"
    ) {
        throw new Error("Native access token claims are invalid.");
    }
    return payload as NativeAccessClaims;
}

