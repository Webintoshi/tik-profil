function asOrigin(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
    } catch {
        return null;
    }
}

export function isTrustedRequestOrigin(
    headers: Headers,
    configuredAppUrl: string | undefined,
    additionalOrigins: readonly string[] = [],
): boolean {
    const originHeader = headers.get("origin");
    const refererHeader = headers.get("referer");
    if (!originHeader && !refererHeader) return true;

    const allowed = new Set<string>();
    const configuredOrigin = asOrigin(configuredAppUrl);
    if (configuredOrigin) allowed.add(configuredOrigin);
    for (const value of additionalOrigins) {
        const origin = asOrigin(value);
        if (origin) allowed.add(origin);
    }

    const requestOrigin = originHeader ? asOrigin(originHeader) : asOrigin(refererHeader);
    return requestOrigin !== null && allowed.has(requestOrigin);
}
