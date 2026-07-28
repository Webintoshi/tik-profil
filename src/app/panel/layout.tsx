import { redirect } from "next/navigation";

import PanelClientLayout from "@/components/panel/PanelClientLayout";
import { loadPanelSession } from "@/lib/panel/session";
import {
    getAccountActivationIdentity,
    getBusinessAccountActivation,
    getPanelActivationRedirect,
} from "@/server/business-imports/account-activation";

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await loadPanelSession();

    if (!session) {
        redirect("/giris-yap");
    }

    const identity = getAccountActivationIdentity(session);
    const activationState = identity ? await getBusinessAccountActivation(identity) : null;
    const activationRedirect = getPanelActivationRedirect("/panel", session, activationState);
    if (activationRedirect) redirect(activationRedirect);

    return (
        <PanelClientLayout
            businessName={session.businessName}
            enabledModules={session.enabledModules}
            session={session}
        >
            {children}
        </PanelClientLayout>
    );
}
