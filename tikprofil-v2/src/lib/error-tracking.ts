/**
 * FASTFOOD ERROR TRACKING
 * Sentry integration for FastFood module with development mode support
 *
 * Features:
 * - Sentry SDK initialization
 * - Exception & message capture
 * - User context tracking
 * - Breadcrumb tracking for checkout flow
 * - Performance monitoring
 * - Development console logging
 */

import * as Sentry from '@sentry/nextjs';

// ============================================
// TYPES
// ============================================

export interface SentryUser {
    id: string;
    email?: string;
    phone?: string;
    role?: string;
}

export interface BreadcrumbData {
    category?: string;
    message: string;
    level?: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, unknown>;
}

export interface CheckoutEvent {
    businessId: string;
    businessName?: string;
    orderId?: string;
    items: number;
    total: number;
    paymentMethod: string;
    deliveryType: string;
    customerPhone: string;
    clientIP: string;
}

// ============================================
// CONFIGURATION
// ============================================

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = ENVIRONMENT === 'production';

/**
 * Check if Sentry is enabled and configured
 */
export function isSentryEnabled(): boolean {
    return IS_PRODUCTION && !!SENTRY_DSN;
}

/**
 * Initialize Sentry for the application
 * Call this once at app startup (e.g., in layout.ts or middleware)
 */
export function initSentry(): void {
    if (!SENTRY_DSN) {
        if (IS_PRODUCTION) {
            console.warn('[Sentry] DSN not configured. Error tracking disabled.');
        } else {
            console.log('[Sentry] Running in development mode. Console logging enabled.');
        }
        return;
    }

    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            environment: ENVIRONMENT,

            // Sample rates (adjust based on traffic)
            tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in production, 100% in dev

            // Before send hook (filter sensitive data)
            beforeSend(event, hint) {
                // Filter out sensitive data from request
                if (event.request) {
                    // Remove passwords, tokens, etc.
                    if (event.request.headers) {
                        delete (event.request.headers as Record<string, unknown>)['authorization'];
                        delete (event.request.headers as Record<string, unknown>)['cookie'];
                    }
                }

                // Filter out sensitive data from extra data
                if (event.extra) {
                    const sanitizedExtra: Record<string, unknown> = {};
                    for (const [key, value] of Object.entries(event.extra)) {
                        // Skip keys that might contain sensitive data
                        if (key.toLowerCase().includes('password') ||
                            key.toLowerCase().includes('token') ||
                            key.toLowerCase().includes('secret') ||
                            key.toLowerCase().includes('key')) {
                            continue;
                        }
                        sanitizedExtra[key] = value;
                    }
                    event.extra = sanitizedExtra;
                }

                // Add environment info
                event.tags = event.tags || {};
                event.tags['module'] = 'fastfood';

                return event;
            },

            // Before breadcrumb hook (filter sensitive breadcrumbs)
            beforeBreadcrumb(breadcrumb, hint) {
                // Filter out breadcrumbs that might contain sensitive data
                if (breadcrumb.message) {
                    const msg = breadcrumb.message.toLowerCase();
                    if (msg.includes('password') ||
                        msg.includes('token') ||
                        msg.includes('secret')) {
                        return null; // Don't send this breadcrumb
                    }
                }

                return breadcrumb;
            },

            // Debug mode (additional logging)
            debug: !IS_PRODUCTION,
        });

        console.log('[Sentry] Initialized successfully');
    } catch (error) {
        console.error('[Sentry] Initialization failed:', error);
    }
}

// ============================================
// ERROR CAPTURE
// ============================================

/**
 * Capture an exception in Sentry
 * In development mode, logs to console instead
 */
export function captureException(
    error: unknown,
    context?: string,
    metadata?: Record<string, unknown>
): void {
    if (isSentryEnabled()) {
        // Production: Send to Sentry
        Sentry.captureException(error, {
            tags: {
                context: context || 'fastfood',
                ...metadata,
            },
            extra: metadata,
        });
    } else {
        // Development: Log to console
        console.error(`[Sentry Capture - ${context || 'fastfood'}]`, error);
        if (metadata) {
            console.error('[Metadata]', metadata);
        }
    }
}

/**
 * Capture a message in Sentry
 * Useful for logging important events that aren't errors
 */
export function captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: string,
    metadata?: Record<string, unknown>
): void {
    if (isSentryEnabled()) {
        Sentry.captureMessage(message, {
            level,
            tags: {
                context: context || 'fastfood',
                ...metadata,
            },
            extra: metadata,
        });
    } else {
        // Development: Log to console
        const logMethod = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
        logMethod(`[Sentry Message - ${context || 'fastfood'}]`, message);
        if (metadata) {
            logMethod('[Metadata]', metadata);
        }
    }
}

// ============================================
// USER CONTEXT
// ============================================

/**
 * Set user context for all future events
 */
export function setSentryUser(user: SentryUser | null): void {
    if (isSentryEnabled()) {
        if (user) {
            Sentry.setUser({
                id: user.id,
                email: user.email,
                // Don't send phone to Sentry (PII)
                // phone: user.phone,
            });
        } else {
            Sentry.setUser(null);
        }
    } else {
        if (user) {
            console.log('[Sentry User]', {
                id: user.id,
                email: user.email,
                role: user.role,
            });
        } else {
            console.log('[Sentry User] Cleared');
        }
    }
}

// ============================================
// BREADCRUMBS
// ============================================

/**
 * Add a breadcrumb for tracking user flow
 * Breadcrumbs show up in Sentry error reports
 */
export function addBreadcrumb(data: BreadcrumbData): void {
    const breadcrumb: Sentry.Breadcrumb = {
        category: data.category || 'fastfood',
        message: data.message,
        level: data.level || 'info',
        data: data.data,
    };

    if (isSentryEnabled()) {
        Sentry.addBreadcrumb(breadcrumb);
    } else {
        // Development: Log to console
        const logMethod = data.level === 'error' ? console.error : data.level === 'warning' ? console.warn : console.log;
        logMethod(`[Breadcrumb - ${data.category || 'fastfood'}]`, data.message, data.data || '');
    }
}

// ============================================
// CHECKOUT TRACKING
// ============================================

/**
 * Track checkout-specific events with breadcrumbs
 * Use this throughout the checkout flow for better error context
 */
export function captureCheckoutEvent(
    step: string,
    event: Partial<CheckoutEvent>,
    level: 'info' | 'warning' | 'error' = 'info'
): void {
    const sanitizedEvent: Record<string, unknown> = {
        step,
        businessId: event.businessId,
        businessName: event.businessName,
        orderId: event.orderId,
        items: event.items,
        total: event.total,
        paymentMethod: event.paymentMethod,
        deliveryType: event.deliveryType,
        // Don't include customerPhone or clientIP in Sentry (PII)
        hasPhone: !!event.customerPhone,
        hasIP: !!event.clientIP,
    };

    addBreadcrumb({
        category: 'checkout',
        message: `Checkout step: ${step}`,
        level,
        data: sanitizedEvent,
    });
}

/**
 * Start a performance transaction for checkout flow
 * Returns a transaction span that you can use to measure performance
 */
export function startCheckoutTimer(businessId: string, orderId?: string): Sentry.Span | null {
    if (!isSentryEnabled()) {
        console.log(`[Checkout Timer] Started for business ${businessId}, order ${orderId || 'pending'}`);
        return null;
    }

    const transaction = Sentry.startTransaction({
        name: 'fastfood_checkout',
        op: 'checkout',
        data: {
            businessId,
            orderId: orderId || 'pending',
        },
    });

    return transaction;
}

/**
 * Finish a checkout transaction
 */
export function finishCheckoutTimer(transaction: Sentry.Span | null, status: 'ok' | 'internal_error'): void {
    if (!transaction) {
        console.log(`[Checkout Timer] Finished with status: ${status}`);
        return;
    }

    transaction.setStatus({ status });
    transaction.finish();
}

// ============================================
// SECURITY
// ============================================

/**
 * Sanitize data before sending to Sentry
 * Removes sensitive information like passwords, tokens, etc.
 */
export function sanitizeForSentry(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();

        // Skip sensitive keys
        if (lowerKey.includes('password') ||
            lowerKey.includes('token') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('key') ||
            lowerKey.includes('authorization')) {
            sanitized[key] = '[REDACTED]';
            continue;
        }

        // Recursively sanitize nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeForSentry(value as Record<string, unknown>);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-initialize on import (in production)
if (IS_PRODUCTION && SENTRY_DSN) {
    initSentry();
}
