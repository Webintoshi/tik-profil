import { cache } from "react";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import { getSession } from "@/lib/auth";
import { getBusiness } from "@/lib/businessStore";
import { getSessionSecretBytes } from "@/lib/env";
import type { StaffRole } from "@/lib/permissions";

const OWNER_COOKIE = "tikprofil_owner_session";
const STAFF_COOKIE = "tikprofil_staff_session";

export interface PanelSessionData {
    appUserId?: string;
    authProvider?: "legacy" | "logto";
    businessId: string;
    businessName: string;
    businessSlug: string;
    email: string;
    enabledModules: string[];
    isStaff: boolean;
    logtoSub?: string;
    staffId?: string;
    role: StaffRole;
    permissions: string[];
}

const getJwtSecret = () => getSessionSecretBytes();

async function getOwnerSession(): Promise<PanelSessionData | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_COOKIE)?.value;

    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());

        return {
            appUserId: typeof payload.appUserId === "string" ? payload.appUserId : undefined,
            authProvider: payload.authProvider === "logto" ? "logto" : "legacy",
            businessId: (payload.businessId as string) || "",
            businessName: (payload.businessName as string) || "",
            businessSlug: (payload.businessSlug as string) || "",
            email: (payload.email as string) || "",
            enabledModules: [],
            isStaff: false,
            logtoSub: typeof payload.logtoSub === "string" ? payload.logtoSub : undefined,
            role: "owner",
            permissions: [],
        };
    } catch (error) {
        console.error("[Panel Session] Owner JWT verification failed:", error);
        return null;
    }
}

async function getStaffSession(): Promise<PanelSessionData | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(STAFF_COOKIE)?.value;

    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());

        return {
            appUserId: typeof payload.appUserId === "string" ? payload.appUserId : undefined,
            authProvider: payload.authProvider === "logto" ? "logto" : "legacy",
            businessId: (payload.businessId as string) || "",
            businessName: (payload.businessName as string) || "",
            businessSlug: (payload.businessSlug as string) || "",
            email: (payload.email as string) || "",
            enabledModules: (payload.enabledModules as string[]) || [],
            isStaff: true,
            logtoSub: typeof payload.logtoSub === "string" ? payload.logtoSub : undefined,
            staffId: payload.staffId as string | undefined,
            role: (payload.role as StaffRole) || "staff",
            permissions: (payload.permissions as string[]) || [],
        };
    } catch (error) {
        console.error("[Panel Session] Staff JWT verification failed:", error);
        return null;
    }
}

async function getImpersonateId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get("tikprofil_impersonate")?.value || null;
}

async function resolveBusinessModules(
    businessId: string,
    business: Awaited<ReturnType<typeof getBusiness>>,
): Promise<string[]> {
    if (!business) {
        return [];
    }

    let modules = business.modules || [];

    if (business.industry_id && modules.length === 0) {
        try {
            const { getCollectionREST, updateDocumentREST } = await import("@/lib/documentStore");
            const industryDefinitions = await getCollectionREST("industry_definitions");
            const industryDef = industryDefinitions.find(
                (definition) =>
                    definition.slug === business.industry_id ||
                    definition.id === business.industry_id ||
                    (definition.slug as string)?.toLowerCase() === business.industry_id?.toLowerCase(),
            );

            if (industryDef && Array.isArray(industryDef.modules) && industryDef.modules.length > 0) {
                const industryModules = industryDef.modules as string[];
                await updateDocumentREST("businesses", businessId, {
                    modules: industryModules,
                });
                modules = industryModules;
            }
        } catch (error) {
            console.error("[Panel Session] Module sync error:", error);
        }
    }

    if (modules.length === 0 && business.industry_id) {
        const { getModulesForIndustry } = await import("@/lib/industryService");
        modules = getModulesForIndustry(business.industry_id);
    }

    return modules;
}

export const loadPanelSession = cache(async (): Promise<PanelSessionData | null> => {
    const adminSession = await getSession();
    const ownerSession = await getOwnerSession();
    const staffSession = await getStaffSession();
    const impersonateId = await getImpersonateId();

    if (!adminSession && !ownerSession && !staffSession) {
        return null;
    }

    let sessionData: PanelSessionData = {
        businessId: "",
        businessName: "Isletmem",
        businessSlug: "",
        email: "",
        enabledModules: [],
        isStaff: false,
        role: "owner",
        permissions: [],
    };

    if (impersonateId && adminSession) {
        try {
            const business = await getBusiness(impersonateId);

            if (business) {
                sessionData = {
                    businessId: business.id,
                    businessName: business.name,
                    businessSlug: business.slug || "",
                    email: "",
                    enabledModules: await resolveBusinessModules(business.id, business),
                    isStaff: false,
                    role: "owner",
                    permissions: [],
                };
            }
        } catch (error) {
            console.error("[Panel Session] Failed to load impersonated business:", error);
        }

        return sessionData;
    }

    if (ownerSession?.businessId) {
        sessionData = { ...ownerSession };

        try {
            const business = await getBusiness(ownerSession.businessId);

            if (business) {
                sessionData.businessName = business.name;
                sessionData.businessSlug = business.slug || "";
                sessionData.enabledModules = await resolveBusinessModules(ownerSession.businessId, business);
            } else {
                sessionData.businessName = ownerSession.email?.split("@")[0] || "Isletmem";
            }
        } catch (error) {
            console.error("[Panel Session] Failed to load owner business:", error);
            sessionData.businessName = ownerSession.email?.split("@")[0] || "Isletmem";
        }

        return sessionData;
    }

    if (staffSession?.businessId) {
        sessionData = { ...staffSession };

        try {
            const business = await getBusiness(staffSession.businessId);

            if (business) {
                sessionData.businessName = business.name;
                sessionData.businessSlug = business.slug || "";
                sessionData.enabledModules = await resolveBusinessModules(staffSession.businessId, business);
            }
        } catch (error) {
            console.error("[Panel Session] Failed to load staff business:", error);
        }
    }

    return sessionData;
});
