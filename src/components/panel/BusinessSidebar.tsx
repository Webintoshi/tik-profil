"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    BarChart3,
    Building2,
    Calendar,
    Car,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    FileText,
    LayoutGrid,
    LogOut,
    Menu,
    Palette,
    Plus,
    QrCode,
    Settings,
    ShoppingCart,
    Ticket,
    Users,
    Utensils,
    UtensilsCrossed,
    X,
} from "lucide-react";
import clsx from "clsx";

import type { StaffRole } from "@/lib/permissions";
import { canAccessRoute as canAccessPermissionRoute } from "@/lib/permissions";
import {
    getVisiblePanelNavGroups,
    type PanelNavGroup,
    type PanelNavItem,
} from "@/lib/panel/moduleEntitlements";

import { useTheme } from "./ThemeProvider";

interface BusinessSidebarProps {
    businessName?: string;
    businessLogo?: string;
    enabledModules?: string[];
    userRole?: StaffRole;
    userPermissions?: string[];
}

const ICON_MAP = {
    BarChart3,
    Building2,
    Calendar,
    Car,
    ClipboardList,
    LayoutGrid,
    Palette,
    Plus,
    QrCode,
    Settings,
    ShoppingCart,
    Ticket,
    Users,
    Utensils,
    UtensilsCrossed,
    FileText,
} as const;

const GROUP_ICON_COLOR_MAP: Record<string, string> = {
    core: "text-emerald-500",
    food: "text-orange-500",
    fastfood: "text-orange-500",
    "vehicle-rental": "text-cyan-500",
};

function getIcon(iconName: string) {
    return ICON_MAP[iconName as keyof typeof ICON_MAP] ?? FileText;
}

function isRouteVisibleToUser(
    href: string,
    userRole: StaffRole,
    userPermissions: string[],
): boolean {
    if (userRole === "owner") {
        return true;
    }

    return canAccessPermissionRoute(userPermissions, userRole, href);
}

export function BusinessSidebar({
    businessName = "Isletmem",
    businessLogo,
    enabledModules = [],
    userRole = "owner",
    userPermissions = [],
}: BusinessSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isDark } = useTheme();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([
        "food",
        "fastfood",
        "vehicle-rental",
    ]);

    const visibleGroups = getVisiblePanelNavGroups({
        enabledModules,
    })
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                isRouteVisibleToUser(item.href, userRole, userPermissions),
            ),
        }))
        .filter((group) => group.items.length > 0);

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
        setExpandedGroups((previousGroups) =>
            previousGroups.includes(groupId)
                ? previousGroups.filter((currentId) => currentId !== groupId)
                : [...previousGroups, groupId],
        );
    };

    const sidebarBg = isDark ? "bg-[#0a0a0a] border-[#1a1a1a]" : "bg-white border-gray-100";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-500" : "text-gray-500";
    const textMuted = isDark ? "text-gray-600" : "text-gray-400";
    const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";
    const activeBg = "bg-emerald-500";
    const activeText = "text-white";
    const accentColor = "text-emerald-500";

    const NavItem = ({
        item,
        isNested = false,
    }: {
        item: PanelNavItem;
        isNested?: boolean;
    }) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = getIcon(item.icon);

        return (
            <Link
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap overflow-hidden",
                    isNested && "ml-3",
                    isActive ? clsx(activeBg, activeText) : clsx(textSecondary, hoverBg),
                )}
            >
                <Icon
                    className={clsx(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-white" : textMuted,
                    )}
                />
                <span className={clsx("font-medium text-sm truncate flex-1", isNested && "text-sm")}>
                    {item.label}
                </span>
                {isActive ? <ChevronRight className="h-3 w-3 text-white/70 flex-shrink-0" /> : null}
            </Link>
        );
    };

    const NavGroup = ({ group }: { group: PanelNavGroup }) => {
        if (group.id === "core") {
            return (
                <>
                    {group.items.map((item) => (
                        <NavItem key={item.id} item={item} />
                    ))}
                </>
            );
        }

        const GroupIcon = getIcon(group.icon);
        const isExpanded = expandedGroups.includes(group.id);

        return (
            <div className="pt-3">
                <button
                    onClick={() => toggleGroup(group.id)}
                    className={clsx(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                        hoverBg,
                    )}
                >
                    <GroupIcon
                        className={clsx(
                            "h-4 w-4",
                            GROUP_ICON_COLOR_MAP[group.id] ?? "text-emerald-500",
                        )}
                    />
                    <span className={clsx("font-medium text-sm flex-1 text-left", textSecondary)}>
                        {group.label}
                    </span>
                    {group.status === "limited" ? (
                        <span
                            className={clsx(
                                "px-1.5 py-0.5 rounded text-[9px] font-medium",
                                isDark ? "bg-white/5 text-gray-500" : "bg-amber-50 text-amber-700",
                            )}
                        >
                            MVP
                        </span>
                    ) : null}
                    <ChevronDown
                        className={clsx(
                            "h-4 w-4 transition-transform",
                            textMuted,
                            isExpanded && "rotate-180",
                        )}
                    />
                </button>

                <AnimatePresence>
                    {isExpanded ? (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-1 space-y-0.5">
                                {group.items.map((item) => (
                                    <NavItem key={item.id} item={item} isNested />
                                ))}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div
                className={clsx(
                    "p-5 border-b transition-colors",
                    isDark ? "border-[#1a1a1a]" : "border-gray-100",
                )}
            >
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
                        <p className={clsx("font-semibold truncate", textPrimary)}>{businessName}</p>
                        <p className={clsx("text-xs", accentColor)}>ISLETME PANELI</p>
                    </div>
                </div>
            </div>

            <div className="px-5 pt-6 pb-2">
                <span className={clsx("text-xs font-medium uppercase tracking-wider", textMuted)}>
                    MENU
                </span>
            </div>

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {visibleGroups.map((group) => (
                    <NavGroup key={group.id} group={group} />
                ))}
            </nav>

            <div
                className={clsx(
                    "p-3 space-y-2 border-t",
                    isDark ? "border-[#1a1a1a]" : "border-gray-100",
                )}
            >
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={clsx(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors disabled:opacity-50",
                        isDark
                            ? "text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                            : "text-gray-500 hover:bg-red-50 hover:text-red-600",
                    )}
                >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">
                        {isLoggingOut ? "Cikis yapiliyor..." : "Cikis Yap"}
                    </span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div
                className={clsx(
                    "lg:hidden fixed top-0 left-0 right-0 z-40 border-b",
                    sidebarBg,
                )}
            >
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

            <AnimatePresence>
                {isMobileOpen ? (
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
                                isDark ? "bg-[#0a0a0a]" : "bg-white",
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
                ) : null}
            </AnimatePresence>

            <aside
                className={clsx(
                    "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r",
                    sidebarBg,
                )}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
