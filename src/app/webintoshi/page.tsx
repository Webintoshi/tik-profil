import { getAuthProvider } from "@/lib/env";
import { LogtoSignInCard } from "@/components/auth/LogtoSignInCard";
import LegacyAdminLoginPage from "./LegacyAdminLoginPage";

export default function LoginPage() {
    if (getAuthProvider() === "logto") {
        return (
            <LogtoSignInCard
                actorHint="platform_admin"
                brand="Tik Profil"
                defaultCallbackPath="/dashboard"
                loginPath="/webintoshi"
                subtitle="Yonetim Paneli"
                title="Platform girisi"
            />
        );
    }

    return <LegacyAdminLoginPage />;
}
