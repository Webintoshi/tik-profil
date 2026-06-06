import { Suspense } from "react";
import { getAuthProvider } from "@/lib/env";
import { LogtoSignInCard, LogtoSignInFallback } from "@/components/auth/LogtoSignInCard";
import LegacyAdminLoginPage from "./LegacyAdminLoginPage";

export default function LoginPage() {
    if (getAuthProvider() === "logto") {
        return (
            <Suspense fallback={<LogtoSignInFallback />}>
                <LogtoSignInCard
                    actorHint="platform_admin"
                    brand="Tik Profil"
                    defaultCallbackPath="/dashboard"
                    loginPath="/webintoshi"
                    subtitle="Yonetim Paneli"
                    title="Platform girisi"
                />
            </Suspense>
        );
    }

    return <LegacyAdminLoginPage />;
}
