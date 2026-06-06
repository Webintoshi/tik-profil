import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function BeautyPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="beauty">{children}</PanelModuleGate>;
}
