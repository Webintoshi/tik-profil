export interface PublicMenuFallbackState {
    kind: "not-ready" | "error";
    title: string;
    message: string;
    retryable: boolean;
}

function getRawErrorMessage(rawError: unknown): string {
    if (typeof rawError === "string") {
        return rawError.trim();
    }

    if (typeof rawError === "object" && rawError !== null) {
        const message = "message" in rawError ? rawError.message : undefined;
        if (typeof message === "string") {
            return message.trim();
        }

        const apiError = "error" in rawError ? rawError.error : undefined;
        if (typeof apiError === "string") {
            return apiError.trim();
        }
    }

    return "";
}

export function getPublicMenuFallbackState(
    status?: number | null,
    rawError?: unknown,
): PublicMenuFallbackState {
    const errorMessage = getRawErrorMessage(rawError);

    if (status === 400 || status === 404) {
        return {
            kind: "not-ready",
            title: "Menü Hazırlanıyor",
            message: "Bu işletme için online menü henüz hazır değil.",
            retryable: false,
        };
    }

    if (/not found/i.test(errorMessage)) {
        return {
            kind: "not-ready",
            title: "Menü Hazırlanıyor",
            message: "Bu işletme için online menü henüz hazır değil.",
            retryable: false,
        };
    }

    return {
        kind: "error",
        title: "Menü Yüklenemedi",
        message: "Menü şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.",
        retryable: true,
    };
}
