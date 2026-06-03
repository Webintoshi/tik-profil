import { PanelModuleNotice } from "@/components/panel/PanelModuleNotice";

export default function FoodPanelPage() {
    return (
        <PanelModuleNotice
            title="Restoran modulu hazirlaniyor"
            description="Restoran panelinin temel sayfalari duruyor, ancak bu kok ekranini ilk MVP icin acmiyoruz. Yalanci analytics veya yarim akislarla sizi yaniltmak yerine sadece guvenli alt sayfalari baglantiyla birakiyoruz."
            primaryHref="/panel/food/menu"
            primaryLabel="Menu yonetimine git"
        />
    );
}
