/**
 * IRON DOME - Next.js Configuration with Security Headers
 */

import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
    reactStrictMode: true,
    compress: true,
    experimental: {
        optimizePackageImports: ['lucide-react'],
        // Disable webpack cache to reduce file size
        webpackBuildWorker: false,
    },
    // Optimize output for smaller bundle size
    output: 'standalone',

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
                hostname: '*.googleusercontent.com',
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
        ];
    },

    // Disable x-powered-by header
    poweredByHeader: false,
};

export default nextConfig;
