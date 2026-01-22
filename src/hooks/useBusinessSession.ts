"use client";

import { useBusinessContext } from "@/components/panel/BusinessSessionContext";
import { StaffRole } from "@/lib/permissions";

export interface BusinessSession {
    businessId: string;
    businessName: string;
    businessSlug: string;
    email: string;
    enabledModules: string[];
    // Staff-specific fields
    isStaff: boolean;
    staffId?: string;
    role: StaffRole;
    permissions: string[];
}

interface UseBusinessSessionResult {
    session: BusinessSession | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook to get business session from context (provided by server layout)
 * Supports both owner and staff sessions
 */
export function useBusinessSession(): UseBusinessSessionResult {
    const context = useBusinessContext();

    // If businessId is empty, session is not available
    if (!context.businessId) {
        return {
            session: null,
            isLoading: false,
            error: null,
        };
    }

    return {
        session: {
            businessId: context.businessId,
            businessName: context.businessName,
            businessSlug: context.businessSlug,
            email: context.email,
            enabledModules: context.enabledModules || [],
            isStaff: context.isStaff || false,
            staffId: context.staffId,
            role: context.role || "owner",
            permissions: context.permissions || [],
        },
        isLoading: false,
        error: null,
    };
}
