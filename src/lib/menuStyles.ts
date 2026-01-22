/**
 * Menu Style Types & Configurations
 * Premium menu customization system with multiple layouts
 */

export type MenuStyleId = "premium" | "modern" | "pill" | "minimal" | "gallery" | "compact" | "photo-right" | "category-grid";

export type LayoutType = "hero" | "grid" | "pill" | "list" | "masonry" | "compact-grid" | "photo-list" | "category-cards";

export interface MenuStyleConfig {
    id: MenuStyleId;
    name: string;
    description: string;
    emoji: string;
    layout: LayoutType;
    theme: "dark" | "light" | "warm" | "cool";
    colors: {
        background: string;
        cardBg: string;
        text: string;
        textSecondary: string;
        border: string;
    };
    cardStyle: {
        borderRadius: string;
        shadow: string;
        imageAspect: "square" | "wide" | "tall" | "circle" | "none";
        imageSize: "large" | "medium" | "small" | "thumbnail" | "none";
        imagePosition: "top" | "left" | "right" | "background";
        padding: string;
    };
    typography: {
        nameSize: string;
        nameWeight: string;
        priceSize: string;
        priceStyle: "bold" | "badge" | "subtle";
        descriptionSize: string;
    };
    addButton: {
        style: "circle" | "pill" | "square" | "none";
        size: "large" | "medium" | "small";
    };
}

export const MENU_STYLES: Record<MenuStyleId, MenuStyleConfig> = {
    premium: {
        id: "premium",
        name: "Premium",
        description: "Lüks restoranlar için büyük görseller ve karanlık tema",
        emoji: "👑",
        layout: "hero",
        theme: "dark",
        colors: {
            background: "#0a0a0a",
            cardBg: "#151515",
            text: "#ffffff",
            textSecondary: "#888888",
            border: "#252525"
        },
        cardStyle: {
            borderRadius: "20px",
            shadow: "0 8px 32px rgba(0,0,0,0.5)",
            imageAspect: "wide",
            imageSize: "large",
            imagePosition: "top",
            padding: "16px"
        },
        typography: {
            nameSize: "18px",
            nameWeight: "600",
            priceSize: "20px",
            priceStyle: "bold",
            descriptionSize: "14px"
        },
        addButton: {
            style: "circle",
            size: "large"
        }
    },
    modern: {
        id: "modern",
        name: "Modern",
        description: "Apple tarzı temiz ve minimal tek sütun düzeni",
        emoji: "✨",
        layout: "hero",
        theme: "light",
        colors: {
            background: "#F5F5F7",
            cardBg: "#ffffff",
            text: "#1d1d1f",
            textSecondary: "#86868b",
            border: "#e5e5e5"
        },
        cardStyle: {
            borderRadius: "20px",
            shadow: "0 4px 20px rgba(0,0,0,0.08)",
            imageAspect: "wide",
            imageSize: "large",
            imagePosition: "top",
            padding: "16px"
        },
        typography: {
            nameSize: "18px",
            nameWeight: "600",
            priceSize: "18px",
            priceStyle: "bold",
            descriptionSize: "14px"
        },
        addButton: {
            style: "circle",
            size: "large"
        }
    },
    pill: {
        id: "pill",
        name: "Pill",
        description: "Yatay kapsül kartları, hızlı tarama için ideal",
        emoji: "💊",
        layout: "pill",
        theme: "light",
        colors: {
            background: "#FAFAFA",
            cardBg: "#ffffff",
            text: "#1a1a1a",
            textSecondary: "#666666",
            border: "#eeeeee"
        },
        cardStyle: {
            borderRadius: "24px",
            shadow: "0 1px 8px rgba(0,0,0,0.06)",
            imageAspect: "square",
            imageSize: "thumbnail",
            imagePosition: "left",
            padding: "8px"
        },
        typography: {
            nameSize: "15px",
            nameWeight: "600",
            priceSize: "15px",
            priceStyle: "badge",
            descriptionSize: "12px"
        },
        addButton: {
            style: "pill",
            size: "small"
        }
    },
    minimal: {
        id: "minimal",
        name: "Minimal",
        description: "Görsel olmadan sadece metin, super hızlı yükleme",
        emoji: "📝",
        layout: "list",
        theme: "light",
        colors: {
            background: "#ffffff",
            cardBg: "#ffffff",
            text: "#000000",
            textSecondary: "#555555",
            border: "#f0f0f0"
        },
        cardStyle: {
            borderRadius: "0px",
            shadow: "none",
            imageAspect: "none",
            imageSize: "none",
            imagePosition: "left",
            padding: "16px"
        },
        typography: {
            nameSize: "16px",
            nameWeight: "500",
            priceSize: "16px",
            priceStyle: "subtle",
            descriptionSize: "14px"
        },
        addButton: {
            style: "none",
            size: "small"
        }
    },
    gallery: {
        id: "gallery",
        name: "Gallery",
        description: "Pinterest tarzı görsel ağırlıklı masonry düzeni",
        emoji: "🖼️",
        layout: "masonry",
        theme: "warm",
        colors: {
            background: "#FBF9F7",
            cardBg: "#ffffff",
            text: "#2d2d2d",
            textSecondary: "#7a7a7a",
            border: "#e8e4df"
        },
        cardStyle: {
            borderRadius: "20px",
            shadow: "0 4px 20px rgba(0,0,0,0.08)",
            imageAspect: "tall",
            imageSize: "large",
            imagePosition: "top",
            padding: "12px"
        },
        typography: {
            nameSize: "14px",
            nameWeight: "600",
            priceSize: "15px",
            priceStyle: "bold",
            descriptionSize: "12px"
        },
        addButton: {
            style: "circle",
            size: "medium"
        }
    },
    compact: {
        id: "compact",
        name: "Compact",
        description: "3 sütunlu mini kartlar, çok ürün için ideal",
        emoji: "📦",
        layout: "compact-grid",
        theme: "cool",
        colors: {
            background: "#F0F4F8",
            cardBg: "#ffffff",
            text: "#1e3a5f",
            textSecondary: "#64748b",
            border: "#e2e8f0"
        },
        cardStyle: {
            borderRadius: "12px",
            shadow: "0 1px 4px rgba(0,0,0,0.05)",
            imageAspect: "square",
            imageSize: "small",
            imagePosition: "top",
            padding: "8px"
        },
        typography: {
            nameSize: "12px",
            nameWeight: "600",
            priceSize: "13px",
            priceStyle: "bold",
            descriptionSize: "10px"
        },
        addButton: {
            style: "square",
            size: "small"
        }
    },
    "photo-right": {
        id: "photo-right",
        name: "Fotoğraflı Liste",
        description: "Görsel sağda, bilgiler solda - restoran klasiği",
        emoji: "📷",
        layout: "photo-list",
        theme: "dark",
        colors: {
            background: "#1a1a1a",
            cardBg: "#242424",
            text: "#ffffff",
            textSecondary: "#a0a0a0",
            border: "#333333"
        },
        cardStyle: {
            borderRadius: "16px",
            shadow: "0 2px 8px rgba(0,0,0,0.3)",
            imageAspect: "square",
            imageSize: "medium",
            imagePosition: "right",
            padding: "16px"
        },
        typography: {
            nameSize: "16px",
            nameWeight: "600",
            priceSize: "18px",
            priceStyle: "bold",
            descriptionSize: "13px"
        },
        addButton: {
            style: "none",
            size: "small"
        }
    },
    "category-grid": {
        id: "category-grid",
        name: "Kategori Kartları",
        description: "Büyük kategori görselleri ile kolay navigasyon",
        emoji: "🗂️",
        layout: "category-cards",
        theme: "dark",
        colors: {
            background: "#0f0f0f",
            cardBg: "#1a1a1a",
            text: "#ffffff",
            textSecondary: "#888888",
            border: "#2a2a2a"
        },
        cardStyle: {
            borderRadius: "20px",
            shadow: "0 4px 16px rgba(0,0,0,0.4)",
            imageAspect: "wide",
            imageSize: "large",
            imagePosition: "background",
            padding: "0px"
        },
        typography: {
            nameSize: "14px",
            nameWeight: "700",
            priceSize: "12px",
            priceStyle: "subtle",
            descriptionSize: "11px"
        },
        addButton: {
            style: "none",
            size: "small"
        }
    }
};

// Style array for UI iteration
export const MENU_STYLES_ARRAY = Object.values(MENU_STYLES);

export const COLOR_OPTIONS = [
    // Premium Jewel Tones
    { id: "emerald", name: "Zümrüt", value: "#059669", textOnColor: "#fff" },
    { id: "sapphire", name: "Safir", value: "#2563EB", textOnColor: "#fff" },
    { id: "amethyst", name: "Ametist", value: "#7C3AED", textOnColor: "#fff" },
    { id: "ruby", name: "Yakut", value: "#DC2626", textOnColor: "#fff" },
    { id: "gold", name: "Altın", value: "#CA8A04", textOnColor: "#fff" },
    { id: "bronze", name: "Bronz", value: "#B45309", textOnColor: "#fff" },
    // Elegant Neutrals
    { id: "obsidian", name: "Obsidyen", value: "#18181B", textOnColor: "#fff" },
    { id: "graphite", name: "Grafit", value: "#3F3F46", textOnColor: "#fff" },
    { id: "champagne", name: "Şampanya", value: "#D4AF37", textOnColor: "#000" },
    // Modern Vibrants
    { id: "coral", name: "Mercan", value: "#F43F5E", textOnColor: "#fff" },
    { id: "ocean", name: "Okyanus", value: "#0891B2", textOnColor: "#fff" },
    { id: "mint", name: "Nane", value: "#14B8A6", textOnColor: "#fff" },
] as const;

export type ColorId = typeof COLOR_OPTIONS[number]["id"];

export interface MenuSettings {
    styleId: MenuStyleId;
    accentColorId: ColorId;
    showAvatar: boolean;
    waiterCallEnabled: boolean;
    cartEnabled: boolean;
    whatsappOrderEnabled: boolean;
    wifiPassword?: string;
}

export const DEFAULT_MENU_SETTINGS: MenuSettings = {
    styleId: "modern",
    accentColorId: "emerald",
    showAvatar: true,
    waiterCallEnabled: true,
    cartEnabled: true,
    whatsappOrderEnabled: true,
    wifiPassword: undefined
};

// Helper to get accent color value
export function getAccentColor(colorId: ColorId | string): { value: string; textOnColor: string } {
    const color = COLOR_OPTIONS.find(c => c.id === colorId);
    return color || COLOR_OPTIONS[0];
}

// Legacy color ID mapping for backward compatibility
const LEGACY_COLOR_MAP: Record<string, ColorId> = {
    // Old IDs -> New IDs
    "blue": "sapphire",
    "purple": "amethyst",
    "pink": "coral",
    "red": "ruby",
    "orange": "bronze",
    "amber": "champagne",
    "teal": "mint",
    "indigo": "amethyst",
    "slate": "graphite",
    "rose": "coral",
    "cyan": "ocean",
    // New IDs map to themselves
    "emerald": "emerald",
    "sapphire": "sapphire",
    "amethyst": "amethyst",
    "ruby": "ruby",
    "gold": "gold",
    "bronze": "bronze",
    "obsidian": "obsidian",
    "graphite": "graphite",
    "champagne": "champagne",
    "coral": "coral",
    "ocean": "ocean",
    "mint": "mint",
};

// Helper to normalize color ID (handles legacy IDs)
export function normalizeColorId(colorId: string): ColorId {
    return LEGACY_COLOR_MAP[colorId] || "emerald";
}

// Legacy style ID mapping for backward compatibility
const LEGACY_STYLE_MAP: Record<string, MenuStyleId> = {
    "elite": "premium",
    "fastfood": "pill",
    "cafe": "gallery",
    "classic": "minimal",
    // New IDs map to themselves
    "premium": "premium",
    "modern": "modern",
    "pill": "pill",
    "minimal": "minimal",
    "gallery": "gallery",
    "compact": "compact",
    "photo-right": "photo-right",
    "category-grid": "category-grid"
};

// Helper to normalize style ID (handles legacy IDs)
export function normalizeStyleId(styleId: string): MenuStyleId {
    return LEGACY_STYLE_MAP[styleId] || "modern";
}

// Helper to get style config (handles legacy IDs)
export function getStyleConfig(styleId: string): MenuStyleConfig {
    const normalizedId = normalizeStyleId(styleId);
    return MENU_STYLES[normalizedId] || MENU_STYLES.modern;
}

