import { redirect } from "next/navigation";

import { PanelModuleNotice } from "@/components/panel/PanelModuleNotice";
import {
    getPanelModuleAccess,
    getPanelRouteAccess,
    type PanelModuleId,
} from "@/lib/panel/moduleEntitlements";
import { loadPanelSession } from "@/lib/panel/session";

export async function PanelModuleGate({
    children,
    pathname,
    moduleId,
}: {
    children: React.ReactNode;
    pathname?: string;
    moduleId?: Exclude<PanelModuleId, "core">;
}) {
    const session = await loadPanelSession();

    if (!session) {
        redirect("/giris-yap");
    }

    const access = pathname
        ? getPanelRouteAccess(pathname, {
            enabledModules: session.enabledModules,
        })
        : getPanelModuleAccess(moduleId!, {
            enabledModules: session.enabledModules,
        });

    if (access.kind === "allowed") {
        return <>{children}</>;
    }

    return (
        <PanelModuleNotice
            title={access.title}
            description={access.description}
            primaryHref={access.primaryHref}
            primaryLabel={access.primaryLabel}
        />
    );
}
