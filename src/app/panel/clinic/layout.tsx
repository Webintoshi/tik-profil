import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function ClinicPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="clinic">{children}</PanelModuleGate>;
}
