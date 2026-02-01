"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/panel/ThemeProvider";
import { QRStudio } from "@/components/business/QRStudio";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/panel/GlassCard";

export default function QRManagementPage() {
    const { isDark } = useTheme();
    const { session, isLoading } = useBusinessSession();
    const [businessSlug, setBusinessSlug] = useState<string>("");
    const [logoUrl, setLogoUrl] = useState<string | undefined>();

    useEffect(() => {
        if (session?.businessSlug) {
            setBusinessSlug(session.businessSlug);
        }

        if (session?.businessId) {
            // Fetch business details (logo)
            import("@/lib/businessStore").then(({ getBusiness }) => {
                getBusiness(session.businessId).then(data => {
                    if (data?.logo) setLogoUrl(data.logo);
                }).catch(err => console.error("Logo fetch error:", err));
            });
        }
    }, [session]);

    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-white/50" : "text-gray-500";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", textSecondary)} />
            </div>
        );
    }

    const profileUrl = businessSlug
        ? `https://tikprofil-v2.vercel.app/${businessSlug}`
        : "https://tikprofil-v2.vercel.app/";

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 lg:h-[calc(100vh-80px)]">
            <QRStudio
                businessId={session?.businessId || ""}
                businessName={session?.businessName || "İşletme"}
                profileUrl={profileUrl}
                logoUrl={logoUrl}
            />
        </div>
    );
}
