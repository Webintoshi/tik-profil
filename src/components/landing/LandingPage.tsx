"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import Link from "next/link";
import {
    ArrowRight, Sparkles, Zap, CheckCircle2,
    Smartphone, Shield, Rocket, Globe, ChevronDown,
    Menu, X, Users, TrendingUp, Award, Play, Phone, MessageCircle,
    MapPin, Clock, Calendar, ShoppingCart, BarChart3, FileText, Image,
    Globe as Globe2, Zap as Zap2, Sparkles as Sparkles2, TrendingUp as TrendingUp2, Check,
    Star, Plus, Layers, Waves, UserCheck
} from "lucide-react";
import { TikLogo } from "@/components/TikLogo";
import { QRWorldAnimation } from "./QRWorldAnimation";
import { TestimonialsSection } from "./TestimonialsSection";
import { LiveDemoSection } from "./LiveDemoSection";

export function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const [isModulesOpen, setIsModulesOpen] = useState(false);
    const { scrollY } = useScroll();
    const bgOpacity = useTransform(scrollY, [0, 100], [0, 0.98]);

    const navLinks = [
        { name: "Özellikler", href: "#urun" },
        { name: "Sektörel", href: "#cozumler" },
        { name: "Blog", href: "/blog" },
        { name: "Hakkımızda", href: "/hakkimizda" },
        { name: "Kariyer", href: "/kariyer" },
        { name: "İletişim", href: "/iletisim" },
        { name: "SSS", href: "#sss" },
    ];

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

                    <nav className="hidden md:flex items-center gap-10">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="relative text-sm font-medium text-slate-700/90 hover:text-blue-600 transition-colors duration-300 group py-2"
                            >
                                {link.name}
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 group-hover:w-full transition-all duration-500 rounded-full" />
                            </a>
                        ))}
                        <div className="relative">
                            <button
                                onClick={() => setIsModulesOpen(!isModulesOpen)}
                                className="relative flex items-center gap-1 text-sm font-medium transition-colors duration-300 py-2 outline-none text-slate-700/90 hover:text-blue-600"
                            >
                                Modüller
                                <motion.div animate={{ rotate: isModulesOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                    <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                                </motion.div>
                            </button>
                            <AnimatePresence>
                                {isModulesOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden"
                                    >
                                        <div className="p-2">
                                            <a
                                                href="/dashboard/modules"
                                                className="block px-4 py-3 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                Tüm Modüller
                                            </a>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
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
                            {navLinks.map((link, i) => (
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

function FloatingOrb({ className, delay }: { className?: string, delay?: number }) {
    const style = {
        animationDelay: `${delay || 0}s`
    };

    return (
        <div
            className={`absolute rounded-full blur-3xl animate-orb-float ${className}`}
            style={style}
        />
    );
}

function HeroSection() {
    const stats = [
        { value: "500+", label: "Aktif İşletme", icon: Users, color: "blue" },
        { value: "10K+", label: "Oluşturulan Profil", icon: UserCheck, color: "purple" },
        { value: "63+", label: "Modül Seçeneği", icon: Layers, color: "emerald" },
        { value: "4.8/5", label: "Kullanıcı Puanı", icon: Star, color: "amber" }
    ];

    return (
        <section className="relative min-h-screen flex flex-col justify-center pt-20 md:pt-0">
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 w-full flex flex-col gap-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <div className="space-y-8 md:space-y-10 order-2 lg:order-1">
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                        >
                            <div className="inline-flex items-center gap-3 px-4 md:px-6 py-2 md:py-3 rounded-full border border-white/40 bg-white/40 backdrop-blur-xl">
                                <motion.span 
                                    className="relative flex h-3 w-3"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                                </motion.span>
                                <span className="text-xs md:text-sm font-semibold text-blue-700">
                                    Ücretsiz Dijital Kimlik
                                </span>
                                <motion.div
                                    className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center hidden sm:flex"
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <Plus className="w-3 h-3 text-white" />
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight lg:leading-[1.05]">
                                <span className="text-slate-800/95 inline-block">
                                    İşletmeniz İçin
                                </span>
                                <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 inline-block animate-gradient-x">
                                    Dijital Kimlik
                                </span>
                                <br />
                                <span className="text-slate-800/95 inline-block text-3xl sm:text-4xl lg:text-6xl mt-2">
                                    ve QR Kod Çözümü
                                </span>
                            </h1>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-lg md:text-xl text-slate-700/80 max-w-xl leading-relaxed"
                        >
                            Tek bir <strong>QR kod</strong> ile tüm dijital dünyanızı müşterilerinize sunun. Menü, randevu, sosyal medya ve iletişim bilgileriniz tek linkte.
                            <br className="my-2 block content-['']" />
                            <span className="text-blue-700 font-bold inline-block">
                                Satışlarınızı ve müşteri etkileşiminizi artırın.
                            </span>
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <Link href="/kayit-ol" className="w-full sm:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.03, boxShadow: '0 15px 50px rgba(59,130,246,0.35)' }}
                                    whileTap={{ scale: 0.97 }}
                                    className="relative w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-3 overflow-hidden group backdrop-blur-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(29,78,216,0.9) 100%)',
                                        boxShadow: '0 8px 30px rgba(29,78,216,0.25)',
                                        border: '1px solid rgba(255,255,255,0.3)'
                                    }}
                                >
                                    <motion.div 
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    />
                                    Ücretsiz Başla
                                    <Rocket className="w-5 h-5" />
                                </motion.button>
                            </Link>

                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.5)' }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 rounded-2xl font-semibold text-lg text-slate-700/90 flex items-center justify-center gap-3 border border-white/40 bg-white/40 backdrop-blur-xl transition-all"
                            >
                                <motion.div 
                                    className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center"
                                    whileHover={{ scale: 1.1, rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <Play className="w-4 h-4 fill-slate-600 text-slate-600" />
                                </motion.div>
                                Demo İzle
                            </motion.button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-slate-700/70 pt-2 md:pt-6"
                        >
                            {[
                                { icon: CheckCircle2, text: "Kredi kartı gerekmez" },
                                { icon: CheckCircle2, text: "60 saniyede kurulum" },
                                { icon: CheckCircle2, text: "Sonsuza kadar ücretsiz plan" },
                            ].map((item, i) => (
                                <motion.div 
                                    key={i} 
                                    className="flex items-center gap-2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.7 + i * 0.1 }}
                                >
                                    <motion.div 
                                        className="w-5 h-5 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center"
                                        whileHover={{ scale: 1.2 }}
                                    >
                                        <item.icon className="w-3 h-3 text-emerald-600" />
                                    </motion.div>
                                    <span>{item.text}</span>
                                </motion.div>
                            ))}
                        </motion.div>

                        <motion.div 
                            className="relative pt-4 md:pt-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            <motion.div 
                                className="flex items-center gap-4"
                                animate={{ x: [0, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star 
                                            key={star} 
                                            className="w-5 h-5 md:w-6 md:h-6 text-amber-400 fill-amber-400 -ml-1 first:ml-0"
                                            style={{ opacity: star <= 4.8 ? 1 : 0.3 }}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-slate-800/95">4.8/5</span>
                                <span className="text-sm text-slate-700/70">500+ değerlendirme</span>
                            </motion.div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ delay: 0.4, duration: 1.2, type: "spring", stiffness: 50 }}
                        className="relative h-[400px] lg:h-[600px] order-1 lg:order-2 w-full"
                        style={{
                            perspective: 1000
                        }}
                    >
                        <motion.div 
                            className="absolute inset-0 rounded-3xl backdrop-blur-2xl border border-white/30"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                            }}
                            animate={{ 
                                rotate: [0, 360],
                                scale: [1, 1.02, 1]
                            }}
                            transition={{ 
                                rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                            }}
                        />
                        <QRWorldAnimation />
                        
                        <motion.div 
                            className="absolute -top-4 -right-4 bg-white/60 backdrop-blur-2xl rounded-2xl shadow-2xl p-4 border border-white/40"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100/50 backdrop-blur-sm flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800/95">+245%</div>
                                    <div className="text-xs text-slate-700/70">Dönüşüm</div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            className="absolute -bottom-4 -left-4 bg-white/60 backdrop-blur-2xl rounded-2xl shadow-2xl p-4 border border-white/40"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            style={{
                                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100/50 backdrop-blur-sm flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800/95">500+</div>
                                    <div className="text-xs text-slate-700/70">İşletme</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5, boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.15)' }}
                            className="relative group p-6 rounded-3xl bg-white/30 backdrop-blur-2xl border border-white/50 hover:border-blue-300/50 transition-all duration-500 overflow-hidden"
                            style={{
                                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)'
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            
                            <motion.div 
                                className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-white/80 to-white/20 backdrop-blur-md border border-white/60 flex items-center justify-center mb-4 shadow-lg shadow-${stat.color}-500/10`}
                                whileHover={{ rotate: 10, scale: 1.1 }}
                                transition={{ duration: 0.4 }}
                            >
                                <stat.icon className={`w-6 h-6 text-${stat.color}-600 drop-shadow-sm`} />
                            </motion.div>
                            
                            <motion.div 
                                className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mb-1"
                                initial={{ scale: 0.9 }}
                                whileInView={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200 }}
                            >
                                {stat.value}
                            </motion.div>
                            
                            <div className="text-sm font-medium text-slate-600/90 group-hover:text-blue-700/80 transition-colors">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <motion.div 
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-700/70 hidden lg:flex"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <span className="text-xs font-medium">Aşağı Kaydır</span>
                <ChevronDown className="w-5 h-5" />
            </motion.div>
        </section>
    );
}



function ProductSection() {
    const features = [
        {
            icon: Smartphone,
            title: "Yeni Nesil Dijital Kartvizit",
            description: "Kağıt kartvizitler tarih oldu. NFC ve QR teknolojisi ile iletişim bilgilerinizi temassız paylaşın.",
            gradient: "from-blue-500 to-blue-600",
        },
        {
            icon: ShoppingCart,
            title: "QR Menü & Katalog",
            description: "Restoranlar için temassız menü, mağazalar için dijital katalog. Müşterileriniz anında sipariş versin.",
            gradient: "from-purple-500 to-pink-600",
        },
        {
            icon: Calendar,
            title: "Akıllı Randevu Sistemi",
            description: "Telefon trafiğinden kurtulun. Müşterileriniz 7/24 online randevu alsın, takviminiz otomatik dolsun.",
            gradient: "from-emerald-500 to-green-600",
        },
        {
            icon: BarChart3,
            title: "Gelişmiş Ziyaretçi Analizi",
            description: "Profilinizi kim, ne zaman, nereden ziyaret etmiş? Detaylı raporlarla pazarlama stratejinizi güçlendirin.",
            gradient: "from-amber-500 to-orange-600",
        }
    ];

    return (
        <section id="urun" className="relative py-12 md:py-20 bg-transparent">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/40 mb-6"
                    >
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Tık Profil Özellikleri</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                    >
                        <span className="text-slate-800/95">İşletmenizi Büyüten </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
                            Dijital Araçlar
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-slate-700/80"
                    >
                        Sadece bir link değil, işletmenizin dijital operasyon merkezi.
                    </motion.p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -8 }}
                            className="group relative p-8 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 hover:border-white/60 transition-all duration-500 overflow-hidden"
                            style={{
                                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.07)'
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 pointer-events-none" />
                            <div className="relative z-10 flex items-start gap-6">
                                <motion.div
                                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shrink-0 shadow-lg`}
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.6 }}
                                    style={{
                                        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    <feature.icon className="w-7 h-7" />
                                </motion.div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800/95 mb-3 group-hover:text-blue-600 transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-700/80 leading-relaxed text-lg">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function SolutionsSection() {
    return (
        <section id="cozumler" className="relative py-12 md:py-20 bg-transparent">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="rounded-[3rem] p-10 md:p-16 bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl overflow-hidden relative"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(31, 38, 135, 0.15)'
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                        <div>
                            <motion.span
                                className="text-blue-600 font-semibold text-sm uppercase tracking-wider"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                            >
                                Her Sektöre Uygun
                            </motion.span>

                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-bold mt-4 mb-8"
                            >
                                <span className="text-slate-800/95">Sektör fark etmez,</span>
                                <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
                                    dijital çağa
                                </span>{" "}
                                <span className="text-slate-800/95">adım atın.</span>
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="text-slate-700/80 mb-10 text-lg leading-relaxed"
                            >
                                Restoran, kafe, güzellik salonu, oto galeri, eczane,
                                avukat, doktor... 50'den fazla sektörde işletmeler Tık Profil kullanıyor.
                            </motion.p>

                            <div className="space-y-5">
                                {[
                                    { title: 'Hızlı Erişim', desc: 'QR kod veya link ile saniyeler içinde ulaşım' },
                                    { title: 'Güvenilir İmaj', desc: 'Profesyonel görünüm, kurumsal güven' },
                                    { title: 'Anında Dönüşüm', desc: 'Tek dokunuşla arama, mesaj veya yol tarifi' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={item.title}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3 + i * 0.1 }}
                                        className="flex items-start gap-4"
                                    >
                                        <motion.div 
                                            className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mt-1.5 shadow-lg shadow-blue-500/30"
                                            whileHover={{ scale: 1.5 }}
                                        />
                                        <div>
                                            <div className="font-semibold text-slate-800/95">{item.title}</div>
                                            <div className="text-slate-700/70 text-sm">{item.desc}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {[
                                { icon: Globe2, title: "Bio Link Yönetimi", desc: "Instagram, TikTok trafiğini tek noktada toplayın.", color: "blue" },
                                { icon: Zap2, title: "QR Kod & Menü", desc: "Masadan sipariş, dijital menü, temassız ödeme.", color: "amber" },
                                { icon: Calendar, title: "Randevu Sistemi", desc: "7/24 online randevu, otomatik hatırlatma.", color: "blue" },
                                { icon: BarChart3, title: "Detaylı Analitik", desc: "Ziyaret, tıklama, dönüşüm raporları.", color: "emerald" },
                            ].map((card, i) => (
                                <motion.div
                                    key={card.title}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/40 hover:border-white/60 transition-all relative overflow-hidden"
                                    style={{
                                        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.07)'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 pointer-events-none" />
                                    <div className="relative z-10">
                                    <div className={`w-12 h-12 rounded-xl bg-${card.color}-100/50 backdrop-blur-sm flex items-center justify-center mb-4`}>
                                        <card.icon className={`w-6 h-6 text-${card.color}-600`} />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800/95 mb-2">{card.title}</h3>
                                    <p className="text-sm text-slate-700/70">{card.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function FAQSection() {
    const faqs = [
        { q: "Ücretsiz plan gerçekten ücretsiz mi?", a: "Evet! Temel profil özellikleri sonsuza kadar ücretsiz. İşletme adı, logo, iletişim bilgileri, sosyal linkler ve temel galeri tamamen ücretsiz olarak kullanılabilir." },
        { q: "Profil linkimi özelleştirebilir miyim?", a: "Evet, tikprofil.com/isletme-adi formatında kısa, özel ve akılda kalıcı bir link alırsınız. PRO planda özel domain de bağlayabilirsiniz." },
        { q: "Kredi kartı gerekli mi?", a: "Hayır! Ücretsiz plan için hiçbir ödeme bilgisi gerektirmez. Sadece PRO özelliklere geçmek isterseniz ödeme alınır." },
        { q: "Modülleri sonradan ekleyebilir miyim?", a: "Kesinlikle! İhtiyaç duyduğunuz her an modül mağazasından tek tıkla ekleme yapabilirsiniz. Modüller aylık veya yıllık abonelik ile aktive edilir." },
        { q: "Teknik destek var mı?", a: "Evet, tüm kullanıcılara e-posta desteği sunuyoruz. PRO kullanıcılar 7/24 canlı destek ve öncelikli yanıt hakkına sahiptir." },
    ];

    return (
        <section id="sss" className="relative py-12 md:py-20 bg-transparent">
            <div className="max-w-4xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-800/95 mb-4">
                        Sıkça Sorulan Sorular
                    </h2>
                    <p className="text-slate-700/80 text-lg">
                        Aklınızdaki soruların cevaplarını burada bulabilirsiniz.
                    </p>
                </motion.div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="rounded-2xl overflow-hidden bg-white/40 backdrop-blur-xl border border-white/40 hover:border-white/60 transition-all"
                            style={{
                                boxShadow: '0 4px 16px rgba(31, 38, 135, 0.07)'
                            }}
                        >
                            <details className="group">
                                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none p-6 text-lg text-slate-800/95 hover:text-blue-600 transition-colors">
                                    <span className="pr-4">{faq.q}</span>
                                    <ChevronDown className="w-5 h-5 text-blue-600 transition-transform duration-300 group-open:rotate-180 shrink-0" />
                                </summary>
                                <div className="text-slate-700/80 px-6 pb-6 leading-relaxed border-t border-white/30 pt-4">
                                    {faq.a}
                                </div>
                            </details>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CTASection() {
    return (
        <section className="relative py-12 md:py-20 overflow-hidden bg-transparent">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="space-y-8"
                >
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                        <span className="text-slate-800/95">İşletmenizi</span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
                            Geleceğe Taşıyın.
                        </span>
                    </h2>

                    <p className="text-xl md:text-2xl text-slate-700/80 max-w-2xl mx-auto">
                        Tık Profil ile dijital dönüşümünüz bugün başlasın.
                        <br />
                        <span className="text-slate-800/95 font-medium">Kodlama bilgisi gerekmez.</span>
                    </p>

                    <div className="pt-4">
                        <Link href="/kayit-ol">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(59,130,246,0.35)' }}
                                whileTap={{ scale: 0.95 }}
                                className="h-20 px-16 rounded-2xl font-bold text-xl text-white inline-flex items-center gap-3 backdrop-blur-xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(29,78,216,0.9) 100%)',
                                    boxShadow: '0 10px 40px rgba(29,78,216,0.25)',
                                    border: '1px solid rgba(255,255,255,0.3)'
                                }}
                            >
                                <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                />
                                Hemen Ücretsiz Başla
                                <ArrowRight className="w-6 h-6" />
                            </motion.button>
                        </Link>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-slate-700/70">
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>Kredi kartı gerekmez</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>14 gün PRO deneme</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>İstediğin zaman iptal</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

export function Footer() {
    const socialLinks = [
        { name: "Instagram", icon: Globe },
        { name: "X", icon: Globe },
        { name: "LinkedIn", icon: Globe },
    ];

    return (
        <footer className="border-t border-white/30 bg-white/40 backdrop-blur-xl pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="md:col-span-2">
                        <Link href="/" className="inline-block mb-6">
                            <TikLogo className="w-9 h-9" variant="light" />
                        </Link>
                        <p className="text-slate-700/80 max-w-md leading-relaxed mb-6">
                            İşletmeler için geliştirilmiş yeni nesil dijital kimlik ve yönetim platformu.
                            Tek link, sınırsız olasılık.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((social) => (
                                <motion.a
                                    key={social.name}
                                    href="#"
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40 hover:bg-white/60 hover:border-white/60 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all font-medium"
                                >
                                    <social.icon className="w-5 h-5" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold mb-5 text-slate-800/95">Platform</h4>
                        <ul className="space-y-3 text-slate-700/80">
                            {['Özellikler', 'Modüller', 'Fiyatlandırma', 'Entegrasyonlar'].map((link) => (
                                <li key={link}>
                                    <a href="#" className="hover:text-blue-600 transition-colors">{link}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-5 text-slate-800/95">Şirket</h4>
                        <ul className="space-y-3 text-slate-700/80">
                            <li><a href="/hakkimizda" className="hover:text-blue-600 transition-colors">Hakkımızda</a></li>
                            <li><a href="/blog" className="hover:text-blue-600 transition-colors">Blog</a></li>
                            <li><a href="/kariyer" className="hover:text-blue-600 transition-colors">Kariyer</a></li>
                            <li><a href="/iletisim" className="hover:text-blue-600 transition-colors">İletişim</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/30 pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-700/70 text-sm">
                    <p>© 2025 Tık Profil. Tüm hakları saklıdır.</p>
                    <div className="flex gap-8">
                        <a href="/gizlilik-politikasi" className="hover:text-blue-600 transition-colors">Gizlilik Politikası</a>
                        <a href="/kullanim-sartlari" className="hover:text-blue-600 transition-colors">Kullanım Şartları</a>
                        <a href="/kvkk" className="hover:text-blue-600 transition-colors">KVKK</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function MouseFollowerBackground() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        }, 16);
    };

    return (
        <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="absolute inset-0 z-0 overflow-hidden"
        >
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-300"
                style={{
                    background: `radial-gradient(1000px at ${mousePos.x}px ${mousePos.y}px, rgba(59,130,246,0.08), transparent)`
                }}
            />
            
            {/* Global Orbs - Distributed across the page with Hero's original colors */}
            <FloatingOrb className="w-96 h-96 bg-blue-400/15 top-20 -left-20" delay={0} />
            <FloatingOrb className="w-80 h-80 bg-purple-400/15 top-[600px] right-20" delay={2} />
            <FloatingOrb className="w-72 h-72 bg-pink-400/15 top-[1200px] left-1/3" delay={4} />
            <FloatingOrb className="w-96 h-96 bg-blue-400/15 top-[1800px] -right-20" delay={1} />
            <FloatingOrb className="w-64 h-64 bg-purple-400/15 top-[2400px] left-20" delay={3} />
            <FloatingOrb className="w-80 h-80 bg-pink-400/15 top-[3000px] right-1/4" delay={5} />
            <FloatingOrb className="w-[500px] h-[500px] bg-blue-400/10 bottom-0 left-1/2 -translate-x-1/2" delay={2} />
        </div>
    );
}

export function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-50 text-slate-700 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            <div className="relative z-10">
                <Navigation />
                <main>
                    <HeroSection />
                    <SolutionsSection />
                    <ProductSection />
                    <LiveDemoSection />
                    <TestimonialsSection />
                    <FAQSection />
                    <CTASection />
                </main>
                <Footer />
            </div>
        </div>
    );
}
