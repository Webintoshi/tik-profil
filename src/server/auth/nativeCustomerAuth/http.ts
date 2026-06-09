import { NextResponse } from "next/server";
import { NativeCustomerAuthError } from "./errors.ts";

export function nativeCustomerAuthErrorResponse(error: unknown, context: string): NextResponse {
    if (error instanceof NativeCustomerAuthError) {
        return NextResponse.json(
            {
                code: error.code,
                error: error.message,
                success: false,
            },
            { status: error.statusCode },
        );
    }

    console.error(`[${context}] Unexpected native customer auth error:`, error);
    return NextResponse.json(
        {
            code: "SERVER_ERROR",
            error: "Sunucu hatasi olustu.",
            success: false,
        },
        { status: 500 },
    );
}

export function invalidGoogleTokenResponse(): NextResponse {
    return NextResponse.json(
        {
            code: "GOOGLE_TOKEN_INVALID",
            error: "Google oturumu dogrulanamadi.",
            success: false,
        },
        { status: 401 },
    );
}
