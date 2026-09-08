export interface ToshiRateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

export interface ToshiRateLimiter {
    consume(key: string): ToshiRateLimitResult;
}

interface ToshiRateLimitOptions {
    limit: number;
    windowMs: number;
    now?: () => number;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export function createToshiRateLimiter(options: ToshiRateLimitOptions): ToshiRateLimiter {
    const entries = new Map<string, RateLimitEntry>();
    const now = options.now ?? Date.now;

    return {
        consume(key) {
            const currentTime = now();
            const current = entries.get(key);
            if (!current && entries.size >= 5_000) {
                for (const [entryKey, value] of entries) if (value.resetAt <= currentTime) entries.delete(entryKey);
                if (entries.size >= 5_000) return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
            }
            const entry = !current || current.resetAt <= currentTime
                ? { count: 0, resetAt: currentTime + options.windowMs }
                : current;
            entry.count += 1;
            entries.set(key, entry);

            if (entries.size > 5_000) {
                for (const [entryKey, value] of entries) {
                    if (value.resetAt <= currentTime) entries.delete(entryKey);
                }
            }

            return {
                allowed: entry.count <= options.limit,
                remaining: Math.max(0, options.limit - entry.count),
                retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1_000)),
            };
        },
    };
}
