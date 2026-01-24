import { Metadata } from "next";
import ClientRestoranPage from "./ClientRestoranPage";

export const metadata: Metadata = {
    title: "Restoran QR Menü Sistemi ve Masadan Sipariş | Tık Profil",
    description: "Restoranınız için komisyonsuz QR Menü ve Masadan Sipariş sistemi. Fiyatlarınızı saniyeler içinde güncelleyin, menü baskı maliyetlerinden kurtulun. Temassız menü ile müşterilerinize modern deneyim sunun.",
    keywords: ["restoran qr menü", "dijital menü", "masadan sipariş sistemi", "qr kod menü", "restoran yazılımı", "temassız menü", "cafe qr menü", "lokanta qr kod", "restoran sipariş sistemi", "online menü"],
    openGraph: {
        title: "Restoran QR Menü Sistemi ve Masadan Sipariş | Tık Profil",
        description: "Restoranınız için komisyonsuz QR Menü ve Masadan Sipariş sistemi. Fiyatlarınızı saniyeler içinde güncelleyin.",
        url: 'https://tikprofil.com/restoran',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
        images: [
            {
                url: 'https://tikprofil.com/og-restoran.jpg',
                width: 1200,
                height: 630,
                alt: 'Tık Profil - Restoran QR Menü Sistemi'
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Restoran QR Menü Sistemi ve Masadan Sipariş | Tık Profil",
        description: "Restoranınız için komisyonsuz QR Menü ve Masadan Sipariş sistemi. Fiyatlarınızı saniyeler içinde güncelleyin.",
        images: ['https://tikprofil.com/og-restoran.jpg']
    },
    alternates: {
        canonical: '/restoran',
    },
};

export default function RestoranPage() {
    return <ClientRestoranPage />;
}
