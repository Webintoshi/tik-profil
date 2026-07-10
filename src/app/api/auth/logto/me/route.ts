import { NextResponse } from "next/server";
import { getSession as getAdminSession } from "@/lib/auth";
import { getSession as getBusinessSession } from "@/lib/apiAuth";

export async function GET() {
    const businessSession = await getBusinessSession();
    if (businessSession?.authProvider === "logto") {
        return NextResponse.json({
            actorType: "business",
            appUserId: businessSession.appUserId ?? null,
            businessId: businessSession.businessId,
            businessName: businessSession.businessName,
            businessSlug: businessSession.businessSlug,
            email: businessSession.email,
            enabledModules: businessSession.enabledModules,
            isStaff: businessSession.isStaff,
            logtoSub: businessSession.logtoSub ?? null,
            permissions: businessSession.permissions,
            provider: "logto",
            role: businessSession.role,
            staffId: businessSession.staffId ?? null,
            success: true,
        });
    }

    const adminSession = await getAdminSession();
    if (adminSession?.authProvider === "logto") {
        return NextResponse.json({
            actorType: "platform_admin",
            appUserId: adminSession.appUserId ?? null,
            email: adminSession.email ?? null,
            logtoSub: adminSession.logtoSub ?? null,
            provider: "logto",
            success: true,
            username: adminSession.username,
        });
    }

    return NextResponse.json(
        {
            error: "No Logto session",
            success: false,
        },
        { status: 401 },
    );
}
