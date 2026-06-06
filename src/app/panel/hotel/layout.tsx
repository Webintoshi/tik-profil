import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function HotelPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="hotel">{children}</PanelModuleGate>;
}
