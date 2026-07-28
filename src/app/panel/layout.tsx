import { redirect } from "next/navigation";

import PanelClientLayout from "@/components/panel/PanelClientLayout";
import { loadPanelSession } from "@/lib/panel/session";

export default async function PanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await loadPanelSession();

    if (!session) {
        redirect("/giris-yap");
    }

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
