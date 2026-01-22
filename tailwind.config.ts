import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Apple Dark Mode Palette
                dark: {
                    950: "#0d0d0d", // Pure dark
                    900: "#1c1c1e", // Primary background
                    850: "#242426", // Elevated surface
                    800: "#2c2c2e", // Secondary background
                    700: "#3a3a3c", // Borders
                    600: "#48484a", // Dividers
                    500: "#636366", // Placeholder
                    400: "#8e8e93", // Secondary text
                    300: "#aeaeb2", // Tertiary text
                    200: "#c7c7cc", // Primary text
                    100: "#e5e5ea", // Bright text
                },
                accent: {
                    blue: "#0a84ff",
                    green: "#30d158",
                    orange: "#ff9f0a",
                    red: "#ff453a",
                    purple: "#bf5af2",
                    pink: "#ff375f",
                    teal: "#64d2ff",
                    indigo: "#5e5ce6",
                },
                // Light Mode Palette (Landing Page)
                light: {
                    bg: "#ffffff",
                    surface: "#f5f5f7",
                    border: "#d2d2d7",
                    text: "#1d1d1f",
                    muted: "#86868b",
                    accent: "#0071e3",
                },
            },
            fontFamily: {
                sans: [
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "SF Pro Display",
                    "Segoe UI",
                    "Roboto",
                    "sans-serif",
                ],
            },
            // Typography Scale (Apple-inspired)
            fontSize: {
                "display-xl": ["80px", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" }],
                "display-lg": ["64px", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "600" }],
                "display": ["48px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
                "headline": ["32px", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "600" }],
                "title": ["24px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
                "body-lg": ["19px", { lineHeight: "1.5", letterSpacing: "-0.005em", fontWeight: "400" }],
                "body": ["17px", { lineHeight: "1.5", letterSpacing: "-0.005em", fontWeight: "400" }],
                "body-sm": ["15px", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
                "caption": ["13px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "400" }],
                "micro": ["11px", { lineHeight: "1.3", letterSpacing: "0.01em", fontWeight: "500" }],
            },
            // Border Radius Scale
            borderRadius: {
                "xs": "4px",
                "sm": "8px",
                "md": "12px",
                "lg": "16px",
                "xl": "20px",
                "2xl": "24px",
                "3xl": "32px",
                "4xl": "40px",
                "pill": "9999px",
            },
            // Spacing (4px grid - already default but explicit)
            spacing: {
                "0.5": "2px",
                "1": "4px",
                "1.5": "6px",
                "2": "8px",
                "2.5": "10px",
                "3": "12px",
                "3.5": "14px",
                "4": "16px",
                "5": "20px",
                "6": "24px",
                "7": "28px",
                "8": "32px",
                "9": "36px",
                "10": "40px",
                "11": "44px",
                "12": "48px",
                "14": "56px",
                "16": "64px",
                "18": "72px",
                "20": "80px",
            },
            backdropBlur: {
                xs: "2px",
                "4xl": "72px",
            },
            // Animation & Keyframes
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.4s ease-out",
                "slide-in-right": "slideInRight 0.3s ease-out",
                "scale-in": "scaleIn 0.2s ease-out",
                "shimmer": "shimmer 2s linear infinite",
                "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "glow-pulse": "glowPulse 2s ease-in-out infinite",
                "float": "float 3s ease-in-out infinite",
                "bounce-subtle": "bounceSubtle 0.5s ease-out",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideInRight: {
                    "0%": { opacity: "0", transform: "translateX(20px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                scaleIn: {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                glowPulse: {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(0,113,227,0.4)" },
                    "50%": { boxShadow: "0 0 40px rgba(0,113,227,0.7), 0 0 60px rgba(0,113,227,0.3)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                bounceSubtle: {
                    "0%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.15)" },
                    "100%": { transform: "scale(1)" },
                },
            },
            // Box Shadow / Elevation System
            boxShadow: {
                // Subtle
                "subtle": "0 1px 2px rgba(0,0,0,0.04)",
                "subtle-md": "0 2px 4px rgba(0,0,0,0.06)",
                // Elevated
                "elevated": "0 4px 12px rgba(0,0,0,0.08)",
                "elevated-md": "0 8px 24px rgba(0,0,0,0.12)",
                "elevated-lg": "0 16px 40px rgba(0,0,0,0.16)",
                // Glass
                "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.36)",
                "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.24)",
                "glass-lg": "0 24px 80px 0 rgba(0, 0, 0, 0.4)",
                // Glow
                "glow": "0 0 20px rgba(10, 132, 255, 0.3)",
                "glow-lg": "0 0 40px rgba(10, 132, 255, 0.4)",
                "glow-xl": "0 0 60px rgba(10, 132, 255, 0.5)",
                // Button
                "btn": "0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.1)",
                "btn-hover": "0 4px 16px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)",
                // Card
                "card": "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)",
                "card-hover": "0 8px 32px rgba(0,0,0,0.12), 0 16px 48px rgba(0,0,0,0.08)",
                // Inner
                "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.1)",
                "inner-dark": "inset 0 1px 2px rgba(0,0,0,0.1)",
            },
            // Transition Timing Functions (Apple-style)
            transitionTimingFunction: {
                "apple": "cubic-bezier(0.25, 0.1, 0.25, 1)",
                "apple-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
                "apple-swift": "cubic-bezier(0.55, 0, 0.1, 1)",
                "apple-snappy": "cubic-bezier(0.2, 0, 0, 1)",
            },
            // Transition Duration
            transitionDuration: {
                "150": "150ms",
                "250": "250ms",
                "350": "350ms",
                "450": "450ms",
            },
        },
    },
    plugins: [],
};

export default config;
