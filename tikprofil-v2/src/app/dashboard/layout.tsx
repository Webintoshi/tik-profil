import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardSidebar, LiquidMetalBackground } from "@/components/dashboard";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#07070a",
};

export const metadata: Metadata = {
    title: "Dashboard | TikProfil Admin",
    description: "Süper Admin Kontrol Merkezi",
    manifest: "/manifest-admin.json",
    robots: "noindex, nofollow",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "TikProfil Admin",
    },
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server-side auth check
    const session = await getSession();

    if (!session) {
        redirect("/webintoshi");
    }

    return (
        <div className="relative min-h-screen text-white overflow-hidden">
            {/* Global Liquid Metal Animated Background */}
            <LiquidMetalBackground />

            {/* Sidebar */}
            <DashboardSidebar />

            {/* Main Content */}
            <main className="relative z-10 lg:pl-64">
                <div className="min-h-screen p-4 pt-20 lg:p-8 lg:pt-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
