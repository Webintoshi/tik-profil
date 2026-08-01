import { redirect } from "next/navigation";
import { getAuthProvider } from "@/lib/env";
import { BusinessLogtoRecovery } from "@/components/auth/BusinessLogtoRecovery";
import { resolveBusinessLogtoEntry } from "@/server/auth/logto/business-entry";
import LegacyLoginForm from "./LegacyLoginForm";

interface GirisYapPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstSearchParam(value: string | string[] | undefined): string | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function GirisYapPage({ searchParams }: GirisYapPageProps) {
    if (getAuthProvider() === "logto") {
        const params = searchParams ? await searchParams : {};
        const entry = resolveBusinessLogtoEntry({
            authError: firstSearchParam(params.authError),
            callbackUrl: firstSearchParam(params.callbackUrl),
            logout: firstSearchParam(params.logout),
        });

        if (entry.kind === "redirect") {
            redirect(entry.href);
        }

        return (
            <BusinessLogtoRecovery
                authError={entry.authError}
                loggedOut={entry.loggedOut}
                retryHref={entry.retryHref}
            />
        );
    }

    return <LegacyLoginForm />;
}
