import { Jost } from "next/font/google";
import { redirect } from "next/navigation";

import AccountActivationClient from "@/components/panel/AccountActivationClient";
import { loadPanelSession } from "@/lib/panel/session";
import {
    getAccountActivationIdentity,
    getBusinessAccountActivation,
} from "@/server/business-imports/account-activation";

const jost = Jost({ subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata = {
    robots: { index: false, follow: false },
    title: "Hesap Aktivasyonu",
};

export default async function AccountActivationPage({
    searchParams,
}: {
    searchParams: Promise<{ verification?: string }>;
}) {
    const [session, query] = await Promise.all([loadPanelSession(), searchParams]);
    if (!session) redirect("/giris-yap");
    const identity = getAccountActivationIdentity(session);
    if (!identity) redirect("/panel");
    const state = await getBusinessAccountActivation(identity);
    if (!state || state === "active") redirect("/panel");

    return (
        <AccountActivationClient
            businessName={session.businessName}
            initialState={state}
            verification={query.verification === "invalid" ? "invalid" : null}
            fontClassName={jost.className}
        />
    );
}
