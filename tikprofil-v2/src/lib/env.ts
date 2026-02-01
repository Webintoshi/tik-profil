/**
 * IRON DOME - Environment Variable Validation
 * Uses Zod for runtime validation of environment variables
 * Throws descriptive errors if critical vars are missing
 */

import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
    // Supabase (Server-side)
    SUPABASE_URL: z
        .string()
        .url(),
    SUPABASE_SERVICE_ROLE_KEY: z
        .string()
        .min(1, 'CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_ANON_KEY: z
        .string()
        .min(1, 'CRITICAL: Missing SUPABASE_ANON_KEY'),

    // Security (Server-side only)
    SESSION_SECRET: z
        .string()
        .min(32, 'CRITICAL: SESSION_SECRET must be at least 32 characters'),

    // Optional
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

// Type for validated environment
export type Env = z.infer<typeof envSchema>;

// Cached validated env
let cachedEnv: Env | null = null;

/**
 * Get validated environment variables
 * Throws descriptive error if validation fails
 */
export function getEnv(): Env {
    if (cachedEnv) return cachedEnv;

    // Trim all values to remove CRLF from Windows
    const trimmedEnv: Record<string, string | undefined> = {};
    for (const key of Object.keys(process.env)) {
        const value = process.env[key];
        trimmedEnv[key] = value?.trim();
    }

    const result = envSchema.safeParse(trimmedEnv);

    if (!result.success) {
        const errors = result.error.issues
            .map(e => `  - ${e.path.join('.')}: ${e.message}`)
            .join('\n');

        console.error('=== IRON DOME: ENVIRONMENT VALIDATION FAILED ===');
        console.error(errors);
        console.error('=================================================');

        throw new Error(`Environment validation failed:\n${errors}`);
    }

    cachedEnv = result.data;

    return cachedEnv;
}

/**
 * Get session secret (required)
 */
export function getSessionSecret(): string {
    const env = getEnv();
    return env.SESSION_SECRET.trim();
}

export function getSessionSecretBytes(): Uint8Array {
    return new TextEncoder().encode(getSessionSecret());
}
