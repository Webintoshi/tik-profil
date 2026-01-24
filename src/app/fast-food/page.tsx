import { Metadata } from "next";
import ClientFastFoodPage from "./ClientFastFoodPage";

export const metadata: Metadata = {
    title: "Fast Food Sipariş Sistemi ve Dönerci Dijital Menü | Komisyonsuz",
    description: "Dönerci, burgerci ve tüm fast food işletmeleri için komisyonsuz sipariş sistemi. QR menü ile anında sipariş alın, müşterilerinizi kaybetmeyin. Yemek sepeti komisyonlarına son!",
    keywords: ["fast food sipariş sistemi", "dönerci sipariş sistemi", "burgerci dijital menü", "online sipariş yazılımı", "komisyonsuz yemek siparişi", "döner qr menü", "hamburger sipariş sistemi", "restoran sipariş sistemi"],
    openGraph: {
        title: "Fast Food Sipariş Sistemi ve Dönerci Dijital Menü | Tık Profil",
        description: "Dönerci, burgerci ve tüm fast food işletmeleri için komisyonsuz sipariş sistemi. QR menü ile anında sipariş alın.",
        url: 'https://tikprofil.com/fast-food',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
        images: [
            {
                url: 'https://tikprofil.com/og-fastfood.jpg',
                width: 1200,
                height: 630,
                alt: 'Tık Profil - Fast Food Sipariş Sistemi'
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Fast Food Sipariş Sistemi ve Dönerci Dijital Menü | Tık Profil",
        description: "Dönerci, burgerci ve tüm fast food işletmeleri için komisyonsuz sipariş sistemi. QR menü ile anında sipariş alın.",
        images: ['https://tikprofil.com/og-fastfood.jpg']
    },
    alternates: {
        canonical: '/fast-food',
    },
};

export default function FastFoodPage() {
    return <ClientFastFoodPage />;
}
