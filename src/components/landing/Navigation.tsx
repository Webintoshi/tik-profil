"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Menu, X, ChevronDown, Utensils, Home, Scissors, Pizza, ChefHat, BedDouble, ShoppingBag } from "lucide-react";
import { TikLogo } from "@/components/TikLogo";

export function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileModulesOpen, setIsMobileModulesOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();
    const bgOpacity = useTransform(scrollY, [0, 100], [0, 0.98]);

    const modules = [
        { name: "Fast Food", href: "/fast-food", icon: Pizza, desc: "Hızlı Sipariş ve Paket Servis" },
        { name: "Restoran", href: "/restoran", icon: ChefHat, desc: "QR Menü ve Masa Siparişi" },
        { name: "Otel", href: "/otel", icon: BedDouble, desc: "Dijital Asistan ve Oda Servisi" },
        { name: "E-ticaret", href: "/e-ticaret", icon: ShoppingBag, desc: "Online Mağaza ve Satış" },
        { name: "Emlak & Gayrimenkul", href: "/emlak", icon: Home, desc: "İlan Yönetimi ve Portföy" },
        { name: "Güzellik Merkezi", href: "/guzellik-merkezi", icon: Scissors, desc: "Randevu ve Müşteri Takibi" },
    ];

    const navLinks = [
        { name: "Modüller", href: "#", hasDropdown: true },
        { name: "Özellikler", href: "/#urun" },
        { name: "Sektörel", href: "/#cozumler" },
        { name: "Blog", href: "/blog" },
        { name: "Hakkımızda", href: "/hakkimizda" },
        { name: "İletişim", href: "/iletisim" },
    ];

    // Click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = (name: string) => {
        if (activeDropdown === name) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(name);
        }
    };

    return (
        <motion.header
            className="fixed top-0 left-0 right-0 z-50"
            style={{
                backdropFilter: "blur(20px)",
                backgroundColor: useTransform(bgOpacity, (v) => `rgba(255, 255, 255, ${Math.min(v, 0.8) * 0.6})`),
                borderBottom: useTransform(bgOpacity, (v) => `1px solid rgba(255, 255, 255, ${v * 0.3})`)
            }}
        >
            <div className="max-w-7xl mx-auto px-6">
                <div className="h-20 flex items-center justify-between">
                    <Link href="/" className="group">
                        <motion.div
                            className="relative"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <TikLogo className="w-9 h-9" variant="light" />
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </motion.div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8" ref={dropdownRef}>
                        {navLinks.map((link) => (
                            <div key={link.name} className="relative">
                                {link.hasDropdown ? (
                                    <button
                                        onClick={() => toggleDropdown(link.name)}
                                        className={`relative flex items-center gap-1 text-sm font-medium transition-colors duration-300 py-2 outline-none ${
                                            activeDropdown === link.name ? "text-blue-600" : "text-slate-700/90 hover:text-blue-600"
                                        }`}
                                    >
                                        {link.name}
                                        <ChevronDown 
                                            className={`w-4 h-4 transition-transform duration-300 ${
                                                activeDropdown === link.name ? "rotate-180" : ""
                                            }`} 
                                        />
                                    </button>
                                ) : (
                                    <Link
                                        href={link.href}
                                        className="relative text-sm font-medium text-slate-700/90 hover:text-blue-600 transition-colors duration-300 group py-2"
                                    >
                                        {link.name}
                                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 group-hover:w-full transition-all duration-500 rounded-full" />
                                    </Link>
                                )}

                                {/* Dropdown Menu */}
                                {link.hasDropdown && (
                                    <AnimatePresence>
                                        {activeDropdown === link.name && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute top-full left-0 w-80 bg-white/90 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-2xl p-4 mt-4 grid gap-2 z-50"
                                            >
                                                <div className="absolute -top-2 left-4 w-4 h-4 bg-white/90 border-t border-l border-white/60 rotate-45" />
                                                {modules.map((module) => (
                                                    <Link 
                                                        key={module.name} 
                                                        href={module.href}
                                                        onClick={() => setActiveDropdown(null)}
                                                        className="flex items-start gap-4 p-3 rounded-xl hover:bg-blue-50/80 transition-colors group/item"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center text-blue-600 group-hover/item:scale-110 transition-transform shadow-sm">
                                                            <module.icon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-800 text-sm group-hover/item:text-blue-700">{module.name}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">{module.desc}</div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link href="/giris-yap" className="hidden md:block">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                className="text-sm font-medium text-slate-700/90 hover:text-blue-600 transition-colors px-5 py-2.5 rounded-xl hover:bg-white/30 backdrop-blur-sm border border-white/20"
                            >
                                Giriş Yap
                            </motion.button>
                        </Link>

                        <Link href="/kayit-ol">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(59,130,246,0.3)' }}
                                whileTap={{ scale: 0.95 }}
                                className="relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm overflow-hidden backdrop-blur-xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(29,78,216,0.9) 100%)',
                                    boxShadow: '0 4px 20px rgba(29,78,216,0.25)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                Ücretsiz Başla
                            </motion.button>
                        </Link>

                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-white/30 backdrop-blur-xl border border-white/30 hover:bg-white/40 transition-colors"
                        >
                            {isOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden overflow-hidden backdrop-blur-2xl bg-white/70 border-t border-white/30"
                    >
                        <div className="px-6 py-8 space-y-6">
                            {/* Mobile Modules Section */}
                            <div className="border-b border-slate-200/50 pb-4">
                                <button 
                                    onClick={() => setIsMobileModulesOpen(!isMobileModulesOpen)}
                                    className="flex items-center justify-between w-full text-2xl font-medium text-slate-800 py-2"
                                >
                                    Modüller
                                    <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isMobileModulesOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                <AnimatePresence>
                                    {isMobileModulesOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-2 space-y-3 pl-2">
                                                {modules.map((module) => (
                                                    <Link 
                                                        key={module.name}
                                                        href={module.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className="flex items-center gap-3 py-2 group"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                            <module.icon className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-lg font-medium text-slate-600 group-hover:text-blue-600 transition-colors">{module.name}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {navLinks.filter(l => !l.hasDropdown).map((link, i) => (
                                <motion.a
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="block text-2xl font-medium text-slate-800 py-2"
                                >
                                    {link.name}
                                </motion.a>
                            ))}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Link href="/kayit-ol" className="block">
                                    <button
                                        className="w-full py-4 rounded-xl font-semibold text-white text-lg backdrop-blur-xl"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(96,165,250,0.9) 0%, rgba(37,99,235,0.9) 100%)',
                                            border: '1px solid rgba(255,255,255,0.2)'
                                        }}
                                    >
                                        Ücretsiz Başla
                                    </button>
                                </Link>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
