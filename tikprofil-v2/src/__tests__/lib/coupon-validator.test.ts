/**
 * Coupon Validator Unit Tests
 *
 * Tests for coupon validation logic including:
 * - Valid coupon (fixed discount)
 * - Valid coupon (percentage discount)
 * - Expired coupon
 * - Usage limit exceeded
 * - Minimum order amount not met
 * - BOGO coupon calculation
 * - Coupon not applicable to category
 */

import { jest } from '@jest/globals'

// ============================================
// Coupon Validator Implementation (for testing)
// ============================================

interface Coupon {
    id: string
    code: string
    businessId: string
    discountType: 'fixed' | 'percentage' | 'free_delivery' | 'bogo'
    discountValue: number
    maxDiscountAmount?: number
    minOrderAmount?: number
    maxUsageCount?: number
    currentUsageCount?: number
    validFrom?: string
    validUntil?: string
    isActive?: boolean
    isFirstOrderOnly?: boolean
    usagePerUser?: number
    applicableTo?: 'all' | 'products' | 'categories'
    applicableProductIds?: string[]
    applicableCategoryIds?: string[]
}

const NOW = new Date('2024-01-15T12:00:00Z')

/**
 * Check if a coupon is valid
 */
function validateCoupon(params: {
    coupon: Coupon
    subtotal: number
    productIds?: string[]
    categoryIds?: string[]
    customerPhone?: string
    previousOrdersByCustomer?: number
    previousUsageByCustomer?: number
}): { valid: boolean; message?: string; coupon?: Coupon } {
    const { coupon, subtotal, productIds = [], categoryIds = [], customerPhone, previousOrdersByCustomer = 0, previousUsageByCustomer = 0 } = params

    // Check if active
    if (coupon.isActive === false) {
        return { valid: false, message: 'Bu kupon artik gecerli degil' }
    }

    // Check validity dates
    const now = NOW
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
        return { valid: false, message: 'Bu kupon henuz baslamadi' }
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
        return { valid: false, message: 'Bu kuponun suresi dolmus' }
    }

    // Check total usage limit
    const currentUsage = coupon.currentUsageCount || 0
    const maxUsage = coupon.maxUsageCount || 0
    if (maxUsage > 0 && currentUsage >= maxUsage) {
        return { valid: false, message: 'Bu kupon kullanim limitine ulasmis' }
    }

    // Check minimum order amount
    const minOrderAmount = coupon.minOrderAmount || 0
    if (subtotal < minOrderAmount) {
        return { valid: false, message: `Minimum siparis tutari: ${minOrderAmount} TL` }
    }

    // Check per-user usage limit
    if (customerPhone && coupon.usagePerUser && coupon.usagePerUser > 0) {
        if (previousUsageByCustomer >= coupon.usagePerUser) {
            return { valid: false, message: 'Bu kuponu daha once kullandiniz' }
        }
    }

    // Check first order only
    if (coupon.isFirstOrderOnly && previousOrdersByCustomer > 0) {
        return { valid: false, message: 'Bu kupon sadece ilk siparis icin gecerli' }
    }

    // Check product restrictions
    if (coupon.applicableTo === 'products' && coupon.applicableProductIds) {
        const hasApplicableProduct = productIds.some(id => coupon.applicableProductIds!.includes(id))
        if (!hasApplicableProduct) {
            return { valid: false, message: 'Bu kupon sepetinizdeki urunlerde gecerli degil' }
        }
    }

    // Check category restrictions
    if (coupon.applicableTo === 'categories' && coupon.applicableCategoryIds) {
        const hasApplicableCategory = categoryIds.some(id => coupon.applicableCategoryIds!.includes(id))
        if (!hasApplicableCategory) {
            return { valid: false, message: 'Bu kupon sepetinizdeki kategorilerde gecerli degil' }
        }
    }

    return { valid: true, coupon }
}

/**
 * Calculate discount amount
 */
function calculateDiscount(params: {
    subtotal: number
    discountType: 'fixed' | 'percentage' | 'free_delivery' | 'bogo'
    discountValue: number
    maxDiscountAmount?: number
    cheapestItemPrice?: number
}): { discountAmount: number; freeItems?: number } {
    const { subtotal, discountType, discountValue, maxDiscountAmount, cheapestItemPrice } = params

    switch (discountType) {
        case 'fixed':
            return { discountAmount: Math.min(discountValue, subtotal) }

        case 'percentage': {
            const discount = (subtotal * discountValue) / 100
            const cappedDiscount = maxDiscountAmount ? Math.min(discount, maxDiscountAmount) : discount
            return { discountAmount: Math.min(cappedDiscount, subtotal) }
        }

        case 'free_delivery':
            return { discountAmount: 0 } // Handled separately

        case 'bogo':
            // Buy One Get One: Free item = price of cheapest item
            if (cheapestItemPrice) {
                return { discountAmount: cheapestItemPrice, freeItems: 1 }
            }
            // If no cheapest item provided, use discountValue as free item price
            return { discountAmount: discountValue, freeItems: 1 }

        default:
            return { discountAmount: 0 }
    }
}

// ============================================
// Tests
// ============================================

describe('Coupon Validator', () => {
    const MOCK_COUPON: Coupon = {
        id: 'coupon-1',
        code: 'TEST20',
        businessId: 'business-1',
        discountType: 'percentage',
        discountValue: 20,
        maxDiscountAmount: 50,
        minOrderAmount: 100,
        maxUsageCount: 100,
        currentUsageCount: 10,
        isActive: true,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('validateCoupon - Valid Coupons', () => {
        it('should validate a fixed discount coupon', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                discountValue: 25,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
            })

            expect(result.valid).toBe(true)
            expect(result.coupon).toEqual(coupon)
        })

        it('should validate a percentage discount coupon', () => {
            const result = validateCoupon({
                coupon: MOCK_COUPON,
                subtotal: 150,
            })

            expect(result.valid).toBe(true)
            expect(result.coupon).toBeDefined()
        })

        it('should validate a free delivery coupon', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'free_delivery',
                discountValue: 0,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 50,
            })

            expect(result.valid).toBe(true)
        })

        it('should validate coupon with product restrictions when products match', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                applicableTo: 'products',
                applicableProductIds: ['prod-1', 'prod-2'],
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                productIds: ['prod-1', 'prod-3'],
            })

            expect(result.valid).toBe(true)
        })

        it('should validate coupon with category restrictions when categories match', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                applicableTo: 'categories',
                applicableCategoryIds: ['cat-1', 'cat-2'],
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                categoryIds: ['cat-2'],
            })

            expect(result.valid).toBe(true)
        })

        it('should validate first-order coupon for new customer', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                isFirstOrderOnly: true,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                customerPhone: '+905551234567',
                previousOrdersByCustomer: 0,
            })

            expect(result.valid).toBe(true)
        })

        it('should validate coupon with per-user limit for first-time user', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                usagePerUser: 3,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                customerPhone: '+905551234567',
                previousUsageByCustomer: 0,
            })

            expect(result.valid).toBe(true)
        })
    })

    describe('validateCoupon - Invalid Coupons', () => {
        it('should reject inactive coupon', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                isActive: false,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('artik gecerli degil')
        })

        it('should reject coupon that has not started yet', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                validFrom: '2024-02-01T00:00:00Z', // Future date
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('henuz baslamadi')
        })

        it('should reject expired coupon', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                validUntil: '2024-01-01T00:00:00Z', // Past date
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('suresi dolmus')
        })

        it('should reject coupon when usage limit exceeded', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                maxUsageCount: 50,
                currentUsageCount: 50,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('limitine ulasmis')
        })

        it('should reject coupon when minimum order amount not met', () => {
            const result = validateCoupon({
                coupon: MOCK_COUPON,
                subtotal: 50, // Less than minOrderAmount of 100
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('Minimum siparis tutari')
        })

        it('should reject first-order coupon for existing customer', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                isFirstOrderOnly: true,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                customerPhone: '+905551234567',
                previousOrdersByCustomer: 5, // Has previous orders
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('ilk siparis')
        })

        it('should reject coupon when per-user limit exceeded', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                usagePerUser: 2,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                customerPhone: '+905551234567',
                previousUsageByCustomer: 2, // Already used twice
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('daha once kullandiniz')
        })

        it('should reject coupon when product restrictions not met', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                applicableTo: 'products',
                applicableProductIds: ['prod-1', 'prod-2'],
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                productIds: ['prod-3', 'prod-4'], // No matching products
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('urunlerde gecerli degil')
        })

        it('should reject coupon when category restrictions not met', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                applicableTo: 'categories',
                applicableCategoryIds: ['cat-1', 'cat-2'],
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                categoryIds: ['cat-3', 'cat-4'], // No matching categories
            })

            expect(result.valid).toBe(false)
            expect(result.message).toContain('kategorilerde gecerli degil')
        })
    })

    describe('calculateDiscount', () => {
        it('should calculate fixed discount correctly', () => {
            const result = calculateDiscount({
                subtotal: 100,
                discountType: 'fixed',
                discountValue: 25,
            })

            expect(result.discountAmount).toBe(25)
        })

        it('should cap fixed discount at subtotal', () => {
            const result = calculateDiscount({
                subtotal: 20,
                discountType: 'fixed',
                discountValue: 50,
            })

            expect(result.discountAmount).toBe(20) // Capped at subtotal
        })

        it('should calculate percentage discount correctly', () => {
            const result = calculateDiscount({
                subtotal: 100,
                discountType: 'percentage',
                discountValue: 20, // 20%
            })

            expect(result.discountAmount).toBe(20)
        })

        it('should apply max discount cap for percentage', () => {
            const result = calculateDiscount({
                subtotal: 500,
                discountType: 'percentage',
                discountValue: 50, // 50% = 250
                maxDiscountAmount: 100, // Cap at 100
            })

            expect(result.discountAmount).toBe(100)
        })

        it('should not exceed subtotal for percentage discount', () => {
            const result = calculateDiscount({
                subtotal: 50,
                discountType: 'percentage',
                discountValue: 100, // 100% but should cap at subtotal
            })

            expect(result.discountAmount).toBe(50)
        })

        it('should return zero discount for free delivery type', () => {
            const result = calculateDiscount({
                subtotal: 100,
                discountType: 'free_delivery',
                discountValue: 0,
            })

            expect(result.discountAmount).toBe(0)
        })

        it('should calculate BOGO discount with cheapest item price', () => {
            const result = calculateDiscount({
                subtotal: 100,
                discountType: 'bogo',
                discountValue: 0,
                cheapestItemPrice: 35,
            })

            expect(result.discountAmount).toBe(35)
            expect(result.freeItems).toBe(1)
        })

        it('should calculate BOGO discount using discountValue when no cheapest item provided', () => {
            const result = calculateDiscount({
                subtotal: 100,
                discountType: 'bogo',
                discountValue: 40,
            })

            expect(result.discountAmount).toBe(40)
            expect(result.freeItems).toBe(1)
        })

        it('should handle zero percentage discount', () => {
            const result = calculateDiscount({
                subtotal: 100,
                discountType: 'percentage',
                discountValue: 0,
            })

            expect(result.discountAmount).toBe(0)
        })

        it('should handle very small percentage discount', () => {
            const result = calculateDiscount({
                subtotal: 99.99,
                discountType: 'percentage',
                discountValue: 1, // 1%
            })

            expect(result.discountAmount).toBeCloseTo(1, 0)
        })
    })

    describe('Edge Cases', () => {
        it('should handle coupon with no usage limit (maxUsageCount = 0)', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                maxUsageCount: 0, // Unlimited
                currentUsageCount: 999999,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
            })

            expect(result.valid).toBe(true)
        })

        it('should handle coupon with no minimum order', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 0.01, // Very small order
            })

            expect(result.valid).toBe(true)
        })

        it('should handle coupon valid exactly at minimum order amount', () => {
            const result = validateCoupon({
                coupon: MOCK_COUPON,
                subtotal: 100, // Exactly equals minOrderAmount
            })

            expect(result.valid).toBe(true)
        })

        it('should handle percentage discount with no max cap', () => {
            const result = calculateDiscount({
                subtotal: 1000,
                discountType: 'percentage',
                discountValue: 50, // No maxDiscountAmount provided
            })

            expect(result.discountAmount).toBe(500)
        })

        it('should handle customer with no previous orders for first-order coupon', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                isFirstOrderOnly: true,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                customerPhone: '+905551234567',
                previousOrdersByCustomer: 0,
            })

            expect(result.valid).toBe(true)
        })

        it('should reject coupon when per-user limit is 1 and already used', () => {
            const coupon: Coupon = {
                ...MOCK_COUPON,
                discountType: 'fixed',
                usagePerUser: 1,
                minOrderAmount: 0,
            }

            const result = validateCoupon({
                coupon,
                subtotal: 100,
                customerPhone: '+905551234567',
                previousUsageByCustomer: 1,
            })

            expect(result.valid).toBe(false)
        })
    })
})
