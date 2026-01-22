"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { TikLogo } from "@/components/TikLogo";

const navLinks = [
    { name: "Özellikler", href: "#features" },
    { name: "Fiyatlar", href: "#pricing" },
    { name: "Yorumlar", href: "#social-proof" },
];

export function GlobalNav() {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { scrollY } = useScroll();
    const bgOpacity = useTransform(scrollY, [0, 100], [0, 0.9]);

    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
    }, [isMobileOpen]);

    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <motion.div
                className="relative z-50 border-b"
                style={{
                    backgroundColor: useTransform(bgOpacity, (v) => `rgba(3, 0, 20, ${v})`),
                    borderColor: useTransform(bgOpacity, (v) => `rgba(139, 92, 246, ${v * 0.15})`),
                    backdropFilter: "blur(20px)",
                }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="h-16 md:h-20 flex items-center justify-between">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                <TikLogo className="w-9 h-9 rounded-xl" variant="dark" />
                                {/* Glow */}
                                <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="font-bold text-xl text-white hidden sm:block">
                                TikProfil
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors group"
                                >
                                    {link.name}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-cyan-500 group-hover:w-full transition-all duration-300" />
                                </Link>
                            ))}
                        </nav>

                        {/* CTA Buttons */}
                        <div className="flex items-center gap-4">
                            <Link href="/giris" className="hidden md:block">
                                <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-4 py-2">
                                    Giriş
                                </button>
                            </Link>

                            <Link href="/kayit-ol">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                                    style={{
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                        boxShadow: '0 0 30px rgba(139,92,246,0.4)'
                                    }}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Başla
                                </motion.button>
                            </Link>

                            {/* Mobile Menu */}
                            <button
                                onClick={() => setIsMobileOpen(!isMobileOpen)}
                                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <AnimatePresence mode="wait">
                                    {isMobileOpen ? (
                                        <motion.div
                                            key="close"
                                            initial={{ rotate: -90, opacity: 0 }}
                                            animate={{ rotate: 0, opacity: 1 }}
                                            exit={{ rotate: 90, opacity: 0 }}
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="menu"
                                            initial={{ rotate: 90, opacity: 0 }}
                                            animate={{ rotate: 0, opacity: 1 }}
                                            exit={{ rotate: -90, opacity: 0 }}
                                        >
                                            <Menu className="w-5 h-5 text-white" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "100vh" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 top-16 md:top-20 bg-[#030014] z-40"
                    >
                        <div className="p-8 flex flex-col gap-2">
                            {navLinks.map((link, i) => (
                                <motion.div
                                    key={link.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Link
                                        href={link.href}
                                        onClick={() => setIsMobileOpen(false)}
                                        className="block text-3xl font-semibold text-white py-4 border-b border-white/10"
                                    >
                                        {link.name}
                                    </Link>
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="mt-8 space-y-4"
                            >
                                <Link href="/giris" className="block">
                                    <button className="w-full py-4 rounded-xl font-semibold text-white bg-white/10">
                                        Giriş Yap
                                    </button>
                                </Link>
                                <Link href="/kayit-ol" className="block">
                                    <button
                                        className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                                        style={{
                                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                            boxShadow: '0 0 40px rgba(139,92,246,0.4)'
                                        }}
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Ücretsiz Başla
                                    </button>
                                </Link>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
