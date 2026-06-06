/**
 * Modular Permission System
 * 
 * Structure:
 * - Flat permission IDs: "module.action" (e.g., "restaurant.menu", "general.profile")
 * - Role-based restrictions via minRole
 * - Route mapping for sidebar filtering
 */

import { getVisiblePermissionModuleIds } from "@/lib/panel/moduleEntitlements";

// ============================================
// TYPES
// ============================================

export type StaffRole = "owner" | "manager" | "staff";

export interface PermissionDefinition {
    id: string;                 // Flat ID: "general.profile", "restaurant.menu"
    label: string;              // UI label: "İşletme Profili"
    description?: string;       // Tooltip description
    routes: string[];           // Matching routes: ["/panel/profile"]
    minRole?: StaffRole;        // Minimum role required (owner > manager > staff)
}

export interface PermissionModule {
    id: string;                 // "general", "restaurant", "hotel"
    name: string;               // "Genel", "Restoran"
    icon?: string;              // Icon name for UI
    permissions: PermissionDefinition[];
}

const MODULE_ALIASES: Record<string, string[]> = {
    restaurant: ["restaurant", "cafe", "bar"],
    hotel: ["hotel", "boutique", "hostel", "aparthotel"],
    beauty: ["beauty", "salon", "guzellik", "kuafor", "spa", "barber"],
    "vehicle-rental": ["vehicle-rental", "rentacar", "arac-kiralama", "oto-kiralama", "rent-a-car"],
    clinic: [
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
};

// ============================================
// PERMISSION DEFINITIONS
// ============================================

export const PERMISSION_MODULES: PermissionModule[] = [
    {
        id: "general",
        name: "Genel",
        icon: "Settings",
        permissions: [
            {
                id: "general.profile",
                label: "İşletme Profili",
                description: "İşletme bilgilerini görüntüleme ve düzenleme",
                routes: ["/panel/profile"],
            },
            {
                id: "general.qr_codes",
                label: "QR Kodlar",
                description: "QR kod oluşturma ve yönetimi",
                routes: ["/panel/qr"],
            },
            {
                id: "general.analytics",
                label: "Analitik",
                description: "İstatistik ve raporları görüntüleme",
                routes: [
                    "/panel/food/analytics",
                    "/panel/fastfood/analytics",
                    "/panel/hotel/analytics",
                    "/panel/beauty/analytics",
                    "/panel/clinic/analytics",
                    "/panel/ecommerce/analytics",
                    "/panel/emlak/analytics",
                ],
            },
            {
                id: "general.settings",
                label: "Ayarlar",
                description: "Genel ayarları düzenleme",
                routes: [
                    "/panel/food/settings",
                    "/panel/fastfood/settings",
                    "/panel/beauty/settings",
                    "/panel/clinic/settings",
                    "/panel/ecommerce/settings",
                ],
            },
            {
                id: "general.staff",
                label: "Ekip Yönetimi",
                description: "Personel ekleme, düzenleme ve silme",
                routes: ["/panel/staff"],
                minRole: "manager", // Only owner and manager can access
            },
        ],
    },
    {
        id: "restaurant",
        name: "Restoran",
        icon: "UtensilsCrossed",
        permissions: [
            {
                id: "restaurant.menu",
                label: "Menü Yönetimi",
                description: "Ürün ve kategori yönetimi",
                routes: [
                    "/panel/food/menu",
                    "/panel/fastfood/categories",
                    "/panel/fastfood/products",
                    "/panel/fastfood/extras",
                    "/panel/fastfood/coupons",
                ],
            },
            {
                id: "restaurant.tables",
                label: "Masa Düzeni",
                description: "Masa oluşturma ve QR kodları",
                routes: ["/panel/food/tables", "/panel/fastfood/tables"],
            },
            {
                id: "restaurant.orders",
                label: "Siparişler",
                description: "Sipariş takibi ve yönetimi",
                routes: ["/panel/fastfood/orders"],
            },
            {
                id: "restaurant.reservations",
                label: "Etkinlikler",
                description: "Masa rezervasyonları",
                routes: ["/panel/food/events"],
            },
        ],
    },
    // Future modules - ready for expansion
    {
        id: "hotel",
        name: "Otel",
        icon: "Building2",
        permissions: [
            {
                id: "hotel.rooms",
                label: "Oda Yönetimi",
                routes: ["/panel/hotel/rooms"],
            },
            {
                id: "hotel.bookings",
                label: "Oda Talepleri",
                routes: ["/panel/hotel/requests"],
            },
            {
                id: "hotel.guests",
                label: "Misafir Kayıtları",
                routes: ["/panel/hotel/orders"],
            },
            {
                id: "hotel.housekeeping",
                label: "Oda TÃ¼rleri",
                routes: ["/panel/hotel/room-types"],
            },
        ],
    },
    {
        id: "beauty",
        name: "Güzellik Salonu",
        icon: "Scissors",
        permissions: [
            {
                id: "salon.services",
                label: "Hizmetler",
                routes: ["/panel/beauty/services"],
            },
            {
                id: "salon.appointments",
                label: "Randevular",
                routes: ["/panel/beauty/appointments"],
            },
            {
                id: "salon.customers",
                label: "Müşteriler",
                routes: ["/panel/beauty/customers"],
            },
        ],
    },
    {
        id: "vehicle-rental",
        name: "Arac Kiralama",
        icon: "Car",
        permissions: [
            {
                id: "vehicle.dashboard",
                label: "Arac Kiralama Paneli",
                routes: ["/panel/vehicle-rental"],
            },
            {
                id: "vehicle.vehicles",
                label: "Araclar",
                routes: [
                    "/panel/vehicle-rental/vehicles",
                    "/panel/vehicle-rental/vehicles/new",
                    "/panel/vehicle-rental/vehicles/*",
                ],
            },
            {
                id: "vehicle.reservations",
                label: "Rezervasyonlar",
                routes: ["/panel/vehicle-rental/reservations"],
            },
            {
                id: "vehicle.calendar",
                label: "Takvim",
                routes: ["/panel/vehicle-rental/calendar"],
            },
            {
                id: "vehicle.categories",
                label: "Kategoriler",
                routes: ["/panel/vehicle-rental/categories"],
            },
        ],
    },
    {
        id: "clinic",
        name: "Klinik",
        icon: "Stethoscope",
        permissions: [
            {
                id: "clinic.dashboard",
                label: "Klinik Dashboard",
                routes: ["/panel/clinic"],
            },
            {
                id: "clinic.appointments",
                label: "Randevular",
                routes: ["/panel/clinic/appointments"],
            },
            {
                id: "clinic.patients",
                label: "Hasta Kayıtları",
                routes: ["/panel/clinic/patients"],
                minRole: "manager", // Sensitive data
            },
            {
                id: "clinic.categories",
                label: "Kategoriler",
                routes: ["/panel/clinic/categories"],
            },
            {
                id: "clinic.services",
                label: "Hizmetler",
                routes: ["/panel/clinic/services"],
            },
            {
                id: "clinic.staff",
                label: "Personel",
                routes: ["/panel/clinic/staff"],
            },
            {
                id: "clinic.billing",
                label: "Fatura & Ödeme",
                routes: ["/panel/clinic/billing"],
            },
            {
                id: "clinic.analytics",
                label: "Analizler",
                routes: ["/panel/clinic/analytics"],
            },
            {
                id: "clinic.settings",
                label: "Ayarlar",
                routes: ["/panel/clinic/settings"],
            },
        ],
    },
];

// ============================================
// ROLE HIERARCHY
// ============================================

const ROLE_HIERARCHY: Record<StaffRole, number> = {
    owner: 3,
    manager: 2,
    staff: 1,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all permission definitions as a flat map
 */
export function getAllPermissions(): Map<string, PermissionDefinition> {
    const map = new Map<string, PermissionDefinition>();
    for (const module of PERMISSION_MODULES) {
        for (const perm of module.permissions) {
            map.set(perm.id, perm);
        }
    }
    return map;
}

/**
 * Check if a role meets the minimum role requirement
 */
export function meetsMinRole(userRole: StaffRole, minRole?: StaffRole): boolean {
    if (!minRole) return true;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
    userPermissions: string[],
    userRole: StaffRole,
    requiredPermission: string
): boolean {
    // Owner has all permissions
    if (userRole === "owner") return true;

    // Check if permission exists
    const allPerms = getAllPermissions();
    const permDef = allPerms.get(requiredPermission);
    if (!permDef) return false;

    // Check minRole
    if (!meetsMinRole(userRole, permDef.minRole)) return false;

    // Check if user has the permission
    return userPermissions.includes(requiredPermission);
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
    userPermissions: string[],
    userRole: StaffRole,
    route: string
): boolean {
    // Owner can access everything
    if (userRole === "owner") return true;

    const allPerms = getAllPermissions();

    for (const [permId, permDef] of allPerms) {
        // Check if any of the permission's routes match
        const routeMatches = permDef.routes.some(r => {
            if (r.includes("*")) {
                // Wildcard matching
                const regex = new RegExp("^" + r.replace(/\*/g, "[^/]+") + "$");
                return regex.test(route);
            }
            return r === route;
        });

        if (routeMatches) {
            // Check minRole
            if (!meetsMinRole(userRole, permDef.minRole)) return false;
            // Check if user has this permission
            if (userPermissions.includes(permId)) return true;
        }
    }

    return false;
}

/**
 * Get permissions for a specific module
 */
export function getModulePermissions(moduleId: string): PermissionDefinition[] {
    const module = PERMISSION_MODULES.find(m => m.id === moduleId);
    return module?.permissions || [];
}

/**
 * Get all permission IDs for a role (default permissions)
 */
export function getDefaultPermissionsForRole(role: StaffRole): string[] {
    if (role === "owner") {
        // Owner gets all permissions
        return PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id));
    }

    if (role === "manager") {
        // Manager gets all except owner-only
        return PERMISSION_MODULES.flatMap(m =>
            m.permissions
                .filter(p => meetsMinRole("manager", p.minRole))
                .map(p => p.id)
        );
    }

    // Staff gets minimal defaults
    return ["general.profile"];
}

/**
 * Filter permission modules based on enabled business modules
 */
export function getAvailableModules(enabledModules: string[]): PermissionModule[] {
    const normalizedEnabledModules = enabledModules.map((moduleId) => moduleId.toLowerCase());
    const visiblePermissionModules = new Set(getVisiblePermissionModuleIds(enabledModules));

    return PERMISSION_MODULES.filter((module) => {
        if (!visiblePermissionModules.has(module.id)) return false;
        if (module.id === "general") return true;

        const aliases = MODULE_ALIASES[module.id] || [module.id];
        return aliases.some((alias) => normalizedEnabledModules.includes(alias));
    });
}
