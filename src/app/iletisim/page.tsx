import { Metadata } from "next";
import ClientContactPage from "./ClientContactPage";

export const metadata: Metadata = {
    title: "İletişim | Tık Profil",
    description: "Sorularınız ve destek talepleriniz için bize ulaşın. Tık Profil iletişim bilgileri, adres ve destek hattı.",
    alternates: {
        canonical: '/iletisim',
    },
};

export default function ContactPage() {
    return <ClientContactPage />;
}
