import { Metadata } from "next";
import ClientOtelPage from "./ClientOtelPage";

export const metadata: Metadata = {
    title: "Otel Dijital Asistan & Oda Servisi Yazılımı",
    description: "Misafirleriniz resepsiyonu aramadan oda servisi siparişi versin. Otel içi tüm hizmetleri tek bir QR kod ile dijitalleştirin.",
    keywords: ["otel qr menü", "oda servisi yazılımı", "otel dijital asistan", "misafir deneyimi", "otel yazılımı", "dijital resepsiyon"],
    alternates: {
        canonical: '/otel',
    },
};

export default function OtelPage() {
    return <ClientOtelPage />;
}
