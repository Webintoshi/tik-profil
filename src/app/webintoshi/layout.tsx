import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#007AFF",
};

export const metadata: Metadata = {
    title: "Admin | Tık Profil",
    description: "Süper Admin Kontrol Merkezi",
    manifest: "/manifest-admin.json",
    robots: "noindex, nofollow",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "TikProfil Admin",
    },
};

export default function WebintoshiLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7]">
            {/* Mesh gradient overlay */}
            <div
                className="fixed inset-0 opacity-50 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse at 20% 30%, rgba(0, 113, 227, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 70%, rgba(88, 86, 214, 0.06) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.8) 0%, transparent 70%)
                    `,
                }}
            />
            {children}
        </div>
    );
}
