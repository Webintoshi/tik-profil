import { redirect } from "next/navigation";
import { headers } from "next/headers";

import PanelClientLayout from "@/components/panel/PanelClientLayout";
import { readPanelForwardedPathname } from "@/lib/panel/request-path";
import { loadPanelSession } from "@/lib/panel/session";
import {
    getAccountActivationIdentity,
    getBusinessAccountActivation,
    getPanelActivationRedirect,
} from "@/server/business-imports/account-activation";

const ACTIVATION_PATH = "/panel/hesap-aktivasyonu";

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await loadPanelSession();

    if (!session) {
        redirect("/giris-yap");
    }

    const requestHeaders = await headers();
    const pathname = readPanelForwardedPathname(requestHeaders);
    const identity = getAccountActivationIdentity(session);
    const activationState = identity ? await getBusinessAccountActivation(identity) : null;
    const activationRedirect = getPanelActivationRedirect(pathname, session, activationState);
    if (activationRedirect) redirect(activationRedirect);

    if (pathname === "/panel/hesap-aktivasyonu") return <>{children}</>;

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
