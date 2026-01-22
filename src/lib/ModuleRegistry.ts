// Central Module Registry
// Scalable architecture for 50+ business modules

import {
    Utensils, Coffee, Wine, Stethoscope, Heart, Syringe,
    Scissors, Wrench, Dumbbell, ShoppingBag, Store, Truck,
    Home, Building, Car, Plane, Palmtree, Camera, Music,
    Briefcase, GraduationCap, Baby, Dog, Cat, Flower2,
    Shirt, Watch, Gem, Sparkles, Zap, Wifi, Monitor,
    Smartphone, Headphones, Gamepad2, Book, Newspaper,
    Pill, Thermometer, Bone, Eye, Brain, Footprints,
    type LucideIcon
} from "lucide-react";

// Types
export type ModuleCategory =
    | "yeme_icme"
    | "saglik"
    | "hizmet"
    | "perakende"
    | "konaklama"
    | "ulasim"
    | "egitim"
    | "eglence"
    | "gayrimenkul";

export interface ModuleDefinition {
    id: string;
    label: string;
    icon: LucideIcon;
    category: ModuleCategory;
    color: string;
    description: string;
    lazyRoute?: string;
}

export interface CategoryDefinition {
    id: ModuleCategory;
    label: string;
    icon: LucideIcon;
    color: string;
}

// Category Definitions
export const MODULE_CATEGORIES: CategoryDefinition[] = [
    { id: "yeme_icme", label: "Yeme & İçme", icon: Utensils, color: "#FF9500" },
    { id: "saglik", label: "Sağlık & Bakım", icon: Heart, color: "#FF3B30" },
    { id: "hizmet", label: "Hizmet Sektörü", icon: Wrench, color: "#007AFF" },
    { id: "perakende", label: "Perakende & Ticaret", icon: ShoppingBag, color: "#AF52DE" },
    { id: "konaklama", label: "Konaklama & Turizm", icon: Building, color: "#5856D6" },
    { id: "ulasim", label: "Ulaşım & Lojistik", icon: Truck, color: "#34C759" },
    { id: "egitim", label: "Eğitim & Gelişim", icon: GraduationCap, color: "#FF2D55" },
    { id: "eglence", label: "Eğlence & Medya", icon: Music, color: "#FF9500" },
    { id: "gayrimenkul", label: "Gayrimenkul", icon: Home, color: "#8B5CF6" },
];

// Full Module Registry (50+ modules)
export const MODULE_REGISTRY: ModuleDefinition[] = [
    // Yeme & İçme (8)
    { id: "restaurant", label: "Restoran", icon: Utensils, category: "yeme_icme", color: "#FF9500", description: "Tam donanımlı restoran yönetimi" },
    { id: "cafe", label: "Kafe", icon: Coffee, category: "yeme_icme", color: "#8B4513", description: "Kafe ve kahve dükkanı" },
    { id: "bar", label: "Bar & Pub", icon: Wine, category: "yeme_icme", color: "#722F37", description: "Bar ve içki servisi" },
    { id: "fastfood", label: "Fast Food", icon: Utensils, category: "yeme_icme", color: "#FF6B35", description: "Hızlı yemek servisi" },
    { id: "bakery", label: "Pastane & Fırın", icon: Utensils, category: "yeme_icme", color: "#DEB887", description: "Pastane ve unlu mamul" },
    { id: "catering", label: "Catering", icon: Utensils, category: "yeme_icme", color: "#4169E1", description: "Toplu yemek hizmeti" },
    { id: "foodtruck", label: "Food Truck", icon: Truck, category: "yeme_icme", color: "#32CD32", description: "Mobil yemek satışı" },
    { id: "icecream", label: "Dondurmacı", icon: Sparkles, category: "yeme_icme", color: "#FFB6C1", description: "Dondurma ve tatlı" },

    // Sağlık (10)
    { id: "clinic", label: "Klinik", icon: Stethoscope, category: "saglik", color: "#007AFF", description: "Tıbbi klinik yönetimi" },
    { id: "dentist", label: "Dişçi", icon: Sparkles, category: "saglik", color: "#00CED1", description: "Diş hekimliği" },
    { id: "veteriner", label: "Veteriner", icon: Dog, category: "saglik", color: "#228B22", description: "Hayvan sağlığı" },
    { id: "pharmacy", label: "Eczane", icon: Pill, category: "saglik", color: "#32CD32", description: "İlaç ve sağlık ürünleri" },
    { id: "optik", label: "Optik", icon: Eye, category: "saglik", color: "#6495ED", description: "Gözlük ve lens" },
    { id: "physiotherapy", label: "Fizyoterapi", icon: Bone, category: "saglik", color: "#20B2AA", description: "Fizik tedavi merkezi" },
    { id: "psychology", label: "Psikoloji", icon: Brain, category: "saglik", color: "#9370DB", description: "Psikolojik danışmanlık" },
    { id: "nutrition", label: "Diyetisyen", icon: Heart, category: "saglik", color: "#3CB371", description: "Beslenme danışmanlığı" },
    { id: "laboratory", label: "Laboratuvar", icon: Thermometer, category: "saglik", color: "#4682B4", description: "Tıbbi tahlil merkezi" },
    { id: "hospital", label: "Hastane", icon: Syringe, category: "saglik", color: "#DC143C", description: "Hastane yönetimi" },

    // Hizmet (12)
    { id: "salon", label: "Güzellik Salonu", icon: Scissors, category: "hizmet", color: "#FF69B4", description: "Kuaför ve güzellik" },
    { id: "barber", label: "Berber", icon: Scissors, category: "hizmet", color: "#2F4F4F", description: "Erkek kuaförü" },
    { id: "spa", label: "SPA & Masaj", icon: Sparkles, category: "hizmet", color: "#DDA0DD", description: "Rahatlama merkezi" },
    { id: "gym", label: "Spor Salonu", icon: Dumbbell, category: "hizmet", color: "#FF4500", description: "Fitness merkezi" },
    { id: "carwash", label: "Oto Yıkama", icon: Car, category: "hizmet", color: "#1E90FF", description: "Araç temizlik" },
    { id: "mechanic", label: "Oto Tamir", icon: Wrench, category: "hizmet", color: "#696969", description: "Araç bakım servisi" },
    { id: "laundry", label: "Kuru Temizleme", icon: Shirt, category: "hizmet", color: "#87CEEB", description: "Çamaşır ve ütü" },
    { id: "repair", label: "Teknik Servis", icon: Wrench, category: "hizmet", color: "#FFD700", description: "Elektronik tamir" },
    { id: "cleaning", label: "Temizlik Hizmeti", icon: Sparkles, category: "hizmet", color: "#00FA9A", description: "Ev ve ofis temizliği" },
    { id: "photo", label: "Fotoğrafçı", icon: Camera, category: "hizmet", color: "#FF6347", description: "Fotoğraf stüdyosu" },
    { id: "tattoo", label: "Dövme Stüdyosu", icon: Zap, category: "hizmet", color: "#2F2F2F", description: "Dövme ve piercing" },
    { id: "tailor", label: "Terzi", icon: Scissors, category: "hizmet", color: "#8B008B", description: "Giysi tamir ve dikimi" },

    // Perakende (10)
    { id: "petshop", label: "Pet Shop", icon: Cat, category: "perakende", color: "#FF8C00", description: "Evcil hayvan ürünleri" },
    { id: "ecommerce", label: "E-Ticaret", icon: Monitor, category: "perakende", color: "#4B0082", description: "Online satış" },
    { id: "market", label: "Market", icon: Store, category: "perakende", color: "#228B22", description: "Süpermarket yönetimi" },
    { id: "florist", label: "Çiçekçi", icon: Flower2, category: "perakende", color: "#FF1493", description: "Çiçek satışı" },
    { id: "jewelry", label: "Kuyumcu", icon: Gem, category: "perakende", color: "#FFD700", description: "Mücevher satışı" },
    { id: "bookstore", label: "Kitapçı", icon: Book, category: "perakende", color: "#8B4513", description: "Kitap ve kırtasiye" },
    { id: "electronics", label: "Elektronik", icon: Smartphone, category: "perakende", color: "#1E90FF", description: "Elektronik cihaz satışı" },
    { id: "furniture", label: "Mobilya", icon: Home, category: "perakende", color: "#A0522D", description: "Ev mobilyası" },
    { id: "clothing", label: "Giyim Mağazası", icon: Shirt, category: "perakende", color: "#FF69B4", description: "Hazır giyim satışı" },
    { id: "watchstore", label: "Saatçi", icon: Watch, category: "perakende", color: "#2F4F4F", description: "Saat satış ve tamir" },

    // Konaklama (6)
    { id: "hotel", label: "Otel", icon: Building, category: "konaklama", color: "#4169E1", description: "Otel yönetimi" },
    { id: "hostel", label: "Hostel", icon: Building, category: "konaklama", color: "#20B2AA", description: "Hostel yönetimi" },
    { id: "villa", label: "Villa Kiralama", icon: Home, category: "konaklama", color: "#DAA520", description: "Tatil villası" },
    { id: "camping", label: "Kamp Alanı", icon: Palmtree, category: "konaklama", color: "#228B22", description: "Kamp ve doğa" },
    { id: "resort", label: "Tatil Köyü", icon: Palmtree, category: "konaklama", color: "#FF7F50", description: "Tatil köyü yönetimi" },
    { id: "aparthotel", label: "Apart Otel", icon: Building, category: "konaklama", color: "#6B8E23", description: "Apart daire yönetimi" },

    // Ulaşım (6)
    { id: "taxi", label: "Taksi Durağı", icon: Car, category: "ulasim", color: "#FFD700", description: "Taksi yönetimi" },
    { id: "rental", label: "Araç Kiralama", icon: Car, category: "ulasim", color: "#FF4500", description: "Rent a car" },
    { id: "logistics", label: "Lojistik", icon: Truck, category: "ulasim", color: "#2E8B57", description: "Kargo ve lojistik" },
    { id: "courier", label: "Kurye", icon: Footprints, category: "ulasim", color: "#FF6B35", description: "Kurye hizmeti" },
    { id: "parking", label: "Otopark", icon: Car, category: "ulasim", color: "#708090", description: "Otopark yönetimi" },
    { id: "travel", label: "Seyahat Acentesi", icon: Plane, category: "ulasim", color: "#00BFFF", description: "Tur ve seyahat" },

    // Eğitim (5)
    { id: "school", label: "Özel Okul", icon: GraduationCap, category: "egitim", color: "#4169E1", description: "Eğitim kurumu" },
    { id: "tutoring", label: "Özel Ders", icon: Book, category: "egitim", color: "#9370DB", description: "Birebir eğitim" },
    { id: "driving", label: "Sürücü Kursu", icon: Car, category: "egitim", color: "#DC143C", description: "Ehliyet eğitimi" },
    { id: "language", label: "Dil Kursu", icon: GraduationCap, category: "egitim", color: "#3CB371", description: "Yabancı dil eğitimi" },
    { id: "daycare", label: "Kreş", icon: Baby, category: "egitim", color: "#FFB6C1", description: "Çocuk bakımı" },

    // Eğlence (5)
    { id: "cinema", label: "Sinema", icon: Monitor, category: "eglence", color: "#DC143C", description: "Sinema salonu" },
    { id: "gaming", label: "Oyun Salonu", icon: Gamepad2, category: "eglence", color: "#9400D3", description: "Oyun merkezi" },
    { id: "concert", label: "Konser Mekanı", icon: Music, category: "eglence", color: "#FF1493", description: "Müzik etkinlikleri" },
    { id: "escape", label: "Kaçış Odası", icon: Zap, category: "eglence", color: "#2F2F2F", description: "Escape room" },
    { id: "bowling", label: "Bowling", icon: Sparkles, category: "eglence", color: "#FF6347", description: "Bowling salonu" },

    // Gayrimenkul (3)
    { id: "emlak", label: "Emlak Ofisi", icon: Home, category: "gayrimenkul", color: "#8B5CF6", description: "Emlak ilanları ve satış" },
    { id: "realestate", label: "Gayrimenkul", icon: Building, category: "gayrimenkul", color: "#7C3AED", description: "Gayrimenkul yönetimi" },
    { id: "construction", label: "İnşaat Firması", icon: Building, category: "gayrimenkul", color: "#6D28D9", description: "Proje satışı" },
];

// Helper functions
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
    return MODULE_REGISTRY.filter(m => m.category === category);
}

export function getModuleById(id: string): ModuleDefinition | undefined {
    return MODULE_REGISTRY.find(m => m.id === id);
}

export function getCategoryById(id: ModuleCategory): CategoryDefinition | undefined {
    return MODULE_CATEGORIES.find(c => c.id === id);
}

export function searchModules(query: string): ModuleDefinition[] {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return [];

    return MODULE_REGISTRY.filter(m =>
        m.label.toLowerCase().includes(normalized) ||
        m.description.toLowerCase().includes(normalized) ||
        m.id.includes(normalized)
    );
}

export function getModulesGroupedByCategory(): Record<ModuleCategory, ModuleDefinition[]> {
    const grouped: Record<ModuleCategory, ModuleDefinition[]> = {
        yeme_icme: [],
        saglik: [],
        hizmet: [],
        perakende: [],
        konaklama: [],
        ulasim: [],
        egitim: [],
        eglence: [],
        gayrimenkul: [],
    };

    for (const module of MODULE_REGISTRY) {
        grouped[module.category].push(module);
    }

    return grouped;
}

// Total module count
export const TOTAL_MODULES = MODULE_REGISTRY.length;
export const TOTAL_CATEGORIES = MODULE_CATEGORIES.length;
