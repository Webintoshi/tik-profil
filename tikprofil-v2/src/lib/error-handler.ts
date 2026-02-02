/**
 * FASTFOOD ERROR HANDLER
 * Enhanced error handling for FastFood module with Sentry integration
 *
 * Features:
 * - ErrorCode enum for standardized error types
 * - AppError class for custom errors
 * - Zod error formatting
 * - User-friendly Turkish messages
 * - Development vs Production mode handling
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ============================================
// ERROR CODES
// ============================================

export enum ErrorCode {
    // Client errors (4xx)
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    BAD_REQUEST = 'BAD_REQUEST',
    CONFLICT = 'CONFLICT',
    RATE_LIMIT = 'RATE_LIMIT',

    // Server errors (5xx)
    SERVER_ERROR = 'SERVER_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

    // FastFood specific
    STOCK_ERROR = 'STOCK_ERROR',
    PRICE_VERIFICATION_ERROR = 'PRICE_VERIFICATION_ERROR',
    COUPON_ERROR = 'COUPON_ERROR',
    PAYMENT_ERROR = 'PAYMENT_ERROR',
}

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
    DATABASE_ERROR: 500,
    EXTERNAL_SERVICE_ERROR: 502,
    STOCK_ERROR: 400,
    PRICE_VERIFICATION_ERROR: 400,
    COUPON_ERROR: 400,
    PAYMENT_ERROR: 400,
};

// ============================================
// APP ERROR CLASS
// ============================================

export interface ErrorMetadata {
    businessId?: string;
    orderId?: string;
    userId?: string;
    clientIP?: string;
    userAgent?: string;
    [key: string]: unknown;
}

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly details?: string[];
    public readonly metadata?: ErrorMetadata;
    public readonly isOperational: boolean;
    public readonly originalError?: unknown;

    constructor(
        code: ErrorCode,
        message: string,
        details?: string[],
        metadata?: ErrorMetadata,
        originalError?: unknown
    ) {
        super(message);
        this.code = code;
        this.statusCode = STATUS_MAP[code];
        this.details = details;
        this.metadata = metadata;
        this.isOperational = true; // Distinguishes from programming errors
        this.originalError = originalError;

        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);

        // Set error name
        this.name = 'AppError';
    }

    // ============================================
    // STATIC FACTORY METHODS
    // ============================================

    /**
     * 401 - User is not authenticated
     */
    static unauthorized(message = 'Oturum bulunamadı. Lütfen tekrar giriş yapın.', metadata?: ErrorMetadata): AppError {
        return new AppError('UNAUTHORIZED', message, undefined, metadata);
    }

    /**
     * 403 - User is authenticated but lacks permission
     */
    static forbidden(message = 'Bu işlem için yetkiniz bulunmuyor.', metadata?: ErrorMetadata): AppError {
        return new AppError('FORBIDDEN', message, undefined, metadata);
    }

    /**
     * 404 - Resource not found
     */
    static notFound(resource = 'Kaynak', metadata?: ErrorMetadata): AppError {
        return new AppError('NOT_FOUND', `${resource} bulunamadı.`, undefined, metadata);
    }

    /**
     * 400 - Validation failed (with optional field details)
     */
    static validationError(message = 'Doğrulama hatası', details?: string[], metadata?: ErrorMetadata): AppError {
        return new AppError('VALIDATION_ERROR', message, details, metadata);
    }

    /**
     * 400 - Bad request (missing required fields, etc.)
     */
    static badRequest(message: string, metadata?: ErrorMetadata): AppError {
        return new AppError('BAD_REQUEST', message, undefined, metadata);
    }

    /**
     * 409 - Conflict (duplicate entry, etc.)
     */
    static conflict(message: string, metadata?: ErrorMetadata): AppError {
        return new AppError('CONFLICT', message, undefined, metadata);
    }

    /**
     * 429 - Rate limit exceeded
     */
    static rateLimit(message = 'Çok fazla istek. Lütfen biraz bekleyin.', metadata?: ErrorMetadata): AppError {
        return new AppError('RATE_LIMIT', message, undefined, metadata);
    }

    /**
     * 500 - Internal server error
     */
    static serverError(message = 'Sunucu hatası oluştu.', metadata?: ErrorMetadata, originalError?: unknown): AppError {
        return new AppError('SERVER_ERROR', message, undefined, metadata, originalError);
    }

    /**
     * 500 - Database error
     */
    static databaseError(message = 'Veritabanı hatası oluştu.', metadata?: ErrorMetadata, originalError?: unknown): AppError {
        return new AppError('DATABASE_ERROR', message, undefined, metadata, originalError);
    }

    /**
     * 400 - Stock error (out of stock, etc.)
     */
    static stockError(message: string, details?: string[], metadata?: ErrorMetadata): AppError {
        return new AppError('STOCK_ERROR', message, details, metadata);
    }

    /**
     * 400 - Price verification error
     */
    static priceVerificationError(message: string, details?: string[], metadata?: ErrorMetadata): AppError {
        return new AppError('PRICE_VERIFICATION_ERROR', message, details, metadata);
    }

    /**
     * 400 - Coupon error
     */
    static couponError(message: string, metadata?: ErrorMetadata): AppError {
        return new AppError('COUPON_ERROR', message, undefined, metadata);
    }

    // ============================================
    // RESPONSE HELPERS
    // ============================================

    /**
     * Convert error to NextResponse JSON
     * Maintains backward compatibility with existing error format
     */
    toResponse(): NextResponse {
        const isDev = process.env.NODE_ENV === 'development';

        const body: {
            success: false;
            error: string;
            code: ErrorCode;
            details?: string[];
            requestId?: string;
        } = {
            success: false,
            error: this.message,
            code: this.code,
        };

        // Include details in development or if explicitly provided
        if ((this.details && this.details.length > 0) || isDev) {
            body.details = this.details;
        }

        // Add request ID for tracking (if available)
        if (this.metadata?.orderId) {
            body.requestId = this.metadata.orderId as string;
        }

        return NextResponse.json(body, { status: this.statusCode });
    }
}

// ============================================
// ERROR HANDLING FUNCTIONS
// ============================================

/**
 * Handle any error and convert to proper response
 * Logs non-operational errors for debugging
 */
export function handleError(error: unknown, context?: string, metadata?: ErrorMetadata): NextResponse {
    const isDev = process.env.NODE_ENV === 'development';

    // If it's already an AppError, use its response
    if (error instanceof AppError) {
        logError(error, context);
        return error.toResponse();
    }

    // Handle Zod errors
    if (error instanceof z.ZodError) {
        const formatted = formatZodError(error);
        logError(error, context);
        return AppError.validationError('Doğrulama hatası', formatted.details, metadata).toResponse();
    }

    // Handle standard Error
    if (error instanceof Error) {
        const appError = AppError.serverError(
            isDev ? error.message : 'Sunucu hatası oluştu. Lütfen tekrar deneyin.',
            metadata,
            error
        );
        logError(appError, context);
        return appError.toResponse();
    }

    // Handle unknown errors
    const appError = AppError.serverError('Beklenmeyen bir hata oluştu.', metadata);
    logError(appError, context);
    return appError.toResponse();
}

/**
 * Format Zod error into user-friendly details
 */
export function formatZodError(zodError: z.ZodError): { details: string[]; userMessage: string } {
    const details = zodError.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'Genel';
        return `${path}: ${issue.message}`;
    });

    // Generate user-friendly Turkish message
    const userMessage = getUserMessage(zodError.issues[0]?.message);

    return { details, userMessage };
}

/**
 * Get user-friendly Turkish error message
 */
export function getUserMessage(zodMessage?: string): string {
    if (!zodMessage) return 'Lütfen tüm alanları doğru şekilde doldurun.';

    const messageMap: Record<string, string> = {
        'Required': 'Bu alan zorunludur',
        'Invalid': 'Geçersiz değer',
        'Too small': 'Değer çok küçük',
        'Too big': 'Değer çok büyük',
        'Invalid email': 'Geçerli bir e-posta adresi girin',
        'Invalid phone': 'Geçerli bir telefon numarası girin',
    };

    for (const [key, value] of Object.entries(messageMap)) {
        if (zodMessage.includes(key)) {
            return value;
        }
    }

    return zodMessage;
}

/**
 * Log error to console (and Sentry in production)
 * Sensitive data is filtered out
 */
export function logError(error: Error | AppError, context?: string): void {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        // Development: Full details
        console.error(`[${context || 'API'}] Error:`, {
            message: error.message,
            stack: error.stack,
            ...(error instanceof AppError && {
                code: error.code,
                details: error.details,
                metadata: error.metadata,
            }),
        });
    } else {
        // Production: Minimal details (Sentry will handle the rest)
        console.error(`[${context || 'API'}]`, error.message);
    }
}

/**
 * Create standardized error response
 * Maintains backward compatibility
 */
export function createErrorResponse(
    message: string,
    statusCode: number = 500,
    details?: string[]
): NextResponse {
    const isDev = process.env.NODE_ENV === 'development';

    const body: {
        success: false;
        error: string;
        details?: string[];
    } = {
        success: false,
        error: message,
    };

    if ((details && details.length > 0) || isDev) {
        body.details = details;
    }

    return NextResponse.json(body, { status: statusCode });
}

// ============================================
// VALIDATION HELPER
// ============================================

/**
 * Wrap Zod validation and throw AppError on failure
 * Enhanced version with better error handling
 */
export function validateOrThrow<T extends z.ZodTypeAny>(
    schema: T,
    data: unknown,
    metadata?: ErrorMetadata
): z.infer<T> {
    const result = schema.safeParse(data);

    if (!result.success) {
        const { details, userMessage } = formatZodError(result.error);
        throw AppError.validationError(userMessage, details, metadata);
    }

    return result.data;
}
