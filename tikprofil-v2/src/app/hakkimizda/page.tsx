import { Metadata } from "next";
import ClientAboutPage from "./ClientAboutPage";

export const metadata: Metadata = {
    title: "Hakkımızda | Tık Profil",
    description: "Tık Profil, işletmelerin dijital dönüşümünü sağlayan yeni nesil bir teknoloji şirketidir. Misyonumuz, vizyonumuz ve değerlerimiz hakkında bilgi alın.",
    alternates: {
        canonical: '/hakkimizda',
    },
};

export default function AboutPage() {
    return <ClientAboutPage />;
}
