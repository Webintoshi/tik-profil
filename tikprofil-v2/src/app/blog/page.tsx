import { Metadata } from "next";
import ClientBlogPage from "./ClientBlogPage";

export const metadata: Metadata = {
    title: "Blog | Tık Profil",
    description: "Dijital pazarlama, QR menü teknolojileri ve işletme yönetimi hakkında en güncel ipuçları ve rehberler.",
    alternates: {
        canonical: '/blog',
    },
};

export default function BlogPage() {
    return <ClientBlogPage />;
}
