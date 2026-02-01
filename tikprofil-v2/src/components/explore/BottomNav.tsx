"use client";

import { useTheme } from "./ThemeProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Search, Heart, User } from "lucide-react";

interface NavItem {
    label: string;
    href: string;
    icon: any;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Ana Sayfa", href: "/kesfet-v2", icon: Home },
    { label: "Keşfet", href: "/kesfet-v2", icon: Search },
    { label: "Favoriler", href: "/kesfet-v2/favorites", icon: Heart },
    { label: "Profil", href: "/kesfet-v2/profile", icon: User },
];

export default function BottomNav() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const pathname = usePathname();

    return (
        <nav className={`fixed bottom-0 left-0 right-0 z-40 safe-area-bottom
                        ${isDark ? "bg-gray-950/95 backdrop-blur-xl border-t border-white/10" : "bg-white/95 backdrop-blur-xl border-t border-gray-100"}`}>
            <div className="max-w-2xl mx-auto px-4 py-2">
                <div className="flex items-center justify-around">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center gap-1 py-2 px-3
                                               transition-all duration-200"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-2xl bg-emerald-500/20"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <div className="relative">
                                    <Icon
                                        className={`w-6 h-6 transition-colors duration-200
                                                   ${isActive
                                                    ? "text-emerald-500"
                                                    : isDark ? "text-white/50" : "text-gray-400"}`}
                                    />
                                    {isActive && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500"
                                            layoutId="activeDot"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </div>

                                <span className={`text-[11px] font-medium transition-colors duration-200
                                                ${isActive
                                                ? "text-emerald-500"
                                                : isDark ? "text-white/50" : "text-gray-400"}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
