function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function getErrorMessage(
    error: unknown,
    fallback = "Islem tamamlanamadi.",
): string {
    if (typeof error === "string" && error.trim()) {
        return error.trim();
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    if (isRecord(error)) {
        const message = error.message;
        if (typeof message === "string" && message.trim()) {
            return message.trim();
        }

        const apiError = error.error;
        if (typeof apiError === "string" && apiError.trim()) {
            return apiError.trim();
        }

        const details = error.details;
        if (Array.isArray(details)) {
            const firstDetail = details.find(
                (detail): detail is string =>
                    typeof detail === "string" && detail.trim().length > 0,
            );
            if (firstDetail) {
                return firstDetail.trim();
            }
        }
    }

    return fallback;
}
