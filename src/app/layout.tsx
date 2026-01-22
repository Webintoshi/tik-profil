import type { Metadata, Viewport } from "next";
import { Lora } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

// Lora font for elegant menu typography
const lora = Lora({
    subsets: ["latin", "latin-ext"],
    variable: "--font-lora",
    display: "swap",
});
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#007AFF",
};

export const metadata: Metadata = {
    metadataBase: new URL('https://tikprofil.com'),
    title: {
        default: "Tık Profil | İşletmenizi Dijitale Taşıyan Tek Platform",
        template: "%s | Tık Profil",
    },
    description: "Restoran, Otel, Kuaför ve E-ticaret işletmeleri için QR Menü, Randevu Sistemi ve Sipariş Yönetimi. Komisyonsuz, kurulum gerektirmeyen dijital çözümler.",
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: "Tık Profil | İşletmenizi Dijitale Taşıyan Tek Platform",
        description: "Restoran, Otel, Kuaför ve E-ticaret işletmeleri için QR Menü, Randevu Sistemi ve Sipariş Yönetimi.",
        url: 'https://tikprofil.com',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
    },
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "TikProfil",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: "/icon.svg",
        apple: "/icon-192.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="tr"
            suppressHydrationWarning
            className={`dark ${lora.variable}`}
            style={{ fontFamily: '"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
        >
            <head>
                <link rel="apple-touch-icon" href="/icon-192.svg" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
            </head>
            <body suppressHydrationWarning className="antialiased selection:bg-blue-500 selection:text-white">
                {children}
                <PWARegister />
            </body>
        </html>
    );
}
