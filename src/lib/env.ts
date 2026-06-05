/**
 * IRON DOME - Environment Variable Validation
 * Uses Zod for runtime validation of environment variables
 * Throws descriptive errors if critical vars are missing
 */

import { z } from 'zod';

const optionalString = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
    },
    z.string().optional()
);

const sessionSecretSchema = z
    .string()
    .min(32, 'CRITICAL: SESSION_SECRET must be at least 32 characters');

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

    // PostgreSQL foundation
    DATABASE_URL: optionalString,
    BUSINESS_DATA_PROVIDER: z.enum(['legacy_supabase', 'postgres']).default('legacy_supabase'),
    BUSINESS_DUAL_READ_COMPARE: z.enum(['0', '1']).default('0'),
    PUBLIC_PROFILE_DATA_PROVIDER: z.enum(['legacy_supabase', 'postgres']).default('legacy_supabase'),
    PUBLIC_PROFILE_DUAL_READ_COMPARE: z.enum(['0', '1']).default('0'),

    // Auth foundation
    AUTH_PROVIDER: z.enum(['legacy', 'logto']).default('legacy'),
    LOGTO_ENDPOINT: optionalString,
    LOGTO_APP_ID: optionalString,
    LOGTO_APP_SECRET: optionalString,
    LOGTO_COOKIE_SECRET: optionalString,

    // Analytics foundation
    UMAMI_WEBSITE_ID: optionalString,
    NEXT_PUBLIC_UMAMI_SRC: optionalString,

    // Optional app URLs
    APP_URL: optionalString,
    NEXT_PUBLIC_APP_URL: optionalString,
    NEXT_PUBLIC_BASE_URL: optionalString,

    // Optional
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

// Type for validated environment
export type Env = z.infer<typeof envSchema>;
export type BusinessDataProvider = Env['BUSINESS_DATA_PROVIDER'];
export type PublicProfileDataProvider = Env['PUBLIC_PROFILE_DATA_PROVIDER'];

// Cached validated env
let cachedEnv: Env | null = null;

function getTrimmedEnvValue(name: string): string | undefined {
    const value = process.env[name];
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

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
    const result = sessionSecretSchema.safeParse(getTrimmedEnvValue('SESSION_SECRET'));

    if (!result.success) {
        const errors = result.error.issues
            .map(issue => `  - SESSION_SECRET: ${issue.message}`)
            .join('\n');

        console.error('=== IRON DOME: ENVIRONMENT VALIDATION FAILED ===');
        console.error(errors);
        console.error('=================================================');

        throw new Error(`Environment validation failed:\n${errors}`);
    }

    return result.data;
}

export function getSessionSecretBytes(): Uint8Array {
    return new TextEncoder().encode(getSessionSecret());
}

export function getOptionalEnvValue(name: string): string | undefined {
    return getTrimmedEnvValue(name);
}

export function getDatabaseUrl(): string | undefined {
    return getTrimmedEnvValue('DATABASE_URL');
}

export function getBusinessDataProvider(): BusinessDataProvider {
    return getTrimmedEnvValue('BUSINESS_DATA_PROVIDER') === 'postgres'
        ? 'postgres'
        : 'legacy_supabase';
}

export function isBusinessDualReadCompareEnabled(): boolean {
    return getTrimmedEnvValue('BUSINESS_DUAL_READ_COMPARE') === '1';
}

export function getPublicProfileDataProvider(): PublicProfileDataProvider {
    return getTrimmedEnvValue('PUBLIC_PROFILE_DATA_PROVIDER') === 'postgres'
        ? 'postgres'
        : 'legacy_supabase';
}

export function isPublicProfileDualReadCompareEnabled(): boolean {
    return getTrimmedEnvValue('PUBLIC_PROFILE_DUAL_READ_COMPARE') === '1';
}

export function getAppUrl(): string | undefined {
    return getTrimmedEnvValue('APP_URL')
        ?? getTrimmedEnvValue('NEXT_PUBLIC_APP_URL')
        ?? getTrimmedEnvValue('NEXT_PUBLIC_BASE_URL');
}
