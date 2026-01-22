/**
 * OWASP - Rate Limiter
 * In-memory rate limiting for brute force protection
 * 5 attempts per 10 minutes per IP
 */

interface RateLimitEntry {
    count: number;
    firstAttempt: number;
    blocked: boolean;
    blockedUntil: number;
}

// In-memory store (resets on server restart, but works for Vercel serverless)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour block

/**
 * Clean up expired entries periodically
 */
function cleanup() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        // Remove entries older than window + block duration
        if (now - entry.firstAttempt > WINDOW_MS + BLOCK_DURATION_MS) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 5 * 60 * 1000);
}

/**
 * Check if an IP is rate limited for a specific action
 * @param ip - Client IP address
 * @param action - Action type (e.g., 'login', 'register')
 * @returns Object with allowed status and retry info
 */
export function checkRateLimit(ip: string, action: string): {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
    message?: string;
} {
    const key = `${ip}:${action}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // If blocked, check if block has expired
    if (entry?.blocked) {
        if (now < entry.blockedUntil) {
            const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
            return {
                allowed: false,
                remaining: 0,
                retryAfter,
                message: `Çok fazla deneme. ${Math.ceil(retryAfter / 60)} dakika sonra tekrar deneyin.`
            };
        }
        // Block expired, reset
        rateLimitStore.delete(key);
        entry = undefined;
    }

    // If no entry or window expired, create new
    if (!entry || now - entry.firstAttempt > WINDOW_MS) {
        rateLimitStore.set(key, {
            count: 1,
            firstAttempt: now,
            blocked: false,
            blockedUntil: 0
        });
        return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
    }

    // Increment count
    entry.count++;

    // Check if exceeded
    if (entry.count > MAX_ATTEMPTS) {
        entry.blocked = true;
        entry.blockedUntil = now + BLOCK_DURATION_MS;
        rateLimitStore.set(key, entry);

        return {
            allowed: false,
            remaining: 0,
            retryAfter: BLOCK_DURATION_MS / 1000,
            message: `Çok fazla başarısız deneme. 1 saat boyunca engellendiniz.`
        };
    }

    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

/**
 * Record a successful action (resets the counter)
 */
export function recordSuccess(ip: string, action: string): void {
    const key = `${ip}:${action}`;
    rateLimitStore.delete(key);
}

/**
 * Get rate limit info for headers
 */
export function getRateLimitHeaders(ip: string, action: string): Record<string, string> {
    const { remaining, retryAfter } = checkRateLimit(ip, action);
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(MAX_ATTEMPTS),
        'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    };

    if (retryAfter) {
        headers['Retry-After'] = String(retryAfter);
    }

    return headers;
}
