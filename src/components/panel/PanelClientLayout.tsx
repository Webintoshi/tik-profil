"use client";

import { ReactNode, useMemo } from "react";
import { BusinessSidebar } from "@/components/panel/BusinessSidebar";
import { ThemeProvider, useTheme } from "@/components/panel/ThemeProvider";
import { BusinessSessionProvider, BusinessSessionData } from "@/components/panel/BusinessSessionContext";
import clsx from "clsx";

interface PanelContentProps {
    children: ReactNode;
    businessName: string;
    enabledModules?: string[];
    role?: "owner" | "manager" | "staff";
    permissions?: string[];
}

function PanelContent({ children, businessName, enabledModules = [], role = "owner", permissions = [] }: PanelContentProps) {
    const { isDark } = useTheme();

    return (
        <div className={clsx(
            "min-h-screen transition-colors duration-500 panel-form",
            isDark
                ? "bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a]"
                : "bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50"
        )}>
            <BusinessSidebar
                businessName={businessName}
                enabledModules={enabledModules}
                userRole={role}
                userPermissions={permissions}
            />
            <main className="lg:pl-64">
                <div className="min-h-screen p-4 pt-20 lg:p-8 lg:pt-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

interface PanelClientLayoutProps {
    children: ReactNode;
    businessName: string;
    enabledModules?: string[];
    session?: BusinessSessionData | null;
}

export default function PanelClientLayout({
    children,
    businessName,
    enabledModules = ["restaurant"],
    session
}: PanelClientLayoutProps) {
    // Build full session data for context - MEMOIZED to prevent context thrashing
    const fullSession = useMemo((): BusinessSessionData => ({
        businessId: session?.businessId || "",
        businessName: session?.businessName || businessName,
        businessSlug: session?.businessSlug || "",
        email: session?.email || "",
        enabledModules: session?.enabledModules || enabledModules,
        isStaff: session?.isStaff || false,
        staffId: session?.staffId,
        role: session?.role || "owner",
        permissions: session?.permissions || [],
    }), [session, businessName, enabledModules]);

    return (
        <ThemeProvider>
            <BusinessSessionProvider session={fullSession}>
                <PanelContent
                    businessName={businessName}
                    enabledModules={enabledModules}
                    role={fullSession.role}
                    permissions={fullSession.permissions}
                >
                    {children}
                </PanelContent>
            </BusinessSessionProvider>
        </ThemeProvider>
    );
}
