import { Metadata } from "next";
import ClientFastFoodPage from "./ClientFastFoodPage";

export const metadata: Metadata = {
    title: "Fast Food Sipariş Sistemi - Komisyonsuz",
    description: "Yemek sepeti komisyonlarına son! Kendi sipariş sisteminizi kurun, müşterileriniz QR kod veya link üzerinden anında sipariş versin.",
    keywords: ["fast food qr menü", "dönerci sipariş sistemi", "burgerci dijital menü", "hızlı sipariş yazılımı", "online sipariş sistemi", "komisyonsuz yemek siparişi"],
    alternates: {
        canonical: '/fast-food',
    },
};

export default function FastFoodPage() {
    return <ClientFastFoodPage />;
}
