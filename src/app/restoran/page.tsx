import { Metadata } from "next";
import ClientRestoranPage from "./ClientRestoranPage";

export const metadata: Metadata = {
    title: "Restoran QR Menü Sistemi & Dijital Sipariş",
    description: "Restoranınız için komisyonsuz QR Menü ve Masadan Sipariş sistemi. Baskı maliyetinden kurtulun, siparişleri hızlandırın ve cironuzu artırın.",
    keywords: ["restoran qr menü", "dijital menü", "masadan sipariş", "qr kod menü", "restoran yazılımı", "temassız menü"],
    alternates: {
        canonical: '/restoran',
    },
};

export default function RestoranPage() {
    return <ClientRestoranPage />;
}
