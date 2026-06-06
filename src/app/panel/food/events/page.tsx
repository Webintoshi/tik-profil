import { PanelModuleNotice } from "@/components/panel/PanelModuleNotice";

export default function FoodEventsPage() {
    return (
        <PanelModuleNotice
            title="Restoran etkinlik akisi henuz acik degil"
            description="Ilk MVP'de yalnizca guvenli restoran ekranlarini gosteriyoruz. Etkinlik ve rezervasyon benzeri yari hazir akislar daha sonraki sertlestirme dalinda geri donecek."
            primaryHref="/panel/food/menu"
            primaryLabel="Menu yonetimine git"
        />
    );
}
