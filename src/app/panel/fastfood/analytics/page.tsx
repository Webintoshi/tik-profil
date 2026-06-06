import { PanelModuleNotice } from "@/components/panel/PanelModuleNotice";

export default function FastfoodAnalyticsPage() {
    return (
        <PanelModuleNotice
            title="Fast food analytics bu MVP'de acik degil"
            description="Guvenilir olmayan analytics yuzeylerini one cikarmak yerine aktif fast food panelini siparis, menu ve operasyon ekranlariyla sinirli tutuyoruz."
            primaryHref="/panel/fastfood/orders"
            primaryLabel="Siparislere git"
        />
    );
}
