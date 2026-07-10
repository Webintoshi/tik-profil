export type PanelModuleId =
    | "core"
    | "food"
    | "fastfood"
    | "hotel"
    | "beauty"
    | "clinic"
    | "ecommerce"
    | "emlak"
    | "vehicle-rental";

export type PanelRouteNoticeReason = "not-enabled" | "frozen" | "limited";

export interface PanelNavItem {
    id: string;
    label: string;
    href: string;
    icon: string;
    highlight?: boolean;
}

export interface PanelNavGroup {
    id: PanelModuleId;
    label: string;
    icon: string;
    status: "core" | "active" | "limited";
    items: PanelNavItem[];
}

interface PanelModuleConfig {
    id: Exclude<PanelModuleId, "core">;
    label: string;
    icon: string;
    routePrefix: string;
    entitlementAliases: string[];
    navVisibility: "visible-when-entitled" | "hidden";
    status: "active" | "limited" | "frozen";
    navItems: PanelNavItem[];
    safeRoutePrefixes?: string[];
    blockedRoutePrefixes?: string[];
    notEnabledTitle: string;
    notEnabledDescription: string;
    frozenTitle: string;
    frozenDescription: string;
    limitedTitle?: string;
    limitedDescription?: string;
    primaryHref?: string;
    primaryLabel?: string;
    permissionModuleIds: string[];
}

export type PanelRouteAccess =
    | {
        kind: "allowed";
        moduleId: PanelModuleId;
    }
    | {
        kind: "notice";
        moduleId: PanelModuleId;
        reason: PanelRouteNoticeReason;
        title: string;
        description: string;
        primaryHref?: string;
        primaryLabel?: string;
    };

export type PanelModuleAccess =
    | {
        kind: "allowed";
        moduleId: Exclude<PanelModuleId, "core">;
    }
    | {
        kind: "notice";
        moduleId: Exclude<PanelModuleId, "core">;
        reason: "not-enabled" | "frozen";
        title: string;
        description: string;
        primaryHref?: string;
        primaryLabel?: string;
    };

const CORE_NAV_ITEMS: PanelNavItem[] = [
    {
        id: "profile",
        label: "Isletme Profili",
        href: "/panel/profile",
        icon: "Building2",
    },
    {
        id: "qr",
        label: "QR Kod Yonetimi",
        href: "/panel/qr",
        icon: "QrCode",
        highlight: true,
    },
    {
        id: "staff",
        label: "Ekip Yonetimi",
        href: "/panel/staff",
        icon: "Users",
    },
];

const PANEL_MODULE_CONFIGS: PanelModuleConfig[] = [
    {
        id: "food",
        label: "Restoran Yonetimi",
        icon: "UtensilsCrossed",
        routePrefix: "/panel/food",
        entitlementAliases: ["restaurant", "cafe", "bar"],
        navVisibility: "visible-when-entitled",
        status: "limited",
        navItems: [
            {
                id: "food-tables",
                label: "Masa Duzeni",
                href: "/panel/food/tables",
                icon: "LayoutGrid",
            },
            {
                id: "food-menu",
                label: "Menu Yonetimi",
                href: "/panel/food/menu",
                icon: "ClipboardList",
            },
            {
                id: "food-settings",
                label: "Menu Stili",
                href: "/panel/food/settings",
                icon: "Palette",
            },
        ],
        safeRoutePrefixes: [
            "/panel/food/menu",
            "/panel/food/tables",
            "/panel/food/settings",
        ],
        notEnabledTitle: "Restoran modulu etkin degil",
        notEnabledDescription: "Bu isletme icin restoran paneli acik degil.",
        frozenTitle: "Restoran modulu su anda kapali",
        frozenDescription: "Bu restoran akislarini bu isletme icin daha sonra acacagiz.",
        limitedTitle: "Restoran modulu sinirli modda acik",
        limitedDescription: "Ilk MVP icin sadece guvenli restoran ekranlarini aciyoruz. Analytics ve benzeri yari-hazir yuzeyleri gostermiyoruz.",
        primaryHref: "/panel/food/menu",
        primaryLabel: "Menu yonetimine git",
        permissionModuleIds: ["restaurant"],
    },
    {
        id: "fastfood",
        label: "Fast Food",
        icon: "Utensils",
        routePrefix: "/panel/fastfood",
        entitlementAliases: ["fastfood", "fast-food"],
        navVisibility: "visible-when-entitled",
        status: "active",
        navItems: [
            {
                id: "ff-tables",
                label: "Masa Duzeni",
                href: "/panel/fastfood/tables",
                icon: "LayoutGrid",
            },
            {
                id: "ff-categories",
                label: "Kategoriler",
                href: "/panel/fastfood/categories",
                icon: "LayoutGrid",
            },
            {
                id: "ff-products",
                label: "Urunler",
                href: "/panel/fastfood/products",
                icon: "ClipboardList",
            },
            {
                id: "ff-extras",
                label: "Ekstralar",
                href: "/panel/fastfood/extras",
                icon: "Plus",
            },
            {
                id: "ff-orders",
                label: "Siparisler",
                href: "/panel/fastfood/orders",
                icon: "ShoppingCart",
            },
            {
                id: "ff-coupons",
                label: "Kuponlar",
                href: "/panel/fastfood/coupons",
                icon: "Ticket",
            },
            {
                id: "ff-settings",
                label: "Ayarlar",
                href: "/panel/fastfood/settings",
                icon: "Settings",
            },
        ],
        blockedRoutePrefixes: [
            "/panel/fastfood/analytics",
            "/panel/fastfood/campaigns",
        ],
        notEnabledTitle: "Fast food modulu etkin degil",
        notEnabledDescription: "Bu isletme icin fast food paneli acik degil.",
        frozenTitle: "Fast food modulu su anda kapali",
        frozenDescription: "Bu fast food akislarini bu isletme icin daha sonra acacagiz.",
        limitedTitle: "Bu ekran ilk MVP disinda",
        limitedDescription: "Fast food panelinde sadece guvenli ve uretime uygun ekranlari acik tutuyoruz.",
        primaryHref: "/panel/fastfood/orders",
        primaryLabel: "Siparislere git",
        permissionModuleIds: ["restaurant"],
    },
    {
        id: "hotel",
        label: "Otel Yonetimi",
        icon: "Hotel",
        routePrefix: "/panel/hotel",
        entitlementAliases: ["hotel", "boutique", "hostel", "aparthotel"],
        navVisibility: "hidden",
        status: "frozen",
        navItems: [],
        notEnabledTitle: "Otel modulu etkin degil",
        notEnabledDescription: "Bu isletme icin otel paneli acik degil.",
        frozenTitle: "Otel modulu ilk MVP kapsaminda degil",
        frozenDescription: "Otel akislarini parcali ve kirilgan halde gostermek yerine bu modulu simdilik guvenli bir duyuru durumunda tutuyoruz.",
        primaryHref: "/panel/profile",
        primaryLabel: "Isletme profiline don",
        permissionModuleIds: [],
    },
    {
        id: "beauty",
        label: "Guzellik Merkezi",
        icon: "Scissors",
        routePrefix: "/panel/beauty",
        entitlementAliases: ["beauty", "salon", "guzellik", "kuafor", "spa", "barber"],
        navVisibility: "hidden",
        status: "frozen",
        navItems: [],
        notEnabledTitle: "Guzellik modulu etkin degil",
        notEnabledDescription: "Bu isletme icin guzellik paneli acik degil.",
        frozenTitle: "Guzellik modulu ilk MVP kapsaminda degil",
        frozenDescription: "Bu dikeyin yari hazir ekranlarini tanitmak yerine modulu simdilik gizliyoruz.",
        primaryHref: "/panel/profile",
        primaryLabel: "Isletme profiline don",
        permissionModuleIds: [],
    },
    {
        id: "clinic",
        label: "Klinik Yonetimi",
        icon: "Stethoscope",
        routePrefix: "/panel/clinic",
        entitlementAliases: [
            "clinic",
            "hospital",
            "dentist",
            "veteriner",
            "pharmacy",
            "optik",
            "physiotherapy",
            "psychology",
            "nutrition",
            "laboratory",
        ],
        navVisibility: "hidden",
        status: "frozen",
        navItems: [],
        notEnabledTitle: "Klinik modulu etkin degil",
        notEnabledDescription: "Bu isletme icin klinik paneli acik degil.",
        frozenTitle: "Klinik modulu ilk MVP kapsaminda degil",
        frozenDescription: "Klinik akislarini guvenilir hale getirmeden bu yuzeyleri acmiyoruz.",
        primaryHref: "/panel/profile",
        primaryLabel: "Isletme profiline don",
        permissionModuleIds: [],
    },
    {
        id: "ecommerce",
        label: "E-ticaret",
        icon: "ShoppingBag",
        routePrefix: "/panel/ecommerce",
        entitlementAliases: ["ecommerce", "e-commerce", "magaza", "shop", "store"],
        navVisibility: "hidden",
        status: "frozen",
        navItems: [],
        notEnabledTitle: "E-ticaret modulu etkin degil",
        notEnabledDescription: "Bu isletme icin e-ticaret paneli acik degil.",
        frozenTitle: "E-ticaret modulu ilk MVP kapsaminda degil",
        frozenDescription: "Bu modulu yari bitmis dashboardlarla gostermek yerine simdilik guvenli bir bekleme durumuna aliyoruz.",
        primaryHref: "/panel/profile",
        primaryLabel: "Isletme profiline don",
        permissionModuleIds: [],
    },
    {
        id: "emlak",
        label: "Emlak",
        icon: "Home",
        routePrefix: "/panel/emlak",
        entitlementAliases: ["emlak", "realestate", "real-estate", "gayrimenkul"],
        navVisibility: "hidden",
        status: "frozen",
        navItems: [],
        notEnabledTitle: "Emlak modulu etkin degil",
        notEnabledDescription: "Bu isletme icin emlak paneli acik degil.",
        frozenTitle: "Emlak modulu ilk MVP kapsaminda degil",
        frozenDescription: "Emlak akislarini guvenilir hale getirmeden bu modulu aktif panel yuzeyi olarak gostermiyoruz.",
        primaryHref: "/panel/profile",
        primaryLabel: "Isletme profiline don",
        permissionModuleIds: [],
    },
    {
        id: "vehicle-rental",
        label: "Arac Kiralama",
        icon: "Car",
        routePrefix: "/panel/vehicle-rental",
        entitlementAliases: ["vehicle-rental", "rental", "rentacar", "arac-kiralama", "oto-kiralama", "rent-a-car"],
        navVisibility: "visible-when-entitled",
        status: "active",
        navItems: [
            {
                id: "vehicle-dashboard",
                label: "Dashboard",
                href: "/panel/vehicle-rental",
                icon: "BarChart3",
            },
            {
                id: "vehicle-list",
                label: "Araclarim",
                href: "/panel/vehicle-rental/vehicles",
                icon: "Car",
            },
            {
                id: "vehicle-reservations",
                label: "Rezervasyonlar",
                href: "/panel/vehicle-rental/reservations",
                icon: "Calendar",
            },
            {
                id: "vehicle-calendar",
                label: "Takvim",
                href: "/panel/vehicle-rental/calendar",
                icon: "Calendar",
            },
            {
                id: "vehicle-categories",
                label: "Kategoriler",
                href: "/panel/vehicle-rental/categories",
                icon: "LayoutGrid",
            },
        ],
        notEnabledTitle: "Arac kiralama modulu etkin degil",
        notEnabledDescription: "Bu isletme icin arac kiralama paneli acik degil.",
        frozenTitle: "Arac kiralama modulu su anda kapali",
        frozenDescription: "Bu modulu bu isletme icin daha sonra acacagiz.",
        primaryHref: "/panel/vehicle-rental",
        primaryLabel: "Arac kiralama paneline git",
        permissionModuleIds: ["vehicle-rental"],
    },
];

function matchesRoutePrefix(pathname: string, prefixes: string[] | undefined): boolean {
    if (!prefixes?.length) {
        return false;
    }

    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function findModuleConfigByRoute(pathname: string): PanelModuleConfig | null {
    return (
        PANEL_MODULE_CONFIGS.find(
            (config) =>
                pathname === config.routePrefix || pathname.startsWith(`${config.routePrefix}/`),
        ) ?? null
    );
}

function getModuleConfig(moduleId: Exclude<PanelModuleId, "core">): PanelModuleConfig {
    const config = PANEL_MODULE_CONFIGS.find((candidate) => candidate.id === moduleId);

    if (!config) {
        throw new Error(`Unknown panel module config: ${moduleId}`);
    }

    return config;
}

export function normalizeEnabledModules(enabledModules: string[]): string[] {
    return [...new Set(
        enabledModules
            .map((moduleId) => moduleId.trim().toLowerCase())
            .filter(Boolean),
    )];
}

export function hasPanelModuleEntitlement(
    moduleId: Exclude<PanelModuleId, "core">,
    enabledModules: string[],
): boolean {
    const normalizedModules = normalizeEnabledModules(enabledModules);
    const config = getModuleConfig(moduleId);

    return config.entitlementAliases.some((alias) => normalizedModules.includes(alias));
}

export function getVisiblePanelNavGroups({
    enabledModules,
}: {
    enabledModules: string[];
}): PanelNavGroup[] {
    const groups: PanelNavGroup[] = [
        {
            id: "core",
            label: "Temel",
            icon: "Building2",
            status: "core",
            items: CORE_NAV_ITEMS,
        },
    ];

    for (const config of PANEL_MODULE_CONFIGS) {
        if (config.navVisibility !== "visible-when-entitled") {
            continue;
        }

        if (!hasPanelModuleEntitlement(config.id, enabledModules)) {
            continue;
        }

        groups.push({
            id: config.id,
            label: config.label,
            icon: config.icon,
            status: config.status === "limited" ? "limited" : "active",
            items: config.navItems,
        });
    }

    return groups;
}

export function getVisiblePermissionModuleIds(enabledModules: string[]): string[] {
    const visibleIds = new Set<string>(["general"]);

    for (const config of PANEL_MODULE_CONFIGS) {
        if (config.navVisibility !== "visible-when-entitled") {
            continue;
        }

        if (!hasPanelModuleEntitlement(config.id, enabledModules)) {
            continue;
        }

        for (const permissionModuleId of config.permissionModuleIds) {
            visibleIds.add(permissionModuleId);
        }
    }

    return [...visibleIds];
}

export function getPanelModuleAccess(
    moduleId: Exclude<PanelModuleId, "core">,
    { enabledModules }: { enabledModules: string[] },
): PanelModuleAccess {
    const config = getModuleConfig(moduleId);

    if (!hasPanelModuleEntitlement(moduleId, enabledModules)) {
        return {
            kind: "notice",
            moduleId,
            reason: "not-enabled",
            title: config.notEnabledTitle,
            description: config.notEnabledDescription,
            primaryHref: "/panel/profile",
            primaryLabel: "Isletme profiline don",
        };
    }

    if (config.status === "frozen") {
        return {
            kind: "notice",
            moduleId,
            reason: "frozen",
            title: config.frozenTitle,
            description: config.frozenDescription,
            primaryHref: config.primaryHref,
            primaryLabel: config.primaryLabel,
        };
    }

    return {
        kind: "allowed",
        moduleId,
    };
}

export function getPanelRouteAccess(
    pathname: string,
    { enabledModules }: { enabledModules: string[] },
): PanelRouteAccess {
    if (
        pathname === "/panel" ||
        pathname === "/panel/profile" ||
        pathname.startsWith("/panel/profile/") ||
        pathname === "/panel/qr" ||
        pathname.startsWith("/panel/qr/") ||
        pathname === "/panel/staff" ||
        pathname.startsWith("/panel/staff/")
    ) {
        return {
            kind: "allowed",
            moduleId: "core",
        };
    }

    const config = findModuleConfigByRoute(pathname);

    if (!config) {
        return {
            kind: "allowed",
            moduleId: "core",
        };
    }

    const moduleAccess = getPanelModuleAccess(config.id, { enabledModules });

    if (moduleAccess.kind === "notice") {
        return {
            kind: "notice",
            moduleId: config.id,
            reason: moduleAccess.reason,
            title: moduleAccess.title,
            description: moduleAccess.description,
            primaryHref: moduleAccess.primaryHref,
            primaryLabel: moduleAccess.primaryLabel,
        };
    }

    if (matchesRoutePrefix(pathname, config.blockedRoutePrefixes)) {
        return {
            kind: "notice",
            moduleId: config.id,
            reason: "limited",
            title: config.limitedTitle ?? config.frozenTitle,
            description: config.limitedDescription ?? config.frozenDescription,
            primaryHref: config.primaryHref,
            primaryLabel: config.primaryLabel,
        };
    }

    if (
        config.status === "limited" &&
        !matchesRoutePrefix(pathname, config.safeRoutePrefixes)
    ) {
        return {
            kind: "notice",
            moduleId: config.id,
            reason: "limited",
            title: config.limitedTitle ?? config.frozenTitle,
            description: config.limitedDescription ?? config.frozenDescription,
            primaryHref: config.primaryHref,
            primaryLabel: config.primaryLabel,
        };
    }

    return {
        kind: "allowed",
        moduleId: config.id,
    };
}
