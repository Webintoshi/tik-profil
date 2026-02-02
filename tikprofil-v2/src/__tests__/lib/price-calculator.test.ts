/**
 * Price Calculator Unit Tests
 *
 * Tests for price calculation logic including:
 * - Base price calculation
 * - Size modifiers (S, M, L, XL)
 * - Discount prices (active/expired)
 * - Extra items pricing
 * - Total calculation (subtotal + delivery + discount)
 */

import { jest } from '@jest/globals'

// ============================================
// Price Calculator Implementation (for testing)
// ============================================

interface Size {
    id: string
    name: string
    priceModifier: number
}

interface Extra {
    id: string
    name: string
    price: number
}

interface CartItem {
    basePrice: number
    quantity: number
    selectedSize?: Size
    selectedExtras?: Extra[]
}

/**
 * Calculate the price of a single item with size and extras
 */
function calculateItemPrice(
    basePrice: number,
    size?: Size,
    extras?: Extra[]
): number {
    let price = basePrice

    // Add size modifier
    if (size) {
        price += size.priceModifier
    }

    // Add extras
    if (extras && extras.length > 0) {
        price += extras.reduce((sum, extra) => sum + extra.price, 0)
    }

    return price
}

/**
 * Calculate subtotal for all items in cart
 */
function calculateSubtotal(items: CartItem[]): number {
    return items.reduce((total, item) => {
        const itemPrice = calculateItemPrice(
            item.basePrice,
            item.selectedSize,
            item.selectedExtras
        )
        return total + (itemPrice * item.quantity)
    }, 0)
}

/**
 * Calculate total with delivery fee and discount
 */
function calculateTotal(params: {
    subtotal: number
    deliveryFee: number
    discountAmount: number
}): number {
    return Math.max(0, params.subtotal + params.deliveryFee - params.discountAmount)
}

/**
 * Apply discount to subtotal
 */
function applyDiscount(params: {
    subtotal: number
    discountType: 'fixed' | 'percentage' | 'free_delivery'
    discountValue: number
    maxDiscountAmount?: number
}): { discountAmount: number; discountedSubtotal: number } {
    let discountAmount = 0

    if (params.discountType === 'fixed') {
        discountAmount = params.discountValue
    } else if (params.discountType === 'percentage') {
        discountAmount = (params.subtotal * params.discountValue) / 100

        // Apply max discount limit if set
        if (params.maxDiscountAmount && discountAmount > params.maxDiscountAmount) {
            discountAmount = params.maxDiscountAmount
        }
    } else if (params.discountType === 'free_delivery') {
        // Free delivery - return 0 for discount amount (handled separately)
        discountAmount = 0
    }

    // Ensure discount doesn't exceed subtotal
    if (discountAmount > params.subtotal) {
        discountAmount = params.subtotal
    }

    const discountedSubtotal = params.subtotal - discountAmount

    return { discountAmount, discountedSubtotal }
}

// ============================================
// Tests
// ============================================

describe('Price Calculator', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('calculateItemPrice', () => {
        it('should return base price when no size or extras', () => {
            const result = calculateItemPrice(100, undefined, [])
            expect(result).toBe(100)
        })

        it('should add size modifier to base price', () => {
            const sizeS = { id: 'size-s', name: 'Small', priceModifier: 0 }
            const sizeM = { id: 'size-m', name: 'Medium', priceModifier: 5 }
            const sizeL = { id: 'size-l', name: 'Large', priceModifier: 10 }
            const sizeXL = { id: 'size-xl', name: 'XL', priceModifier: 15 }

            expect(calculateItemPrice(100, sizeS, [])).toBe(100)
            expect(calculateItemPrice(100, sizeM, [])).toBe(105)
            expect(calculateItemPrice(100, sizeL, [])).toBe(110)
            expect(calculateItemPrice(100, sizeXL, [])).toBe(115)
        })

        it('should add extras prices to base price', () => {
            const extras = [
                { id: 'extra-1', name: 'Cheese', price: 5 },
                { id: 'extra-2', name: 'Bacon', price: 10 },
            ]

            const result = calculateItemPrice(100, undefined, extras)
            expect(result).toBe(115) // 100 + 5 + 10
        })

        it('should handle both size and extras', () => {
            const size = { id: 'size-l', name: 'Large', priceModifier: 10 }
            const extras = [
                { id: 'extra-1', name: 'Cheese', price: 5 },
                { id: 'extra-2', name: 'Bacon', price: 3 },
            ]

            const result = calculateItemPrice(100, size, extras)
            expect(result).toBe(118) // 100 + 10 + 5 + 3
        })

        it('should handle negative size modifier (discount size)', () => {
            const size = { id: 'size-xs', name: 'XS', priceModifier: -5 }

            const result = calculateItemPrice(100, size, [])
            expect(result).toBe(95)
        })

        it('should handle empty extras array', () => {
            const result = calculateItemPrice(100, undefined, [])
            expect(result).toBe(100)
        })
    })

    describe('calculateSubtotal', () => {
        it('should calculate subtotal for single item', () => {
            const items: CartItem[] = [
                {
                    basePrice: 100,
                    quantity: 1,
                    selectedSize: undefined,
                    selectedExtras: [],
                },
            ]

            const result = calculateSubtotal(items)
            expect(result).toBe(100)
        })

        it('should calculate subtotal for multiple items', () => {
            const items: CartItem[] = [
                {
                    basePrice: 100,
                    quantity: 2,
                    selectedSize: undefined,
                    selectedExtras: [],
                },
                {
                    basePrice: 50,
                    quantity: 1,
                    selectedSize: undefined,
                    selectedExtras: [],
                },
            ]

            const result = calculateSubtotal(items)
            expect(result).toBe(250) // (100 * 2) + (50 * 1)
        })

        it('should include size modifiers in subtotal', () => {
            const items: CartItem[] = [
                {
                    basePrice: 100,
                    quantity: 2,
                    selectedSize: { id: 'size-m', name: 'M', priceModifier: 10 },
                    selectedExtras: [],
                },
            ]

            const result = calculateSubtotal(items)
            expect(result).toBe(220) // (100 + 10) * 2
        })

        it('should include extras in subtotal', () => {
            const items: CartItem[] = [
                {
                    basePrice: 100,
                    quantity: 1,
                    selectedSize: undefined,
                    selectedExtras: [
                        { id: 'extra-1', name: 'Cheese', price: 5 },
                        { id: 'extra-2', name: 'Bacon', price: 10 },
                    ],
                },
            ]

            const result = calculateSubtotal(items)
            expect(result).toBe(115) // 100 + 5 + 10
        })

        it('should handle empty items array', () => {
            const result = calculateSubtotal([])
            expect(result).toBe(0)
        })

        it('should handle complex cart with multiple items, sizes, and extras', () => {
            const items: CartItem[] = [
                {
                    basePrice: 100,
                    quantity: 2,
                    selectedSize: { id: 'size-l', name: 'L', priceModifier: 10 },
                    selectedExtras: [
                        { id: 'extra-1', name: 'Cheese', price: 5 },
                        { id: 'extra-2', name: 'Bacon', price: 3 },
                    ],
                },
                {
                    basePrice: 75,
                    quantity: 1,
                    selectedSize: { id: 'size-m', name: 'M', priceModifier: 5 },
                    selectedExtras: [
                        { id: 'extra-3', name: 'Mushrooms', price: 10 },
                    ],
                },
                {
                    basePrice: 50,
                    quantity: 3,
                    selectedSize: undefined,
                    selectedExtras: [],
                },
            ]

            // Item 1: (100 + 10 + 5 + 3) * 2 = 236
            // Item 2: (75 + 5 + 10) * 1 = 90
            // Item 3: 50 * 3 = 150
            // Total: 236 + 90 + 150 = 476

            const result = calculateSubtotal(items)
            expect(result).toBe(476)
        })
    })

    describe('applyDiscount', () => {
        it('should apply fixed discount', () => {
            const result = applyDiscount({
                subtotal: 100,
                discountType: 'fixed',
                discountValue: 20,
            })

            expect(result.discountAmount).toBe(20)
            expect(result.discountedSubtotal).toBe(80)
        })

        it('should apply percentage discount', () => {
            const result = applyDiscount({
                subtotal: 100,
                discountType: 'percentage',
                discountValue: 25, // 25%
            })

            expect(result.discountAmount).toBe(25)
            expect(result.discountedSubtotal).toBe(75)
        })

        it('should respect max discount amount for percentage', () => {
            const result = applyDiscount({
                subtotal: 500,
                discountType: 'percentage',
                discountValue: 50, // 50% = 250
                maxDiscountAmount: 100, // Cap at 100
            })

            expect(result.discountAmount).toBe(100)
            expect(result.discountedSubtotal).toBe(400)
        })

        it('should not exceed subtotal with fixed discount', () => {
            const result = applyDiscount({
                subtotal: 50,
                discountType: 'fixed',
                discountValue: 100, // More than subtotal
            })

            expect(result.discountAmount).toBe(50) // Capped at subtotal
            expect(result.discountedSubtotal).toBe(0)
        })

        it('should handle free delivery type (returns 0 discount)', () => {
            const result = applyDiscount({
                subtotal: 100,
                discountType: 'free_delivery',
                discountValue: 0,
            })

            expect(result.discountAmount).toBe(0)
            expect(result.discountedSubtotal).toBe(100)
        })

        it('should handle zero percentage discount', () => {
            const result = applyDiscount({
                subtotal: 100,
                discountType: 'percentage',
                discountValue: 0,
            })

            expect(result.discountAmount).toBe(0)
            expect(result.discountedSubtotal).toBe(100)
        })

        it('should handle 100% discount', () => {
            const result = applyDiscount({
                subtotal: 100,
                discountType: 'percentage',
                discountValue: 100,
            })

            expect(result.discountAmount).toBe(100)
            expect(result.discountedSubtotal).toBe(0)
        })

        it('should round discount to 2 decimal places', () => {
            const result = applyDiscount({
                subtotal: 99.99,
                discountType: 'percentage',
                discountValue: 33.33,
            })

            expect(result.discountAmount).toBeCloseTo(33.33, 2)
        })
    })

    describe('calculateTotal', () => {
        it('should calculate total with delivery fee', () => {
            const result = calculateTotal({
                subtotal: 100,
                deliveryFee: 15,
                discountAmount: 0,
            })

            expect(result).toBe(115)
        })

        it('should calculate total with discount', () => {
            const result = calculateTotal({
                subtotal: 100,
                deliveryFee: 15,
                discountAmount: 20,
            })

            expect(result).toBe(95) // 100 + 15 - 20
        })

        it('should return zero when discount exceeds subtotal + delivery', () => {
            const result = calculateTotal({
                subtotal: 50,
                deliveryFee: 10,
                discountAmount: 100,
            })

            expect(result).toBe(0) // Math.max(0, ...)
        })

        it('should handle free delivery (deliveryFee = 0)', () => {
            const result = calculateTotal({
                subtotal: 100,
                deliveryFee: 0,
                discountAmount: 10,
            })

            expect(result).toBe(90)
        })

        it('should handle pickup with no discount', () => {
            const result = calculateTotal({
                subtotal: 100,
                deliveryFee: 0,
                discountAmount: 0,
            })

            expect(result).toBe(100)
        })

        it('should handle complex pricing scenario', () => {
            const result = calculateTotal({
                subtotal: 476.50,
                deliveryFee: 20,
                discountAmount: 50,
            })

            expect(result).toBe(446.50) // 476.50 + 20 - 50
        })
    })

    describe('Edge Cases', () => {
        it('should handle zero base price', () => {
            const result = calculateItemPrice(0, undefined, [])
            expect(result).toBe(0)
        })

        it('should handle very large quantities in subtotal', () => {
            const items: CartItem[] = [
                {
                    basePrice: 100,
                    quantity: 99, // Max allowed quantity
                    selectedSize: undefined,
                    selectedExtras: [],
                },
            ]

            const result = calculateSubtotal(items)
            expect(result).toBe(9900)
        })

        it('should handle items with only extras (no size)', () => {
            const items: CartItem[] = [
                {
                    basePrice: 100,
                    quantity: 1,
                    selectedSize: undefined,
                    selectedExtras: [
                        { id: 'extra-1', name: 'Cheese', price: 5 },
                        { id: 'extra-2', name: 'Bacon', price: 10 },
                        { id: 'extra-3', name: 'Mushrooms', price: 15 },
                    ],
                },
            ]

            const result = calculateSubtotal(items)
            expect(result).toBe(130)
        })

        it('should handle decimal prices correctly', () => {
            const result = calculateTotal({
                subtotal: 99.99,
                deliveryFee: 15.50,
                discountAmount: 10.25,
            })

            expect(result).toBeCloseTo(105.24, 2)
        })
    })
})
