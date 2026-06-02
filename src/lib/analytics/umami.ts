const UMAMI_EVENT_NAMES = [
    "profile_view",
    "cta_call",
    "cta_whatsapp",
    "cta_directions",
    "discover_view",
    "discover_search",
    "business_card_click",
    "claim_started",
    "claim_submitted",
    "qr_scan",
    "module_purchase_started",
    "module_purchase_completed",
] as const;

const BLOCKED_PAYLOAD_KEYS = new Set([
    "email",
    "phone",
    "name",
    "fullname",
    "firstname",
    "lastname",
    "address",
    "fulladdress",
    "street",
    "streetaddress",
    "line1",
    "line2",
    "token",
    "password",
]);

type UmamiValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, unknown>
    | UmamiValue[];

type BrowserUmami = {
    track: (eventName: UmamiEventName, payload?: Record<string, unknown>) => void;
};

export type UmamiEventName = (typeof UMAMI_EVENT_NAMES)[number];
export type UmamiPayload = Record<string, unknown>;

function normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shouldStripKey(key: string): boolean {
    return BLOCKED_PAYLOAD_KEYS.has(normalizeKey(key));
}

function sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (value && typeof value === "object") {
        return sanitizeUmamiPayload(value as Record<string, unknown>);
    }

    return value;
}

function getBrowserUmami(): BrowserUmami | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    return (window as Window & { umami?: BrowserUmami }).umami;
}

export function isUmamiConfigured(): boolean {
    return Boolean(
        process.env.UMAMI_WEBSITE_ID?.trim() ||
        process.env.NEXT_PUBLIC_UMAMI_SRC?.trim(),
    );
}

export function sanitizeUmamiPayload(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!payload) {
        return undefined;
    }

    const sanitizedEntries = Object.entries(payload).flatMap(([key, value]) => {
        if (shouldStripKey(key)) {
            return [];
        }

        return [[key, sanitizeValue(value)]];
    });

    if (sanitizedEntries.length === 0) {
        return undefined;
    }

    return Object.fromEntries(sanitizedEntries);
}

export function trackUmamiEvent(
    eventName: UmamiEventName,
    payload?: UmamiPayload,
): boolean {
    if (!isUmamiConfigured()) {
        return false;
    }

    const umami = getBrowserUmami();
    if (!umami?.track) {
        return false;
    }

    umami.track(eventName, sanitizeUmamiPayload(payload));
    return true;
}
