"use client";

import { createContext, useContext, ReactNode } from "react";
import { StaffRole } from "@/lib/permissions";

export interface BusinessSessionData {
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

const defaultSession: BusinessSessionData = {
    businessId: "",
    businessName: "İşletme",
    businessSlug: "",
    email: "",
    enabledModules: ["restaurant"],
    isStaff: false,
    role: "owner",
    permissions: [],
};

const BusinessSessionContext = createContext<BusinessSessionData>(defaultSession);

export function BusinessSessionProvider({
    children,
    session,
}: {
    children: ReactNode;
    session: BusinessSessionData;
}) {
    return (
        <BusinessSessionContext.Provider value={session}>
            {children}
        </BusinessSessionContext.Provider>
    );
}

export function useBusinessContext(): BusinessSessionData {
    const context = useContext(BusinessSessionContext);
    return context;
}
