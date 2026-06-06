import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function FastfoodPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="fastfood">{children}</PanelModuleGate>;
}
