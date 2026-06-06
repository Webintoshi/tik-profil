import { PanelModuleGate } from "@/components/panel/PanelModuleGate";

export default function EcommercePanelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelModuleGate moduleId="ecommerce">{children}</PanelModuleGate>;
}
