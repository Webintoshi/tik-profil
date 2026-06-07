import type { SessionPayload as AdminSessionPayload } from "../../lib/auth.ts";
import type { SessionUser } from "../../lib/apiAuth.ts";
import type { CustomerSession } from "../../lib/customerAuth.ts";

export interface CustomerActorSnapshot {
    adminSession: AdminSessionPayload | null;
    businessSession: SessionUser | null;
    customerSession: CustomerSession | null;
    hasConsultantSession: boolean;
}

export type CustomerActorResolution =
    | { kind: "customer"; session: CustomerSession }
    | { kind: "forbidden"; message: string }
    | { kind: "unauthorized"; message: string };

export function requireCustomerActorFromSnapshot(
    snapshot: CustomerActorSnapshot,
): CustomerActorResolution {
    if (snapshot.customerSession) {
        return {
            kind: "customer",
            session: snapshot.customerSession,
        };
    }

    if (snapshot.businessSession || snapshot.adminSession || snapshot.hasConsultantSession) {
        return {
            kind: "forbidden",
            message: "Bu islem icin musteri oturumu gerekli.",
        };
    }

    return {
        kind: "unauthorized",
        message: "Oturum bulunamadi. Lutfen tekrar giris yapin.",
    };
}

export function createCustomerFeatureNotReadyError(featureName: string) {
    const normalizedFeatureName = featureName.trim() || "Bu ozellik";
    return {
        code: "FEATURE_NOT_READY" as const,
        message: `${normalizedFeatureName} henuz hazir degil.`,
        statusCode: 501 as const,
    };
}
