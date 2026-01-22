import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getSession } from "@/lib/auth";
import PanelClientLayout from "@/components/panel/PanelClientLayout";
import { getBusiness } from "@/lib/businessStore";
import { jwtVerify } from "jose";
import { StaffRole } from "@/lib/permissions";
import { getSessionSecretBytes } from "@/lib/env";

// Cookie names
const OWNER_COOKIE = "tikprofil_owner_session";
const STAFF_COOKIE = "tikprofil_staff_session";

interface SessionData {
    businessId: string;
    businessName: string;
    businessSlug: string;
    email: string;
    enabledModules: string[];
    isStaff: boolean;
    staffId?: string;
    role: StaffRole;
    permissions: string[];
}

// JWT secret - must match auth routes
const getJwtSecret = () => getSessionSecretBytes();

async function getOwnerSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(OWNER_COOKIE)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return {
            businessId: payload.businessId as string,
            businessName: payload.businessName as string || "",
            businessSlug: payload.businessSlug as string || "",
            email: payload.email as string || "",
            enabledModules: [],
            isStaff: false,
            role: "owner",
            permissions: [],
        };
    } catch (error) {
        console.error("[Panel Layout] Owner JWT verification failed:", error);
        return null;
    }
}

async function getStaffSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(STAFF_COOKIE)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return {
            businessId: payload.businessId as string,
            businessName: payload.businessName as string || "",
            businessSlug: payload.businessSlug as string || "",
            email: payload.email as string || "",
            enabledModules: (payload.enabledModules as string[]) || [],
            isStaff: true,
            staffId: payload.staffId as string,
            role: (payload.role as StaffRole) || "staff",
            permissions: (payload.permissions as string[]) || [],
        };
    } catch (error) {
        console.error("[Panel Layout] Staff JWT verification failed:", error);
        return null;
    }
}

// Get impersonation ID from cookies
async function getImpersonateId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get("tikprofil_impersonate")?.value || null;
}

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check admin session (for impersonation)
    const adminSession = await getSession();

    // Check owner and staff sessions
    const ownerSession = await getOwnerSession();
    const staffSession = await getStaffSession();

    // Determine which session to use (priority: impersonation > owner > staff)
    const impersonateId = await getImpersonateId();

    // If no valid session, redirect to login
    if (!adminSession && !ownerSession && !staffSession) {
        redirect("/giris-yap");
    }

    // Initialize session data
    let sessionData: SessionData = {
        businessId: "",
        businessName: "İşletmem",
        businessSlug: "",
        email: "",
        enabledModules: [], // No default - will be populated from business data
        isStaff: false,
        role: "owner",
        permissions: [],
    };

    // Handle impersonation (admin viewing as business)
    if (impersonateId && adminSession) {
        try {
            const business = await getBusiness(impersonateId);
            if (business) {
                sessionData = {
                    businessId: business.id,
                    businessName: business.name,
                    businessSlug: business.slug || "",
                    email: "",
                    enabledModules: business.modules || [],
                    isStaff: false,
                    role: "owner",
                    permissions: [],
                };
            }
        } catch (error) {
            console.error("Failed to load impersonated business:", error);
        }
    }
    // Handle owner session
    else if (ownerSession?.businessId) {
        sessionData = { ...ownerSession };

        try {
            const business = await getBusiness(ownerSession.businessId);
            if (business) {
                sessionData.businessName = business.name;
                sessionData.businessSlug = business.slug || "";

                // Get modules from business
                let modules = business.modules || [];

                // If business has industry_id, try to sync modules (only if modules is empty array)
                if (business.industry_id && modules.length === 0) {
                    try {
                        // Import REST functions dynamically to avoid issues
                        const { getCollectionREST, updateDocumentREST } = await import('@/lib/documentStore');
                        const industryDefinitions = await getCollectionREST('industry_definitions');
                        const industryDef = industryDefinitions.find(
                            (def) => def.slug === business.industry_id ||
                                def.id === business.industry_id ||
                                (def.slug as string)?.toLowerCase() === business.industry_id?.toLowerCase()
                        );

                        if (industryDef && Array.isArray(industryDef.modules) && industryDef.modules.length > 0) {
                            const industryModules = industryDef.modules as string[];
                            await updateDocumentREST('businesses', ownerSession.businessId, {
                                modules: industryModules,
                            });
                            modules = industryModules;
                        }
                    } catch (syncError) {
                        console.error('[Panel] Module sync error:', syncError);
                    }
                }

                // Use modules from database, fallback to industry-based lookup
                if (modules.length === 0 && business.industry_id) {
                    const { getModulesForIndustry } = await import('@/lib/industryService');
                    modules = getModulesForIndustry(business.industry_id);
                }

                sessionData.enabledModules = modules;
            }
        } catch (error) {
            console.error("Failed to load owner business:", error);
            sessionData.businessName = ownerSession.email?.split("@")[0] || "İşletmem";
        }
    }
    // Handle staff session 
    else if (staffSession?.businessId) {
        sessionData = { ...staffSession };

        try {
            const business = await getBusiness(staffSession.businessId);
            if (business) {
                sessionData.businessName = business.name;
                sessionData.businessSlug = business.slug || "";
                sessionData.enabledModules = business.modules || [];
            }
        } catch (error) {
            console.error("Failed to load staff business:", error);
        }
    }

    return (
        <PanelClientLayout
            businessName={sessionData.businessName}
            enabledModules={sessionData.enabledModules}
            session={sessionData}
        >
            {children}
        </PanelClientLayout>
    );
}
