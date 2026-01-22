export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    date: string;
    author: {
        name: string;
        image: string;
    };
    category: string;
    readTime: string;
    tags: string[];
    published: boolean;
}

export interface BlogCategory {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
}

export const blogCategories: BlogCategory[] = [
    {
        id: "rehberler",
        name: "Rehberler",
        slug: "rehberler",
        description: "Adım adım rehberler ve how-to içerikleri",
        icon: "BookOpen",
        color: "from-blue-500 to-cyan-500"
    },
    {
        id: "stratejiler",
        name: "Stratejiler",
        slug: "stratejiler",
        description: "İçerik ve pazarlama stratejileri",
        icon: "Target",
        color: "from-purple-500 to-pink-500"
    },
    {
        id: "oneriler",
        name: "Öneriler",
        slug: "oneriler",
        description: "En iyi uygulamalar ve ipuçları",
        icon: "Lightbulb",
        color: "from-amber-500 to-orange-500"
    },
    {
        id: "trendler",
        name: "Trendler",
        slug: "trendler",
        description: "Güncel trendler ve yenilikler",
        icon: "TrendingUp",
        color: "from-green-500 to-emerald-500"
    },
    {
        id: "analizler",
        name: "Analizler",
        slug: "analizler",
        description: "Veri odaklı analizler ve raporlar",
        icon: "BarChart3",
        color: "from-indigo-500 to-violet-500"
    },
    {
        id: "case-studies",
        name: "Başarı Hikayeleri",
        slug: "case-studies",
        description: "Gerçek başarı hikayeleri ve örnekler",
        icon: "Award",
        color: "from-rose-500 to-red-500"
    },
    {
        id: "faq",
        name: "Sıkça Sorulanlar",
        slug: "faq",
        description: "Sık sorulan sorular ve cevaplar",
        icon: "HelpCircle",
        color: "from-slate-500 to-gray-500"
    },
    {
        id: "isletme-profili",
        name: "İşletme Profili",
        slug: "isletme-profili",
        description: "İşletme profili optimizasyonu ve stratejileri",
        icon: "Target",
        color: "from-teal-500 to-cyan-500"
    },
    {
        id: "sablonlar",
        name: "Şablonlar",
        slug: "sablonlar",
        description: "Hazır şablonlar ve örnekler",
        icon: "Lightbulb",
        color: "from-pink-500 to-rose-500"
    }
];

export const blogPosts: BlogPost[] = [];

