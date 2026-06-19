import { NativeCustomerAuthError } from "./errors.ts";

export function nativeCustomerAuthErrorResponse(error: unknown, context: string): Response {
    if (error instanceof NativeCustomerAuthError) {
        return Response.json(
            {
                code: error.code,
                error: error.message,
                success: false,
            },
            { status: error.statusCode },
        );
    }

    console.error(`[${context}] Unexpected native customer auth error:`, error);
    return Response.json(
        {
            code: "SERVER_ERROR",
            error: "Sunucu hatasi olustu.",
            success: false,
        },
        { status: 500 },
    );
}

export function invalidGoogleTokenResponse(): Response {
    return Response.json(
        {
            code: "GOOGLE_TOKEN_INVALID",
            error: "Google oturumu dogrulanamadi.",
            success: false,
        },
        { status: 401 },
    );
}
