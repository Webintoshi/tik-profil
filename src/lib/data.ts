import type { Business, Package, IndustryModule } from "@/types";

// Mock Businesses Data - Turkish
export const businesses: Business[] = [
    {
        id: "1",
        name: "Grand Otel İstanbul",
        email: "info@grandotel.com.tr",
        slug: "grand-otel-istanbul",
        status: "active",
        package: "ultimate",
        modules: ["hotels", "restaurants"],
        createdAt: new Date("2024-01-15"),
        owner: "Ahmet Yılmaz",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date("2025-06-15"),
        packageId: "ultimate",
    },
    {
        id: "2",
        name: "Patili Dostlar Pet Shop",
        email: "info@patilidostlar.com",
        slug: "patili-dostlar",
        status: "active",
        package: "pro",
        modules: ["petshops"],
        createdAt: new Date("2024-02-20"),
        owner: "Elif Demir",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date("2025-01-05"), // 15 days remaining
        packageId: "pro",
    },
    {
        id: "3",
        name: "Hızlı Lezzet Express",
        email: "siparis@hizlilezzet.com",
        slug: "hizli-lezzet",
        status: "pending",
        package: "starter",
        modules: ["fastfood"],
        createdAt: new Date("2024-03-10"),
        owner: "Mehmet Kaya",
        subscriptionStatus: "trial",
        subscriptionEndDate: new Date("2024-12-25"), // 5 days remaining (warning)
        packageId: "starter",
    },
    {
        id: "4",
        name: "Şehir Emlak",
        email: "satis@sehiremlak.com",
        slug: "sehir-emlak",
        status: "active",
        package: "pro",
        modules: ["realestate"],
        createdAt: new Date("2024-03-25"),
        owner: "Zeynep Özkan",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date("2025-03-25"),
        packageId: "pro",
    },
    {
        id: "5",
        name: "Güneş Kafe",
        email: "info@guneskafe.com",
        slug: "gunes-kafe",
        status: "expired",
        package: "starter",
        modules: ["restaurants"],
        createdAt: new Date("2024-04-05"),
        owner: "Can Arslan",
        subscriptionStatus: "expired",
        subscriptionEndDate: new Date("2024-10-01"), // Expired
        packageId: "starter",
    },
];

// Package Options - Turkish
export const packages: Package[] = [
    {
        id: "starter",
        name: "Başlangıç",
        description: "Yeni başlayan küçük işletmeler için ideal",
        price: 299,
        features: ["1 Sektör Modülü", "Temel Analitik", "E-posta Desteği", "5 Ekip Üyesi"],
        color: "from-dark-600 to-dark-700",
    },
    {
        id: "pro",
        name: "Profesyonel",
        description: "Büyüyen işletmeler için güçlü çözüm",
        price: 799,
        features: ["3 Sektör Modülü", "Gelişmiş Analitik", "Öncelikli Destek", "15 Ekip Üyesi", "API Erişimi"],
        color: "from-accent-blue to-accent-indigo",
    },
    {
        id: "ultimate",
        name: "Kurumsal",
        description: "Büyük operasyonlar için kurumsal çözüm",
        price: 1999,
        features: ["Sınırsız Modül", "Özel Analitik", "7/24 Özel Destek", "Sınırsız Ekip", "Tam API Erişimi", "Beyaz Etiket"],
        color: "from-accent-purple to-accent-pink",
    },
];

// Industry Modules - Turkish
export const industryModules: IndustryModule[] = [
    { id: "hotels", name: "Oteller", description: "Rezervasyon ve oda yönetimi", icon: "Building", category: "Konaklama" },
    { id: "restaurants", name: "Restoranlar", description: "Masa ve menü yönetimi", icon: "UtensilsCrossed", category: "Yeme & İçme" },
    { id: "fastfood", name: "Fast Food", description: "Hızlı servis operasyonları", icon: "Pizza", category: "Yeme & İçme" },
    { id: "petshops", name: "Pet Shop", description: "Evcil hayvan ve ürün yönetimi", icon: "Cat", category: "Perakende" },
    { id: "realestate", name: "Emlak", description: "Emlak ilanları yönetimi", icon: "Home", category: "Gayrimenkul" },
    { id: "gyms", name: "Spor Salonları", description: "Üyelik ve ders yönetimi", icon: "Dumbbell", category: "Sağlık & Fitness" },
    { id: "salons", name: "Güzellik Salonları", description: "Randevu ve hizmet yönetimi", icon: "Scissors", category: "Güzellik" },
    { id: "clinics", name: "Klinikler", description: "Hasta kayıt yönetimi", icon: "Stethoscope", category: "Sağlık" },
];
