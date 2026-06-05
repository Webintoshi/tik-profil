"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { QRStudio } from "@/components/business/QRStudio";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessSession } from "@/hooks/useBusinessSession";

interface QRManagementClientProps {
    appUrl: string;
}

export default function QRManagementClient({
    appUrl,
}: QRManagementClientProps) {
    const { isDark } = useTheme();
    const { session, isLoading } = useBusinessSession();
    const [businessSlug, setBusinessSlug] = useState<string>("");
    const [logoUrl, setLogoUrl] = useState<string | undefined>();

    useEffect(() => {
        if (session?.businessSlug) {
            setBusinessSlug(session.businessSlug);
        }

        if (!session?.businessId) {
            setLogoUrl(undefined);
            return;
        }

        let isActive = true;

        const loadProfileLogo = async () => {
            try {
                const response = await fetch("/api/panel/profile", {
                    credentials: "include",
                });

                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                if (isActive) {
                    setLogoUrl(data?.success ? data.profile?.logo || undefined : undefined);
                }
            } catch (err) {
                console.error("Logo fetch error:", err);
            }
        };

        void loadProfileLogo();

        return () => {
            isActive = false;
        };
    }, [session?.businessId, session?.businessSlug]);

    const textSecondary = isDark ? "text-white/50" : "text-gray-500";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", textSecondary)} />
            </div>
        );
    }

    const normalizedSlug = businessSlug.replace(/^\/+/, "");
    const profileUrl = normalizedSlug
        ? `${appUrl}/${normalizedSlug}`
        : `${appUrl}/`;

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
