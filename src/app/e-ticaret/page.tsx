import { Metadata } from "next";
import ClientEcommercePage from "./ClientEcommercePage";

export const metadata: Metadata = {
    title: "Instagram & WhatsApp E-ticaret Altyapısı",
    description: "Web sitesi masrafına girmeden Instagram biyografinizden satış yapın. Ürünlerinizi listeleyin, WhatsApp üzerinden komisyonsuz sipariş alın.",
    keywords: ["instagram satış linki", "bio link e-ticaret", "whatsapp sipariş", "sosyal medya mağaza", "link in bio", "komisyonsuz e-ticaret"],
    alternates: {
        canonical: '/e-ticaret',
    },
};

export default function EcommercePage() {
    return <ClientEcommercePage />;
}
