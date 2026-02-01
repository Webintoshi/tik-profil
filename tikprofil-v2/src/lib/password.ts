/**
 * IRON DOME - Password Security Module
 * Uses bcrypt for secure password hashing
 */

import bcrypt from 'bcryptjs';

// Work factor - higher = more secure but slower
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a stored hash
 * Supports both bcrypt and legacy Base64 detection
 * @param password Plain text password to verify
 * @param storedHash Hash from database
 * @returns Object with verified status and legacy flag
 */
export async function verifyPassword(
    password: string,
    storedHash: string
): Promise<{ verified: boolean; isLegacy: boolean }> {
    // Detect legacy Base64 passwords (they don't start with $2)
    const isBcryptHash = storedHash.startsWith('$2');

    if (!isBcryptHash) {
        // Legacy Base64 check - for migration purposes only
        const legacyHash = Buffer.from(password).toString('base64');
        if (legacyHash === storedHash) {
            return { verified: true, isLegacy: true };
        }
        return { verified: false, isLegacy: true };
    }

    // Bcrypt verification
    const isValid = await bcrypt.compare(password, storedHash);
    return { verified: isValid, isLegacy: false };
}

/**
 * Check if a hash is legacy (non-bcrypt)
 */
export function isLegacyHash(hash: string): boolean {
    return !hash.startsWith('$2');
}
