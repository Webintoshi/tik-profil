import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function EmlakPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="emlak">{children}</PanelModuleGate>;
}
