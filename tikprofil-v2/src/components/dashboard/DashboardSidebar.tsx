"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    LayoutGrid,
    Layers,
    ShoppingBag,
    Shield,
    Settings,
    Blocks,
    Bike,
    ChevronRight,
    Sparkles,
    Menu,
    X,
    LogOut,
    Map,
    BookOpen,
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";

const navigation = [
    { name: "Kontrol Paneli", href: "/dashboard", icon: LayoutDashboard },
    { name: "Şehir Rehberi", href: "/dashboard/cities", icon: Map },
    { name: "Modüller", href: "/dashboard/modules", icon: Blocks },
    { name: "İşletmeler", href: "/dashboard/businesses", icon: Building2 },
    { name: "Kurye Yönetimi", href: "/dashboard/couriers", icon: Bike },
    { name: "İşletme Türleri", href: "/dashboard/industry-types", icon: LayoutGrid },
    { name: "Paket Yönetimi", href: "/dashboard/packages", icon: Layers },
    { name: "Mağaza Yönetimi", href: "/dashboard/store", icon: ShoppingBag },
    { name: "Blog İçerikleri", href: "/dashboard/blog-content", icon: BookOpen },
    { name: "Güvenlik Kayıtları", href: "/dashboard/security", icon: Shield },
    { name: "Ayarlar", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                setShowLogoutModal(false);
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

    useEffect(() => {
        if (isOpen || showLogoutModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen, showLogoutModal]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            localStorage.clear();
            sessionStorage.clear();
            router.push("/webintoshi?logout=success");
        } catch (error) {
            console.error("Logout error:", error);
            setIsLoggingOut(false);
            setShowLogoutModal(false);
        }
    };

    const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
        <>
            {/* Logo with Liquid Metal Effect */}
            <div className="flex h-16 items-center gap-3 px-6 border-b border-white/[0.06]">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        boxShadow: '0 4px 15px rgba(59,130,246,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                    }}
                >
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span
                        className="text-sm font-bold"
                        style={{
                            background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Tık Profil
                    </span>
                    <span className="text-xs text-gray-500">Ekosistem Kontrolü</span>
                </div>
            </div>

            {/* Navigation with Metallic Items */}
            <nav className="flex flex-col gap-1 p-4 flex-1">
                {navigation.map((item, index) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

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
                                        ? "text-white"
                                        : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                                )}
                                style={isActive ? {
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.15) 100%)',
                                    boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.3), 0 4px 12px rgba(59,130,246,0.15)'
                                } : undefined}
                            >
                                <item.icon
                                    className={clsx(
                                        "h-5 w-5 transition-all duration-300",
                                        isActive ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400"
                                    )}
                                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.6))' } : undefined}
                                />
                                <span className="flex-1 text-sm font-medium">{item.name}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="dashboardActiveIndicator"
                                        className="h-1.5 w-1.5 rounded-full bg-blue-400"
                                        style={{ boxShadow: '0 0 8px rgba(59,130,246,0.8)' }}
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

            {/* Bottom Section with Metallic Styling */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/[0.06]">
                {/* User Info */}
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div
                        className="h-9 w-9 rounded-full"
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            boxShadow: '0 4px 12px rgba(139,92,246,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                        }}
                    />
                    <div className="flex-1 min-w-0">
                        <p
                            className="text-sm font-semibold truncate"
                            style={{
                                background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            webintosh
                        </p>
                        <p className="text-xs text-gray-500 truncate">Süper Yönetici</p>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-medium group"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)',
                        boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.2)'
                    }}
                >
                    <LogOut className="h-4 w-4 text-red-400 group-hover:scale-110 transition-transform" />
                    <span className="text-red-400">Güvenli Çıkış</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Header with Liquid Metal */}
            <div
                className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 border-b border-white/[0.06]"
                style={{
                    background: 'linear-gradient(180deg, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.9) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                        }}
                    >
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span
                        className="text-sm font-semibold"
                        style={{
                            background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Kontrol Merkezi
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="h-5 w-5 text-red-400" />
                    </button>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 rounded-xl hover:bg-white/[0.05] transition-colors active:scale-95"
                    >
                        {isOpen ? (
                            <X className="h-6 w-6 text-gray-300" />
                        ) : (
                            <Menu className="h-6 w-6 text-gray-300" />
                        )}
                    </button>
                </div>
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
                        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Mobile Sidebar with Liquid Metal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="lg:hidden fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/[0.06]"
                        style={{
                            background: 'linear-gradient(180deg, rgba(15,15,20,0.98) 0%, rgba(10,10,15,0.98) 100%)',
                            backdropFilter: 'blur(40px) saturate(180%)',
                        }}
                    >
                        <SidebarContent onLinkClick={() => setIsOpen(false)} />
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar with Liquid Metal Glass */}
            <aside
                className="hidden lg:block fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/[0.06]"
                style={{
                    background: 'linear-gradient(180deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.95) 100%)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)'
                }}
            >
                {/* Ambient Glow */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
                <SidebarContent />
            </aside>

            {/* Logout Confirmation Modal with Liquid Metal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <LogoutModal
                        onConfirm={handleLogout}
                        onCancel={() => setShowLogoutModal(false)}
                        isLoading={isLoggingOut}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

// Logout Confirmation Modal with Liquid Metal Design
function LogoutModal({
    onConfirm,
    onCancel,
    isLoading
}: {
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            >
                <div
                    className="w-full max-w-sm p-6 rounded-2xl border border-white/[0.08]"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,20,25,0.95) 0%, rgba(15,15,20,0.95) 100%)',
                        backdropFilter: "blur(40px) saturate(180%)",
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)'
                    }}
                >
                    <div className="text-center">
                        <div
                            className="mx-auto h-14 w-14 rounded-full flex items-center justify-center mb-4"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.1) 100%)',
                                boxShadow: '0 4px 20px rgba(239,68,68,0.2), inset 0 0 0 1px rgba(239,68,68,0.2)'
                            }}
                        >
                            <LogOut className="h-6 w-6 text-red-400" />
                        </div>
                        <h3
                            className="text-lg font-bold mb-2"
                            style={{
                                background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Oturumu Kapat
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Oturumu kapatmak istiyor musunuz?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 text-gray-300 hover:text-white"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                                }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    boxShadow: '0 4px 15px rgba(239,68,68,0.4), inset 0 1px 1px rgba(255,255,255,0.1)'
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <LogOut className="h-4 w-4" />
                                        </motion.div>
                                        Çıkılıyor...
                                    </>
                                ) : (
                                    "Çıkış Yap"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
