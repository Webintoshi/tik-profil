import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function VehicleRentalPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="vehicle-rental">{children}</PanelModuleGate>;
}
