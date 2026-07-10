/**
 * IRON DOME - Next.js Configuration with Security Headers
 */

import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
    {
        // Prevent clickjacking
        key: 'X-Frame-Options',
        value: 'DENY',
    },
    {
        // Prevent MIME type sniffing
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        // Control referrer information
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        // XSS Protection (legacy but still useful)
        key: 'X-XSS-Protection',
        value: '1; mode=block',
    },
    {
        // Strict Transport Security
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
    },
    {
        // Permissions Policy
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), payment=()',
    },
];

const publicApiCorsHeaders = [
    {
        key: 'Access-Control-Allow-Origin',
        value: '*',
    },
    {
        key: 'Access-Control-Allow-Methods',
        value: 'GET,POST,OPTIONS',
    },
    {
        key: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization',
    },
];

const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: "standalone",
    outputFileTracingRoot: path.join(process.cwd()),
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        optimizePackageImports: ['lucide-react'],
    },

    // IMAGE OPTIMIZATION: Enable Vercel CDN for external images
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.googleusercontent.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.tikprofil.com',
                pathname: '/**',
            },
        ],
    },

    // IRON DOME: Security Headers
    async headers() {
        return [
            {
                // Apply to all routes
                source: '/:path*',
                headers: securityHeaders,
            },
            {
                source: '/api/kesfet/:path*',
                headers: publicApiCorsHeaders,
            },
            {
                source: '/api/kesfet',
                headers: publicApiCorsHeaders,
            },
            {
                source: '/api/qr-scan',
                headers: publicApiCorsHeaders,
            },
            {
                source: '/api/public/profile/:path*',
                headers: publicApiCorsHeaders,
            },
        ];
    },

    // Disable x-powered-by header
    poweredByHeader: false,
};

export default nextConfig;
