import { Metadata } from "next";
import ClientEcommercePage from "./ClientEcommercePage";

export const metadata: Metadata = {
    title: "Instagram Bio Link ve WhatsApp E-ticaret | Komisyonsuz Satış",
    description: "Web sitesi masrafına girmeden Instagram biyografinizden satış yapın. Ürünlerinizi listeleyin, WhatsApp üzerinden komisyonsuz sipariş alın. Trendyol komisyonlarına son!",
    keywords: ["instagram satış linki", "bio link e-ticaret", "whatsapp sipariş", "sosyal medya mağaza", "link in bio", "komisyonsuz e-ticaret", "instagram butik satışı", "whatsapp katalog", "online satış sitesi"],
    openGraph: {
        title: "Instagram Bio Link ve WhatsApp E-ticaret | Tık Profil",
        description: "Web sitesi masrafına girmeden Instagram biyografinizden satış yapın. Komisyonsuz e-ticaret.",
        url: 'https://tikprofil.com/e-ticaret',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
        images: [
            {
                url: 'https://tikprofil.com/og-eticaret.jpg',
                width: 1200,
                height: 630,
                alt: 'Tık Profil - Instagram Bio Link ve WhatsApp E-ticaret'
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Instagram Bio Link ve WhatsApp E-ticaret | Tık Profil",
        description: "Web sitesi masrafına girmeden Instagram biyografinizden satış yapın. Komisyonsuz e-ticaret.",
        images: ['https://tikprofil.com/og-eticaret.jpg']
    },
    alternates: {
        canonical: '/e-ticaret',
    },
};

export default function EcommercePage() {
    return <ClientEcommercePage />;
}
