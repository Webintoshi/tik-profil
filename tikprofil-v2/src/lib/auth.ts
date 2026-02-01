import bcrypt from "bcryptjs";
import { getSessionSecret, getSessionSecretBytes } from "./env";

/**
 * Secure Authentication Utilities
 * Uses Web Crypto API (Edge Runtime compatible)
 * No external dependencies required
 */

// Salt length for password hashing
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Convert Uint8Array to hex string
 */
function bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Hash a password using PBKDF2
 * Returns: salt:hash (both in hex)
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = generateSalt();
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive hash
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        KEY_LENGTH * 8
    );

    const hashArray = new Uint8Array(hashBuffer);
    const saltHex = bufferToHex(salt);
    const hashHex = bufferToHex(hashArray);

    return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
        if (storedHash.startsWith('$2')) {
            return await bcrypt.compare(password, storedHash);
        }

        // Handle legacy Base64 passwords (migration support)
        if (!storedHash.includes(':')) {
            // Legacy format 1: Base64 of password + "_secured"
            const legacyHashSecured = Buffer.from(password + "_secured").toString('base64');
            if (legacyHashSecured === storedHash) {
                return true;
            }
            // Legacy format 2: Plain Base64 of password
            const legacyHash = Buffer.from(password).toString('base64');
            return legacyHash === storedHash;
        }

        const [saltHex, expectedHashHex] = storedHash.split(':');
        const salt = hexToBuffer(saltHex);
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        // Import password as key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        );

        // Derive hash
        const hashBuffer = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt as BufferSource,
                iterations: ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            KEY_LENGTH * 8
        );

        const hashArray = new Uint8Array(hashBuffer);
        const hashHex = bufferToHex(hashArray);

        // Constant-time comparison to prevent timing attacks
        if (hashHex.length !== expectedHashHex.length) {
            return false;
        }

        let diff = 0;
        for (let i = 0; i < hashHex.length; i++) {
            diff |= hashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
        }

        return diff === 0;
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}

/**
 * Create a signed session token using HMAC
 */
export async function createSessionToken(payload: object): Promise<string> {
    const secret = getSessionSecret();
    const encoder = new TextEncoder();

    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadJson).toString('base64url');

    // Create HMAC signature
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payloadBase64)
    );

    const signature = bufferToHex(new Uint8Array(signatureBuffer));

    return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<object | null> {
    try {
        const secret = getSessionSecret();
        const encoder = new TextEncoder();

        const [payloadBase64, signature] = token.split('.');
        if (!payloadBase64 || !signature) {
            return null;
        }

        // Verify signature
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signatureBuffer = hexToBuffer(signature);
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBuffer as BufferSource,
            encoder.encode(payloadBase64)
        );

        if (!isValid) {
            return null;
        }

        // Decode payload
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString();
        return JSON.parse(payloadJson);
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// ===============================================
// ADMIN AUTHENTICATION FUNCTIONS (Legacy Support)
// ===============================================

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = getSessionSecretBytes();
const COOKIE_NAME = "tikprofil_session";
const ADMIN_SALT_ROUNDS = 12;

export interface SessionPayload {
    username: string;
    ip?: string;
    iat?: number;
    exp?: number;
}

/**
 * Validate admin credentials against admins table
 */
export async function validateCredentials(username: string, password: string): Promise<boolean> {
    try {
        const { getSupabaseAdmin } = await import('./supabase');
        const supabase = getSupabaseAdmin();

        // Query directly from admins table
        const { data: admin, error } = await supabase
            .from('admins')
            .select('id, username, passwordHash, isActive')
            .eq('username', username)
            .maybeSingle();

        if (error) {
            console.error("Error fetching admin:", error);
            return false;
        }

        if (!admin) {
            return false;
        }

        // Check if admin is active
        if (admin.isActive === false) {
            return false;
        }

        // Verify password using secure verifyPassword function
        const storedHash = admin.passwordHash as string;
        const isValid = await verifyPassword(password, storedHash);

        if (isValid) {
            // Migrate legacy hashes to bcrypt if needed
            const isLegacyHash = !storedHash.startsWith("$2") && !storedHash.includes(":");
            if (isLegacyHash) {
                try {
                    const salt = await bcrypt.genSalt(ADMIN_SALT_ROUNDS);
                    const newHash = await bcrypt.hash(password, salt);
                    await supabase
                        .from('admins')
                        .update({ passwordHash: newHash })
                        .eq('id', admin.id);
                } catch (migrationError) {
                    console.warn("Admin password migration failed:", migrationError);
                }
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error validating credentials:", error);
        return false;
    }
}

/**
 * Create admin session token (JWT)
 */
export async function createSession(payload: Partial<SessionPayload>): Promise<string> {
    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);
    return token;
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
    });
}

/**
 * Get current admin session
 */
export async function getSession(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) return null;

        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

/**
 * Clear admin session
 */
export async function clearSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

