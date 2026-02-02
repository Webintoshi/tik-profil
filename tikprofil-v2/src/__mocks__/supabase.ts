/**
 * Supabase Mock for Testing
 *
 * Provides mock implementations for Supabase client and admin functions.
 * Use this in tests to avoid real database calls.
 */

import { jest } from '@jest/globals'

// Mock data store (simulates database)
export const mockDataStore = {
    ff_products: [],
    ff_categories: [],
    ff_extras: [],
    ff_extra_groups: [],
    ff_orders: [],
    ff_coupons: [],
    ff_coupon_usages: [],
    ff_settings: [],
    ff_campaigns: [],
    businesses: [],
}

// Reset mock data between tests
export function resetMockData() {
    Object.keys(mockDataStore).forEach(key => {
        mockDataStore[key] = []
    })
}

// Helper to generate IDs
let mockIdCounter = 1
export function generateMockId(): string {
    return `mock-${mockIdCounter++}`
}

// Mock Supabase Client
export const createMockSupabaseClient = () => {
    const from = jest.fn((table: string) => {
        let query = {
            select: jest.fn((columns = '*') => {
                query.selectedColumns = columns
                return query
            }),
            insert: jest.fn((data: unknown) => {
                const inserted = Array.isArray(data) ? data : [data]
                inserted.forEach((item: unknown) => {
                    const record = { id: generateMockId(), ...(item as Record<string, unknown>) }
                    if (!mockDataStore[table]) mockDataStore[table] = []
                    mockDataStore[table].push(record)
                    query.lastInserted = record
                })
                query.insertedData = inserted
                return query
            }),
            update: jest.fn((data: unknown) => {
                query.updateData = data
                return query
            }),
            delete: jest.fn(() => query),
            eq: jest.fn((column: string, value: unknown) => {
                query.eqColumn = column
                query.eqValue = value
                return query
            }),
            neq: jest.fn((column: string, value: unknown) => {
                query.neqColumn = column
                query.neqValue = value
                return query
            }),
            gt: jest.fn((column: string, value: unknown) => {
                query.gtColumn = column
                query.gtValue = value
                return query
            }),
            gte: jest.fn((column: string, value: unknown) => {
                query.gteColumn = column
                query.gteValue = value
                return query
            }),
            lt: jest.fn((column: string, value: unknown) => {
                query.ltColumn = column
                query.ltValue = value
                return query
            }),
            lte: jest.fn((column: string, value: unknown) => {
                query.lteColumn = column
                query.lteValue = value
                return query
            }),
            in: jest.fn((column: string, values: unknown[]) => {
                query.inColumn = column
                query.inValues = values
                return query
            }),
            ilike: jest.fn((column: string, value: string) => {
                query.ilikeColumn = column
                query.ilikeValue = value
                return query
            }),
            order: jest.fn((column: string, options: { ascending: boolean }) => {
                query.orderColumn = column
                query.orderDirection = options.ascending ? 'asc' : 'desc'
                return query
            }),
            range: jest.fn((from: number, to: number) => {
                query.rangeFrom = from
                query.rangeTo = to
                return query
            }),
            limit: jest.fn((count: number) => {
                query.limitCount = count
                return query
            }),
            single: jest.fn(() => {
                // Filter data based on query conditions
                let results = mockDataStore[table] || []

                if (query.eqColumn !== undefined) {
                    results = results.filter((r: Record<string, unknown>) =>
                        String(r[query.eqColumn]) === String(query.eqValue)
                    )
                }
                if (query.ilikeColumn !== undefined) {
                    const pattern = query.ilikeValue as string
                    results = results.filter((r: Record<string, unknown>) => {
                        const value = r[query.ilikeColumn] as string
                        return value && value.toLowerCase() === pattern.toLowerCase()
                    })
                }

                const data = results[0] || null
                const error = results.length === 0 ? { message: 'No rows returned' } : null

                return Promise.resolve({ data, error })
            }),
            maybeSingle: jest.fn(() => {
                let results = mockDataStore[table] || []

                if (query.eqColumn !== undefined) {
                    results = results.filter((r: Record<string, unknown>) =>
                        String(r[query.eqColumn]) === String(query.eqValue)
                    )
                }

                const data = results[0] || null
                const error = null
                return Promise.resolve({ data, error })
            }),
            then: jest.fn((resolve: (value: unknown) => unknown) => {
                // Simulate async query execution
                let results = [...(mockDataStore[table] || [])]

                // Apply filters
                if (query.eqColumn !== undefined) {
                    results = results.filter((r: Record<string, unknown>) =>
                        String(r[query.eqColumn]) === String(query.eqValue)
                    )
                }
                if (query.inColumn !== undefined) {
                    results = results.filter((r: Record<string, unknown>) =>
                        (query.inValues as unknown[]).includes(r[query.inColumn])
                    )
                }

                // Apply sorting
                if (query.orderColumn !== undefined) {
                    results.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
                        const aVal = a[query.orderColumn]
                        const bVal = b[query.orderColumn]
                        const direction = query.orderDirection === 'asc' ? 1 : -1
                        if (aVal < bVal) return -1 * direction
                        if (aVal > bVal) return 1 * direction
                        return 0
                    })
                }

                // Apply range
                if (query.rangeFrom !== undefined && query.rangeTo !== undefined) {
                    results = results.slice(query.rangeFrom, query.rangeTo + 1)
                }

                // Apply limit
                if (query.limitCount !== undefined) {
                    results = results.slice(0, query.limitCount)
                }

                // Handle updates
                if (query.updateData) {
                    results.forEach((r: Record<string, unknown>) => {
                        Object.assign(r, query.updateData)
                    })
                }

                // Handle deletes
                if (query.isDelete) {
                    const deleted = results
                    mockDataStore[table] = (mockDataStore[table] || []).filter(
                        (r: Record<string, unknown>) => !results.includes(r)
                    )
                    return Promise.resolve({ data: deleted, error: null, count: deleted.length })
                }

                return Promise.resolve({
                    data: results,
                    error: null,
                    count: results.length,
                })
            }),
        }

        // Flag for delete operations
        query.isDelete = false
        const originalDelete = query.delete
        query.delete = jest.fn(() => {
            query.isDelete = true
            return query
        })

        return query
    })

    const rpc = jest.fn((fnName: string, params: Record<string, unknown>) => {
        return Promise.resolve({ data: null, error: null })
    })

    return {
        from,
        rpc,
        auth: {
            getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
            signIn: jest.fn(() => Promise.resolve({ data: null, error: null })),
            signOut: jest.fn(() => Promise.resolve({ error: null })),
        },
    }
}

// Mock getSupabaseAdmin function
export const mockGetSupabaseAdmin = jest.fn(() => createMockSupabaseClient())

// Test helpers for setting up mock data
export function mockProducts(products: unknown[]) {
    mockDataStore.ff_products = products.map(p => ({
        id: generateMockId(),
        ...p as Record<string, unknown>,
    }))
}

export function mockCoupons(coupons: unknown[]) {
    mockDataStore.ff_coupons = coupons.map(c => ({
        id: generateMockId(),
        ...c as Record<string, unknown>,
    }))
}

export function mockOrders(orders: unknown[]) {
    mockDataStore.ff_orders = orders.map(o => ({
        id: generateMockId(),
        ...o as Record<string, unknown>,
    }))
}

export function mockBusinesses(businesses: unknown[]) {
    mockDataStore.businesses = businesses.map(b => ({
        id: generateMockId(),
        ...b as Record<string, unknown>,
    }))
}

export function mockSettings(settings: unknown[]) {
    mockDataStore.ff_settings = settings.map(s => ({
        id: generateMockId(),
        ...s as Record<string, unknown>,
    }))
}
