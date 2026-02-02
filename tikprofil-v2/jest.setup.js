import '@testing-library/jest-dom'

// Polyfill for Request (Next.js 15)
global.Request = class Request {
    constructor(input, init = {}) {
        this.url = typeof input === 'string' ? input : input.url
        this.method = (init.method || 'GET').toUpperCase()
        this.headers = new Headers(init.headers)
        this.body = init.body
        this.signal = init.signal
    }

    async json() {
        if (typeof this.body === 'string') {
            return JSON.parse(this.body)
        }
        return this.body
    }

    async text() {
        return this.body
    }

    get url() { return this._url }
    set url(value) { this._url = value }

    get method() { return this._method }
    set method(value) { this._method = value }

    get headers() { return this._headers }
    set headers(value) { this._headers = value }

    get body() { return this._body }
    set body(value) { this._body = value }

    get signal() { return this._signal }
    set signal(value) { this._signal = value }
}

global.Response = class Response {
    constructor(body, init = {}) {
        this._body = body
        this.status = init.status || 200
        this.statusText = init.statusText || 'OK'
        this.headers = new Headers(init.headers)
    }

    async json() {
        return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
    }

    get status() { return this._status }
    get statusText() { return this._statusText }
    get headers() { return this._headers }
}

global.Headers = class Headers {
    constructor(init = {}) {
        if (Array.isArray(init)) {
            init.forEach(([key, value]) => this._map.set(key, value))
        } else if (typeof init === 'object') {
            Object.entries(init).forEach(([key, value]) => this._map.set(key, value))
        }
        this._map = new Map()
    }

    get(name) {
        return this._map.get(name)
    }

    set(name, value) {
        this._map.set(name, value)
    }

    has(name) {
        return this._map.has(name)
    }

    delete(name) {
        this._map.delete(name)
    }

    forEach(callback) {
        this._map.forEach((value, key) => callback(value, key, this))
    }
}

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SESSION_SECRET = 'test-session-secret-for-jest-testing'
process.env.NODE_ENV = 'test'

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            pathname: '/',
            query: {},
        }
    },
    useSearchParams() {
        return new URLSearchParams()
    },
    usePathname() {
        return '/'
    },
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(() => ({ value: 'mock-cookie-value' })),
        set: jest.fn(),
        delete: jest.fn(),
    })),
}))

// Suppress console errors in tests (unless debugging)
const originalError = console.error
beforeAll(() => {
    console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
            return
        }
        originalError(...args)
    }
})

afterAll(() => {
    console.error = originalError
})
