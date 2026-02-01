/**
 * IRON DOME - Centralized Error Handling
 * 
 * AppError class and helper functions for consistent API error responses.
 * Usage:
 *   throw AppError.unauthorized("Oturum bulunamadı");
 *   return AppError.toResponse(error);
 */

import { NextResponse } from 'next/server';

// ============================================
// ERROR CODES
// ============================================

export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'BAD_REQUEST'
    | 'CONFLICT'
    | 'RATE_LIMIT'
    | 'SERVER_ERROR';

// HTTP Status mapping
const STATUS_MAP: Record<ErrorCode, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    BAD_REQUEST: 400,
    CONFLICT: 409,
    RATE_LIMIT: 429,
    SERVER_ERROR: 500,
};

// ============================================
// APP ERROR CLASS
// ============================================

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly details?: string[];
    public readonly isOperational: boolean;

    constructor(
        code: ErrorCode,
        message: string,
        details?: string[]
    ) {
        super(message);
        this.code = code;
        this.statusCode = STATUS_MAP[code];
        this.details = details;
        this.isOperational = true; // Distinguishes from programming errors

        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    // ============================================
    // STATIC FACTORY METHODS
    // ============================================

    /**
     * 401 - User is not authenticated
     */
    static unauthorized(message = 'Oturum bulunamadı. Lütfen tekrar giriş yapın.'): AppError {
        return new AppError('UNAUTHORIZED', message);
    }

    /**
     * 403 - User is authenticated but lacks permission
     */
    static forbidden(message = 'Bu işlem için yetkiniz bulunmuyor.'): AppError {
        return new AppError('FORBIDDEN', message);
    }

    /**
     * 404 - Resource not found
     */
    static notFound(resource = 'Kaynak'): AppError {
        return new AppError('NOT_FOUND', `${resource} bulunamadı.`);
    }

    /**
     * 400 - Validation failed (with optional field details)
     */
    static validationError(message = 'Doğrulama hatası', details?: string[]): AppError {
        return new AppError('VALIDATION_ERROR', message, details);
    }

    /**
     * 400 - Bad request (missing required fields, etc.)
     */
    static badRequest(message: string): AppError {
        return new AppError('BAD_REQUEST', message);
    }

    /**
     * 409 - Conflict (duplicate entry, etc.)
     */
    static conflict(message: string): AppError {
        return new AppError('CONFLICT', message);
    }

    /**
     * 429 - Rate limit exceeded
     */
    static rateLimit(message = 'Çok fazla istek. Lütfen biraz bekleyin.'): AppError {
        return new AppError('RATE_LIMIT', message);
    }

    /**
     * 500 - Internal server error
     */
    static serverError(message = 'Sunucu hatası oluştu.'): AppError {
        return new AppError('SERVER_ERROR', message);
    }

    // ============================================
    // RESPONSE HELPERS
    // ============================================

    /**
     * Convert error to NextResponse JSON
     */
    toResponse(): NextResponse {
        const body: {
            success: false;
            error: string;
            code: ErrorCode;
            details?: string[];
        } = {
            success: false,
            error: this.message,
            code: this.code,
        };

        if (this.details && this.details.length > 0) {
            body.details = this.details;
        }

        return NextResponse.json(body, { status: this.statusCode });
    }

    /**
     * Static helper to handle any error and return proper response
     * Logs non-operational errors for debugging
     */
    static toResponse(error: unknown, context?: string): NextResponse {
        // If it's already an AppError, use its response
        if (error instanceof AppError) {
            return error.toResponse();
        }

        // Log unexpected errors
        console.error(`[${context || 'API'}] Unexpected error:`, error);

        // Return generic server error for non-AppError
        return new AppError('SERVER_ERROR', 'Sunucu hatası oluştu.').toResponse();
    }
}

// ============================================
// VALIDATION HELPER
// ============================================

import { z } from 'zod';

/**
 * Wrap Zod validation and throw AppError on failure
 * 
 * Usage:
 *   const data = validateOrThrow(schema, body);
 */
export function validateOrThrow<T extends z.ZodTypeAny>(
    schema: T,
    data: unknown
): z.infer<T> {
    const result = schema.safeParse(data);

    if (!result.success) {
        const details = result.error.issues.map(
            issue => `${issue.path.join('.')}: ${issue.message}`
        );
        throw AppError.validationError('Doğrulama hatası', details);
    }

    return result.data;
}

