import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function FoodPanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="food">{children}</PanelModuleGate>;
}
