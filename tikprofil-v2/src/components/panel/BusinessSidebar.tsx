"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Building2,
    ShoppingBag,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    ShoppingCart,
    QrCode,
    UtensilsCrossed,
    LayoutGrid,
    ClipboardList,
    BarChart3,
    Palette,
    Users,
    BedDouble,
    Bell,
    Hotel,
    Utensils,
    Plus,
    Settings,
    Home,
    Scissors,
    Ticket,
    PartyPopper,
    Calendar,
    User,
    Stethoscope,
    FileText,
    CreditCard,
    Car,
} from "lucide-react";
import clsx from "clsx";
import { useTheme } from "./ThemeProvider";

// Base navigation items for all business owners
const BASE_NAV_ITEMS = [
    {
        id: "profile",
        label: "İşletme Profili",
        href: "/panel/profile",
        icon: Building2,
    },
    {
        id: "qr",
        label: "QR Kod Yönetimi",
        href: "/panel/qr",
        icon: QrCode,
        highlight: true,
    },
    {
        id: "staff",
        label: "Ekip Yönetimi",
        href: "/panel/staff",
        icon: Users,
    },
];

// Restaurant module menu items (only shown if module enabled)
const RESTAURANT_NAV_ITEMS = [
    {
        id: "food-tables",
        label: "Masa Düzeni",
        href: "/panel/food/tables",
        icon: LayoutGrid,
    },
    {
        id: "food-menu",
        label: "Menü Yönetimi",
        href: "/panel/food/menu",
        icon: ClipboardList,
    },
    {
        id: "food-settings",
        label: "Menü Stili",
        href: "/panel/food/settings",
        icon: Palette,
    },
    {
        id: "food-events",
        label: "Etkinlikler",
        href: "/panel/food/events",
        icon: PartyPopper,
    },
    {
        id: "food-analytics",
        label: "Masa Analizi",
        href: "/panel/food/analytics",
        icon: BarChart3,
    },
];

// Store item (coming soon)
const STORE_NAV_ITEM = {
    id: "store",
    label: "Tık Mağaza",
    href: "/panel/store",
    icon: ShoppingBag,
    soon: true,
};

// Fast Food module menu items (isolated module)
const FASTFOOD_NAV_ITEMS = [
    {
        id: "ff-tables",
        label: "Masa Düzeni",
        href: "/panel/fastfood/tables",
        icon: LayoutGrid,
    },
    {
        id: "ff-categories",
        label: "Kategoriler",
        href: "/panel/fastfood/categories",
        icon: LayoutGrid,
    },
    {
        id: "ff-products",
        label: "Ürünler",
        href: "/panel/fastfood/products",
        icon: ClipboardList,
    },
    {
        id: "ff-extras",
        label: "Ekstralar",
        href: "/panel/fastfood/extras",
        icon: Plus,
    },
    {
        id: "ff-orders",
        label: "Siparişler",
        href: "/panel/fastfood/orders",
        icon: ShoppingCart,
    },
    {
        id: "ff-coupons",
        label: "Kuponlar",
        href: "/panel/fastfood/coupons",
        icon: Ticket,
    },
    {
        id: "ff-analytics",
        label: "Analizler",
        href: "/panel/fastfood/analytics",
        icon: BarChart3,
    },
    {
        id: "ff-settings",
        label: "Ayarlar",
        href: "/panel/fastfood/settings",
        icon: Settings,
    },
];

// Hotel module menu items (only shown if hotel module enabled)
const HOTEL_NAV_ITEMS = [
    {
        id: "hotel-room-types",
        label: "Oda Türleri",
        href: "/panel/hotel/room-types",
        icon: BedDouble,
    },
    {
        id: "hotel-rooms",
        label: "Oda Yönetimi",
        href: "/panel/hotel/rooms",
        icon: LayoutGrid,
    },
    {
        id: "hotel-requests",
        label: "Oda Talepleri",
        href: "/panel/hotel/requests",
        icon: Bell,
    },
    {
        id: "hotel-orders",
        label: "Oda Servisi",
        href: "/panel/hotel/orders",
        icon: UtensilsCrossed,
    },
    {
        id: "hotel-analytics",
        label: "Otel Analizi",
        href: "/panel/hotel/analytics",
        icon: BarChart3,
    },
];

// Emlak module menu items (Real Estate)
const EMLAK_NAV_ITEMS = [
    {
        id: "emlak-dashboard",
        label: "Emlak Dashboard",
        href: "/panel/emlak",
        icon: Home,
    },
    {
        id: "emlak-listings",
        label: "İlanlar",
        href: "/panel/emlak/listings",
        icon: ClipboardList,
    },
    {
        id: "emlak-consultants",
        label: "Danışmanlar",
        href: "/panel/emlak/consultants",
        icon: Users,
    },
    {
        id: "emlak-analytics",
        label: "Analizler",
        href: "/panel/emlak/analytics",
        icon: BarChart3,
    },
];

// Beauty module menu items (Güzellik Merkezi)
const BEAUTY_NAV_ITEMS = [
    {
        id: "beauty-dashboard",
        label: "Güzellik Dashboard",
        href: "/panel/beauty",
        icon: Scissors,
    },
    {
        id: "beauty-appointments",
        label: "Randevular",
        href: "/panel/beauty/appointments",
        icon: Calendar,
    },
    {
        id: "beauty-categories",
        label: "Kategoriler",
        href: "/panel/beauty/categories",
        icon: LayoutGrid,
    },
    {
        id: "beauty-services",
        label: "Hizmetler",
        href: "/panel/beauty/services",
        icon: ClipboardList,
    },
    {
        id: "beauty-staff",
        label: "Personel",
        href: "/panel/beauty/staff",
        icon: Users,
    },
    {
        id: "beauty-customers",
        label: "Müşteriler",
        href: "/panel/beauty/customers",
        icon: User,
    },
    {
        id: "beauty-analytics",
        label: "Analizler",
        href: "/panel/beauty/analytics",
        icon: BarChart3,
    },
    {
        id: "beauty-settings",
        label: "Ayarlar",
        href: "/panel/beauty/settings",
        icon: Settings,
    },
];

// E-commerce module menu items (Online Mağaza)
const ECOMMERCE_NAV_ITEMS = [
    {
        id: "ecommerce-dashboard",
        label: "Mağaza Dashboard",
        href: "/panel/ecommerce",
        icon: ShoppingBag,
    },
    {
        id: "ecommerce-categories",
        label: "Kategoriler",
        href: "/panel/ecommerce/categories",
        icon: LayoutGrid,
    },
    {
        id: "ecommerce-products",
        label: "Ürünler",
        href: "/panel/ecommerce/products",
        icon: ClipboardList,
    },
    {
        id: "ecommerce-orders",
        label: "Siparişler",
        href: "/panel/ecommerce/orders",
        icon: ShoppingCart,
    },
    {
        id: "ecommerce-customers",
        label: "Müşteriler",
        href: "/panel/ecommerce/customers",
        icon: User,
    },
    {
        id: "ecommerce-coupons",
        label: "Kuponlar",
        href: "/panel/ecommerce/coupons",
        icon: Ticket,
    },
    {
        id: "ecommerce-analytics",
        label: "Analizler",
        href: "/panel/ecommerce/analytics",
        icon: BarChart3,
    },
    {
        id: "ecommerce-settings",
        label: "Ayarlar",
        href: "/panel/ecommerce/settings",
        icon: Settings,
    },
];

// Clinic module menu items (Klinik)
const CLINIC_NAV_ITEMS = [
    {
        id: "clinic-dashboard",
        label: "Klinik Dashboard",
        href: "/panel/clinic",
        icon: Stethoscope,
    },
    {
        id: "clinic-appointments",
        label: "Randevular",
        href: "/panel/clinic/appointments",
        icon: Calendar,
    },
    {
        id: "clinic-patients",
        label: "Hasta Kayıtları",
        href: "/panel/clinic/patients",
        icon: User,
    },
    {
        id: "clinic-categories",
        label: "Kategoriler",
        href: "/panel/clinic/categories",
        icon: LayoutGrid,
    },
    {
        id: "clinic-services",
        label: "Hizmetler",
        href: "/panel/clinic/services",
        icon: ClipboardList,
    },
    {
        id: "clinic-staff",
        label: "Personel",
        href: "/panel/clinic/staff",
        icon: Users,
    },
    {
        id: "clinic-billing",
        label: "Fatura & Ödeme",
        href: "/panel/clinic/billing",
        icon: CreditCard,
    },
    {
        id: "clinic-analytics",
        label: "Analizler",
        href: "/panel/clinic/analytics",
        icon: BarChart3,
    },
    {
        id: "clinic-settings",
        label: "Ayarlar",
        href: "/panel/clinic/settings",
        icon: Settings,
    },
];

// Vehicle Rental module menu items (Araç Kiralama)
const VEHICLE_RENTAL_NAV_ITEMS = [
    {
        id: "vehicle-dashboard",
        label: "Dashboard",
        href: "/panel/vehicle-rental",
        icon: BarChart3,
    },
    {
        id: "vehicle-list",
        label: "Araçlarım",
        href: "/panel/vehicle-rental/vehicles",
        icon: Car,
    },
    {
        id: "vehicle-reservations",
        label: "Rezervasyonlar",
        href: "/panel/vehicle-rental/reservations",
        icon: Calendar,
    },
    {
        id: "vehicle-calendar",
        label: "Takvim",
        href: "/panel/vehicle-rental/calendar",
        icon: Calendar,
    },
    {
        id: "vehicle-categories",
        label: "Kategoriler",
        href: "/panel/vehicle-rental/categories",
        icon: LayoutGrid,
    },
];

interface BusinessSidebarProps {
    businessName?: string;
    businessLogo?: string;
    enabledModules?: string[]; // Module IDs enabled for this business
    userRole?: "owner" | "manager" | "staff";
    userPermissions?: string[];
}

// Permission to route mapping for filtering
const PERMISSION_ROUTES: Record<string, string> = {
    "general.profile": "/panel/profile",
    "general.qr_codes": "/panel/qr",
    "general.staff": "/panel/staff",
    "restaurant.menu": "/panel/food/menu",
    "restaurant.tables": "/panel/food/tables",
    "restaurant.orders": "/panel/food/orders",
    "general.analytics": "/panel/food/analytics",
    "general.settings": "/panel/food/settings",
    "hotel.rooms": "/panel/hotel/rooms",
    "hotel.room-types": "/panel/hotel/room-types",
    "hotel.requests": "/panel/hotel/requests",
    "hotel.analytics": "/panel/hotel/analytics",
    "clinic.appointments": "/panel/clinic/appointments",
    "clinic.patients": "/panel/clinic/patients",
    "clinic.services": "/panel/clinic/services",
    "clinic.staff": "/panel/clinic/staff",
    "clinic.billing": "/panel/clinic/billing",
    "clinic.analytics": "/panel/clinic/analytics",
    "clinic.settings": "/panel/clinic/settings",
};

export function BusinessSidebar({
    businessName = "İşletmem",
    businessLogo,
    enabledModules = [],
    userRole = "owner",
    userPermissions = []
}: BusinessSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(["hotel", "restaurant", "clinic"]);
    const { isDark } = useTheme();

    // Check if restaurant module is enabled
    const hasRestaurantModule = enabledModules.includes("restaurant") ||
        enabledModules.includes("cafe") ||
        enabledModules.includes("bar");

    // Check if fastfood module is enabled (isolated)
    const hasFastfoodModule = enabledModules.includes("fastfood") ||
        enabledModules.includes("restaurant") ||
        enabledModules.includes("cafe");

    // Check if hotel module is enabled
    const hasHotelModule = enabledModules.includes("hotel") ||
        enabledModules.includes("boutique") ||
        enabledModules.includes("hostel") ||
        enabledModules.includes("aparthotel");

    // Check for Emlak (Real Estate) module
    const hasEmlakModule = enabledModules.includes("emlak") ||
        enabledModules.includes("realestate") ||
        enabledModules.includes("real-estate") ||
        enabledModules.includes("gayrimenkul");

    // Check if beauty module is enabled
    const hasBeautyModule = enabledModules.includes("beauty") ||
        enabledModules.includes("salon") ||
        enabledModules.includes("guzellik") ||
        enabledModules.includes("kuafor") ||
        enabledModules.includes("spa") ||
        enabledModules.includes("barber");

    // Check if e-commerce module is enabled
    const hasEcommerceModule = enabledModules.includes("ecommerce") ||
        enabledModules.includes("e-commerce") ||
        enabledModules.includes("magaza") ||
        enabledModules.includes("shop") ||
        enabledModules.includes("store");

    // Check if clinic module is enabled
    const hasClinicModule = enabledModules.includes("clinic") ||
        enabledModules.includes("hospital") ||
        enabledModules.includes("dentist") ||
        enabledModules.includes("veteriner") ||
        enabledModules.includes("pharmacy") ||
        enabledModules.includes("optik") ||
        enabledModules.includes("physiotherapy") ||
        enabledModules.includes("psychology") ||
        enabledModules.includes("nutrition") ||
        enabledModules.includes("laboratory");

    // Check if vehicle rental module is enabled
    const hasVehicleRentalModule = enabledModules.includes("vehicle-rental") ||
        enabledModules.includes("rentacar") ||
        enabledModules.includes("arac-kiralama") ||
        enabledModules.includes("oto-kiralama") ||
        enabledModules.includes("rent-a-car");

    // Permission check helper
    const canAccessRoute = (href: string): boolean => {
        // Owner has access to everything
        if (userRole === "owner") return true;

        // Find permission for this route
        const permission = Object.entries(PERMISSION_ROUTES).find(([, route]) => route === href);
        if (!permission) return true; // If no permission defined, allow access

        return userPermissions.includes(permission[0]);
    };

    // Filter nav items based on permissions
    const filteredBaseNavItems = BASE_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredRestaurantNavItems = RESTAURANT_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredFastfoodNavItems = FASTFOOD_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredHotelNavItems = HOTEL_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredEmlakNavItems = EMLAK_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredBeautyNavItems = BEAUTY_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredEcommerceNavItems = ECOMMERCE_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredClinicNavItems = CLINIC_NAV_ITEMS.filter(item => canAccessRoute(item.href));
    const filteredVehicleRentalNavItems = VEHICLE_RENTAL_NAV_ITEMS.filter(item => canAccessRoute(item.href));

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/giris-yap");
        } catch (error) {
            console.error("Logout error:", error);
            setIsLoggingOut(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    // Theme colors
    const sidebarBg = isDark ? "bg-[#0a0a0a] border-[#1a1a1a]" : "bg-white border-gray-100";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-500" : "text-gray-500";
    const textMuted = isDark ? "text-gray-600" : "text-gray-400";
    const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";
    const activeBg = "bg-emerald-500";
    const activeText = "text-white";
    const accentColor = "text-emerald-500";

    const NavItem = ({ item, isNested = false }: { item: typeof BASE_NAV_ITEMS[0] & { soon?: boolean }, isNested?: boolean }) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
            <Link
                href={item.soon ? "#" : item.href}
                onClick={(e) => {
                    if (item.soon) e.preventDefault();
                    else setIsMobileOpen(false);
                }}
                className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap overflow-hidden",
                    isNested && "ml-3",
                    isActive
                        ? clsx(activeBg, activeText)
                        : item.soon
                            ? clsx(textMuted, "cursor-not-allowed")
                            : clsx(textSecondary, hoverBg)
                )}
            >
                <Icon className={clsx(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-white" : textMuted
                )} />
                <span className={clsx("font-medium text-sm truncate flex-1", isNested && "text-sm")}>{item.label}</span>
                {item.soon && (
                    <span className={clsx(
                        "px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0",
                        isDark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
                    )}>
                        YAKINDA
                    </span>
                )}
                {isActive && !item.soon && (
                    <ChevronRight className="h-3 w-3 text-white/70 flex-shrink-0" />
                )}
            </Link>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Header / Brand */}
            <div className={clsx(
                "p-5 border-b transition-colors",
                isDark ? "border-[#1a1a1a]" : "border-gray-100"
            )}>
                <div className="flex items-center gap-3">
                    {businessLogo ? (
                        <img
                            src={businessLogo}
                            alt={businessName}
                            className="h-10 w-10 rounded-xl object-cover"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-emerald-500" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className={clsx("font-semibold truncate", textPrimary)}>
                            {businessName}
                        </p>
                        <p className={clsx("text-xs", accentColor)}>
                            İŞLETME PANELİ
                        </p>
                    </div>
                </div>
            </div>

            {/* Menu Label */}
            <div className="px-5 pt-6 pb-2">
                <span className={clsx("text-xs font-medium uppercase tracking-wider", textMuted)}>
                    MENÜ
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {/* Base Items */}
                {filteredBaseNavItems.map((item) => (
                    <NavItem key={item.id} item={item} />
                ))}

                {/* Restaurant Module Group */}
                {hasRestaurantModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("restaurant")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <UtensilsCrossed className={clsx("h-4 w-4", "text-orange-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                Restoran Yönetimi
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("restaurant") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("restaurant") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredRestaurantNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Hotel Module Group */}
                {hasHotelModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("hotel")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <Hotel className={clsx("h-4 w-4", "text-blue-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                Otel Yönetimi
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("hotel") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("hotel") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredHotelNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Fast Food Module Group */}
                {hasFastfoodModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("fastfood")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <Utensils className={clsx("h-4 w-4", "text-orange-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                Fast Food
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("fastfood") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("fastfood") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredFastfoodNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Emlak (Real Estate) Module Group */}
                {hasEmlakModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("emlak")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <Home className={clsx("h-4 w-4", "text-purple-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                Emlak
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("emlak") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("emlak") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredEmlakNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Beauty Module Group */}
                {hasBeautyModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("beauty")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <Scissors className={clsx("h-4 w-4", "text-pink-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                Güzellik Merkezi
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("beauty") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("beauty") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredBeautyNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* E-commerce Module Group */}
                {hasEcommerceModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("ecommerce")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <ShoppingBag className={clsx("h-4 w-4", "text-cyan-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                E-ticaret
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("ecommerce") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("ecommerce") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredEcommerceNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Clinic Module Group */}
                {hasClinicModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("clinic")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <Stethoscope className={clsx("h-4 w-4", "text-red-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                Klinik Yönetimi
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("clinic") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("clinic") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredClinicNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Vehicle Rental Module Group */}
                {hasVehicleRentalModule && (
                    <div className="pt-3">
                        <button
                            onClick={() => toggleGroup("vehicle-rental")}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                                hoverBg
                            )}
                        >
                            <Car className={clsx("h-4 w-4", "text-cyan-500")} />
                            <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                                Araç Kiralama
                            </span>
                            <ChevronDown className={clsx(
                                "h-4 w-4 transition-transform",
                                textMuted,
                                expandedGroups.includes("vehicle-rental") && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes("vehicle-rental") && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-1 space-y-0.5">
                                        {filteredVehicleRentalNavItems.map((item) => (
                                            <NavItem key={item.id} item={item} isNested />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Store Item */}
                <div className="pt-2">
                    <NavItem item={STORE_NAV_ITEM} />
                </div>
            </nav>

            {/* Bottom Section */}
            <div className={clsx(
                "p-3 space-y-2 border-t",
                isDark ? "border-[#1a1a1a]" : "border-gray-100"
            )}>
                {/* Paket Satın Al */}
                <button className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    isDark
                        ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                )}>
                    <ShoppingCart className="h-5 w-5" />
                    <span className="font-medium">Paket Satın Al</span>
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={clsx(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors disabled:opacity-50",
                        isDark
                            ? "text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                            : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                    )}
                >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">
                        {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
                    </span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header */}
            <div className={clsx(
                "lg:hidden fixed top-0 left-0 right-0 z-40 border-b",
                sidebarBg
            )}>
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className={clsx("font-semibold", textPrimary)}>{businessName}</span>
                    </div>
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className={clsx("p-2 rounded-lg", hoverBg)}
                    >
                        <Menu className={clsx("h-5 w-5", textSecondary)} />
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={clsx(
                                "lg:hidden fixed top-0 right-0 bottom-0 z-50 w-80 shadow-2xl",
                                isDark ? "bg-[#0a0a0a]" : "bg-white"
                            )}
                        >
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className={clsx("absolute top-4 right-4 p-2 rounded-lg", hoverBg)}
                            >
                                <X className={clsx("h-5 w-5", textMuted)} />
                            </button>
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside className={clsx(
                "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r",
                sidebarBg
            )}>
                <SidebarContent />
            </aside>
        </>
    );
}
