"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Check, X, ArrowRight, Sparkles, Zap, Crown, Shield } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

const plans = [
    {
        id: "starter",
        name: "Starter",
        description: "Küçük işletmeler için",
        monthlyPrice: 0,
        annualPrice: 0,
        icon: Zap,
        gradient: "from-blue-500 to-cyan-500",
        glow: "rgba(59,130,246,0.3)",
        features: ["Dijital Profil", "Temel QR Kod", "Sınırlı Analitik"],
        excluded: ["Online Sipariş", "Randevu Sistemi", "Özel Domain"],
        cta: "Ücretsiz Başla",
    },
    {
        id: "pro",
        name: "Professional",
        description: "Büyüyen işletmeler için",
        monthlyPrice: 499,
        annualPrice: 399,
        icon: Crown,
        gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
        glow: "rgba(139,92,246,0.5)",
        features: [
            "Başlangıç'taki her şey",
            "Online Menü & Sipariş",
            "Randevu Yönetimi",
            "Gelişmiş Analitik",
            "Kurye Takip Sistemi",
            "7/24 Öncelikli Destek"
        ],
        cta: "Pro'ya Geç",
        popular: true,
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "Zincirler ve kurumsal",
        monthlyPrice: null,
        annualPrice: null,
        icon: Shield,
        gradient: "from-gray-500 to-gray-700",
        glow: "rgba(255,255,255,0.1)",
        features: [
            "Sınırsız Şube",
            "Özel API",
            "Dedicated Destek",
            "White Label",
            "Kurumsal Fatura"
        ],
        cta: "İletişime Geç",
    },
];

export function Pricing() {
    const [isAnnual, setIsAnnual] = useState(true);
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, margin: "-100px" });

    return (
        <section
            ref={containerRef}
            id="pricing"
            className="relative py-32 overflow-hidden bg-[#030014]"
        >
            {/* Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.08),transparent_60%)]" />

            <div className="relative z-10 max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                        style={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.1) 100%)',
                            border: '1px solid rgba(16,185,129,0.2)',
                        }}
                    >
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-300">Şeffaf Fiyatlandırma</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
                    >
                        <span className="text-white">Planınızı </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                            seçin
                        </span>
                    </motion.h2>

                    {/* Toggle */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.2 }}
                        className="mt-10 inline-flex items-center p-1.5 rounded-full"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={clsx(
                                "px-6 py-2.5 rounded-full text-sm font-semibold transition-all",
                                !isAnnual ? "bg-white/10 text-white" : "text-gray-500"
                            )}
                        >
                            Aylık
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={clsx(
                                "px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
                                isAnnual ? "bg-white/10 text-white" : "text-gray-500"
                            )}
                        >
                            Yıllık
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                                -20%
                            </span>
                        </button>
                    </motion.div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    {plans.map((plan, index) => (
                        <PricingCard
                            key={plan.id}
                            plan={plan}
                            isAnnual={isAnnual}
                            index={index}
                            isInView={isInView}
                        />
                    ))}
                </div>

                {/* Guarantee */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.6 }}
                    className="mt-16 text-center"
                >
                    <div
                        className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.08) 100%)',
                            border: '1px solid rgba(16,185,129,0.15)',
                        }}
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                            <Shield className="w-5 h-5" />
                        </div>
                        <span className="text-gray-300 font-medium">30 Gün Para İade Garantisi</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function PricingCard({ plan, isAnnual, index, isInView }: any) {
    const Icon = plan.icon;
    const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 * index }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={clsx("relative", plan.popular && "md:-mt-4 md:mb-4")}
        >
            {/* Glow */}
            {plan.popular && (
                <motion.div
                    className="absolute -inset-2 rounded-3xl opacity-60 blur-xl"
                    style={{ background: plan.glow }}
                    animate={{ opacity: isHovered ? 0.8 : 0.4 }}
                />
            )}

            <div
                className={clsx(
                    "relative flex flex-col p-8 rounded-3xl h-full transition-all duration-300",
                    plan.popular && "border-2"
                )}
                style={{
                    background: plan.popular
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    border: plan.popular
                        ? '2px solid rgba(139,92,246,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isHovered ? `0 20px 60px ${plan.glow}` : 'none',
                }}
            >
                {/* Popular Badge */}
                {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider"
                            style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                                boxShadow: '0 4px 20px rgba(139,92,246,0.5)'
                            }}
                        >
                            ⭐ En Popüler
                        </motion.div>
                    </div>
                )}

                {/* Icon */}
                <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white mb-6`}
                    style={{ boxShadow: `0 8px 24px ${plan.glow}` }}
                >
                    <Icon className="w-6 h-6" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-gray-500 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-8">
                    {price !== null ? (
                        <div className="flex items-baseline gap-1">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={price}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-5xl font-bold text-white"
                                >
                                    {price}
                                </motion.span>
                            </AnimatePresence>
                            <span className="text-2xl font-bold text-white">₺</span>
                            <span className="text-gray-500 font-medium">/ay</span>
                        </div>
                    ) : (
                        <span className="text-3xl font-bold text-white">Özel Fiyat</span>
                    )}
                </div>

                {/* CTA */}
                <Link href={plan.id === 'enterprise' ? '/iletisim' : '/kayit-ol'}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={clsx(
                            "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                            plan.popular ? "text-white" : "text-white/80"
                        )}
                        style={plan.popular ? {
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                            boxShadow: '0 8px 30px rgba(139,92,246,0.4)'
                        } : {
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        {plan.cta}
                        {plan.popular && <ArrowRight className="w-4 h-4" />}
                    </motion.button>
                </Link>

                {/* Features */}
                <div className="mt-8 space-y-4 flex-1">
                    {plan.features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className={clsx(
                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                plan.popular
                                    ? "bg-violet-500/20 text-violet-400"
                                    : "bg-emerald-500/20 text-emerald-400"
                            )}>
                                <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className="text-gray-400">{feature}</span>
                        </div>
                    ))}
                    {plan.excluded?.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 opacity-40">
                            <div className="w-5 h-5 rounded-full bg-gray-800 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                                <X className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className="text-gray-600">{feature}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
