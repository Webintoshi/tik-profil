import { PanelModuleNotice } from "@/components/panel/PanelModuleNotice";

export default function FastfoodCampaignsPage() {
    return (
        <PanelModuleNotice
            title="Kampanya ekrani henuz acik degil"
            description="Ilk MVP'de yarim kalan kampanya akislarini gostermiyoruz. Fast food panelinde sadece operasyonel ve guvenilir sayfalari acik tutuyoruz."
            primaryHref="/panel/fastfood/orders"
            primaryLabel="Siparislere git"
        />
    );
}
