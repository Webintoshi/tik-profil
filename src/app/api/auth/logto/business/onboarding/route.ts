import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { checkRateLimit, recordSuccess } from "@/lib/rateLimit";
import {
    BusinessSelfRegistrationError,
    createBusinessSelfRegistrationService,
} from "@/server/auth/logto/businessSelfRegistration";
import { createQueryBackedBusinessSelfRegistrationRepository } from "@/server/auth/logto/businessSelfRegistrationRepository";
import {
    BUSINESS_ONBOARDING_COOKIE,
    clearAllLocalSessionCookies,
    createLogtoBusinessSessionToken,
    setBusinessOwnerSessionCookie,
    verifyLogtoBusinessOnboardingToken,
} from "@/server/auth/logto/session";

const onboardingSchema = z.object({
    businessName: z.string().trim().min(2).max(80),
    industryId: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{1,80}$/),
    industryLabel: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(10).max(24),
});

function clientIp(request: NextRequest): string {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown";
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
        return NextResponse.json({ success: false, error: "Geçersiz istek kaynağı." }, { status: 403 });
    }

    const rateLimit = checkRateLimit(clientIp(request), "business-self-registration");
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { success: false, error: rateLimit.message },
            { headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) }, status: 429 },
        );
    }

    const cookieStore = await cookies();
    const identity = await verifyLogtoBusinessOnboardingToken(
        cookieStore.get(BUSINESS_ONBOARDING_COOKIE)?.value,
    );
    if (!identity) {
        return NextResponse.json({ success: false, error: "Kayıt oturumu sona erdi." }, { status: 401 });
    }

    const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, error: "İşletme bilgilerini kontrol edin." },
            { status: 400 },
        );
    }

    try {
        const service = createBusinessSelfRegistrationService({
            repository: createQueryBackedBusinessSelfRegistrationRepository(),
        });
        const registration = await service.register({
            ...parsed.data,
            appUserId: identity.appUserId,
            displayName: identity.displayName,
            email: identity.email,
            logtoSub: identity.logtoSub,
        });
        const sessionToken = await createLogtoBusinessSessionToken({
            appUserId: registration.appUserId,
            authProvider: "logto",
            businessId: registration.businessId,
            businessName: registration.businessName,
            businessSlug: registration.businessSlug,
            email: registration.email ?? undefined,
            enabledModules: registration.enabledModules,
            isStaff: false,
            logtoRoles: [],
            logtoSub: registration.logtoSub,
            permissions: [],
            role: "owner",
        });
        const response = NextResponse.json({
            success: true,
            redirect: "/panel/profile",
        });

        clearAllLocalSessionCookies(response);
        setBusinessOwnerSessionCookie(response, sessionToken);
        recordSuccess(clientIp(request), "business-self-registration");
        return response;
    } catch (error) {
        const status = error instanceof BusinessSelfRegistrationError && error.code === "identity_conflict"
            ? 409
            : 500;
        console.error("Business self-registration failed:", error);
        return NextResponse.json(
            { success: false, error: status === 409 ? "Bu hesap başka bir işletmeyle eşleşiyor." : "Kayıt tamamlanamadı." },
            { status },
        );
    }
}
