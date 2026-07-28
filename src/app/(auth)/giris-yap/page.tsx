import { Suspense } from "react";
import { getAuthProvider } from "@/lib/env";
import { LogtoSignInCard, LogtoSignInFallback } from "@/components/auth/LogtoSignInCard";
import LegacyLoginForm from "./LegacyLoginForm";

export default function GirisYapPage() {
    if (getAuthProvider() === "logto") {
        return (
            <Suspense fallback={<LogtoSignInFallback />}>
                <LogtoSignInCard
                    actorHint="business"
                    brand="Tik Profil"
                    defaultCallbackPath="/panel/profile"
                    loginPath="/giris-yap"
                    subtitle="Isletme Paneli"
                    title="Logto ile giris yapin"
                />
            </Suspense>
        );
    }

    return <LegacyLoginForm />;
}
