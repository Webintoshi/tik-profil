"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { ArrowRight } from "lucide-react";

export function LandingHeader() {
    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
        >
            <div className="max-w-5xl mx-auto">
                <nav className="relative flex items-center justify-between px-6 py-3 rounded-full bg-dark-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                            <span className="text-white font-bold text-lg">T</span>
                        </div>
                        <span className="text-white font-medium tracking-tight">Tik Profil</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <NavLink href="#features">Özellikler</NavLink>
                        <NavLink href="#solutions">Çözümler</NavLink>
                        <NavLink href="#pricing">Paketler</NavLink>
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/giris-yap"
                            className="hidden sm:block text-sm font-medium text-dark-300 hover:text-white transition-colors"
                        >
                            Giriş Yap
                        </Link>
                        <Link href="/kayit-ol">
                            <button className="group relative px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors">
                                <span className="relative z-10 flex items-center gap-1">
                                    Başla
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                            </button>
                        </Link>
                    </div>
                </nav>
            </div>
        </motion.header>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="text-sm text-dark-300 hover:text-white transition-colors relative group"
        >
            {children}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300 opacity-50" />
        </Link>
    );
}
