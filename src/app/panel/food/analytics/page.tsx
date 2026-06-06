import { PanelModuleNotice } from "@/components/panel/PanelModuleNotice";

export default function FoodAnalyticsPage() {
    return (
        <PanelModuleNotice
            title="Restoran analytics bu MVP'de acik degil"
            description="Yari hazir veya yapay gorunen analytics ekranlarini yayina acmak yerine restoran panelini simdilik menu, masa ve temel ayarlar ile sinirli tutuyoruz."
            primaryHref="/panel/food/menu"
            primaryLabel="Menu yonetimine git"
        />
    );
}
