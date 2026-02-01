"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    Blocks,
    ChevronRight,
    Sparkles,
    Menu,
    X,
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";

const navigation = [
    { name: "Kontrol Paneli", href: "/admin", icon: LayoutDashboard },
    { name: "İşletmeler", href: "/admin/businesses", icon: Building2 },
    { name: "Kullanıcılar", href: "/admin/users", icon: Users },
    { name: "Modüller", href: "/admin/modules", icon: Blocks },
    { name: "Ayarlar", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-dark-700/50 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-dark-100">Tık Profil</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-xl hover:bg-dark-800 transition-colors active:scale-95"
                    aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
                >
                    {isOpen ? (
                        <X className="h-6 w-6 text-dark-300" />
                    ) : (
                        <Menu className="h-6 w-6 text-dark-300" />
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden fixed inset-0 z-40 bg-dark-950/80 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Mobile Sidebar - Animated with Framer Motion */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="lg:hidden fixed left-0 top-0 z-50 h-screen w-64 glass border-r border-dark-700/50"
                    >
                        <SidebarContent pathname={pathname} onLinkClick={() => setIsOpen(false)} />
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar - Always visible */}
            <aside className="hidden lg:block fixed left-0 top-0 z-40 h-screen w-64 glass border-r border-dark-700/50">
                <SidebarContent pathname={pathname} />
            </aside>
        </>
    );
}

// Extracted sidebar content for reuse
function SidebarContent({ pathname, onLinkClick }: { pathname: string; onLinkClick?: () => void }) {
    return (
        <>
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 px-6 border-b border-dark-700/50">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-dark-100">Tık Profil</span>
                    <span className="text-xs text-dark-500">Yönetim Paneli</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-4">
                {navigation.map((item, index) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/admin" && pathname.startsWith(item.href));

                    return (
                        <motion.div
                            key={item.name}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                            <Link
                                href={item.href}
                                onClick={onLinkClick}
                                className={clsx(
                                    "group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300",
                                    isActive
                                        ? "vibrancy-active text-accent-blue"
                                        : "text-dark-400 hover:text-dark-200 hover:bg-dark-800/60"
                                )}
                            >
                                <item.icon className={clsx(
                                    "h-5 w-5 transition-all duration-300",
                                    isActive ? "text-accent-blue icon-glow" : "text-dark-500 group-hover:text-dark-400"
                                )} />
                                <span className="flex-1 text-sm font-medium">{item.name}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="h-1.5 w-1.5 rounded-full bg-accent-blue"
                                    />
                                )}
                                <ChevronRight className={clsx(
                                    "h-4 w-4 opacity-0 transition-all",
                                    "group-hover:opacity-100 group-hover:translate-x-0.5",
                                    isActive && "opacity-100"
                                )} />
                            </Link>
                        </motion.div>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-700/50">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-pink" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-200 truncate">Yönetici</p>
                        <p className="text-xs text-dark-500 truncate">admin@tikprofil.com</p>
                    </div>
                </div>
            </div>
        </>
    );
}
