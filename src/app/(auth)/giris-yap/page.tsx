import { getAuthProvider } from "@/lib/env";
import { LogtoSignInCard } from "@/components/auth/LogtoSignInCard";
import LegacyLoginForm from "./LegacyLoginForm";

export default function GirisYapPage() {
    if (getAuthProvider() === "logto") {
        return (
            <LogtoSignInCard
                actorHint="business"
                brand="Tik Profil"
                defaultCallbackPath="/panel"
                loginPath="/giris-yap"
                subtitle="Isletme Paneli"
                title="Logto ile giris yapin"
            />
        );
    }

    return <LegacyLoginForm />;
}
