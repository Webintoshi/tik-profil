"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
    QrCode, Truck, Calendar, CreditCard, BarChart3, Smartphone,
    Sparkles, ArrowUpRight, Zap
} from "lucide-react";

const features = [
    {
        icon: QrCode,
        title: "QR Menü",
        description: "Akıllı QR kod ile dijital menü deneyimi. Anında güncelleme, sıfır maliyet.",
        color: "violet",
        gradient: "from-violet-500 to-purple-600",
        glow: "rgba(139,92,246,0.4)",
    },
    {
        icon: Truck,
        title: "Kurye Takip",
        description: "Canlı konum takibi ile müşteri memnuniyetini artırın.",
        color: "cyan",
        gradient: "from-cyan-500 to-blue-600",
        glow: "rgba(6,182,212,0.4)",
    },
    {
        icon: Calendar,
        title: "Randevu",
        description: "7/24 online randevu. Otomatik SMS hatırlatma.",
        color: "pink",
        gradient: "from-pink-500 to-rose-600",
        glow: "rgba(236,72,153,0.4)",
    },
    {
        icon: CreditCard,
        title: "Ödeme",
        description: "Güvenli online ödeme altyapısı. Anında tahsilat.",
        color: "emerald",
        gradient: "from-emerald-500 to-green-600",
        glow: "rgba(16,185,129,0.4)",
    },
    {
        icon: BarChart3,
        title: "Analitik",
        description: "Detaylı raporlar, trend analizleri, gelir takibi.",
        color: "orange",
        gradient: "from-orange-500 to-amber-600",
        glow: "rgba(249,115,22,0.4)",
    },
    {
        icon: Smartphone,
        title: "Mobil",
        description: "Tam responsive. Her cihazda mükemmel deneyim.",
        color: "blue",
        gradient: "from-blue-500 to-indigo-600",
        glow: "rgba(59,130,246,0.4)",
    },
];

export function FeatureGrid() {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, margin: "-100px" });

    return (
        <section
            ref={containerRef}
            id="features"
            className="relative py-32 overflow-hidden bg-[#030014]"
        >
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_60%)]" />

            {/* Animated grid lines */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                    maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
                }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.1) 100%)',
                            border: '1px solid rgba(139,92,246,0.2)',
                        }}
                    >
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-violet-300">Güçlü Özellikler</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
                    >
                        <span className="text-white">Her şey </span>
                        <span
                            className="bg-clip-text text-transparent"
                            style={{
                                backgroundImage: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)',
                            }}
                        >
                            tek yerde
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-gray-400 max-w-2xl mx-auto"
                    >
                        İşletmenizi dijitalleştirmek için ihtiyacınız olan tüm araçlar
                    </motion.p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} feature={feature} index={index} isInView={isInView} />
                    ))}
                </div>

                {/* Bottom decoration */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="mt-20 text-center"
                >
                    <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.08) 100%)',
                            border: '1px solid rgba(139,92,246,0.15)',
                        }}
                    >
                        <Sparkles className="w-5 h-5 text-violet-400" />
                        <span className="text-gray-300 font-medium">Ve daha birçok özellik...</span>
                        <ArrowUpRight className="w-5 h-5 text-cyan-400" />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function FeatureCard({ feature, index, isInView }: { feature: typeof features[0]; index: number; isInView: boolean }) {
    const [isHovered, setIsHovered] = useState(false);
    const Icon = feature.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 * index }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative"
        >
            {/* Glow effect on hover */}
            <motion.div
                className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                style={{ background: feature.glow }}
            />

            <div
                className="relative p-8 rounded-3xl h-full overflow-hidden transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isHovered ? `0 20px 60px ${feature.glow}` : 'none',
                }}
            >
                {/* Background gradient on hover */}
                <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />

                {/* Animated border gradient */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                        background: `linear-gradient(135deg, ${feature.glow}, transparent)`,
                        padding: '1px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                    }}
                />

                {/* Content */}
                <div className="relative z-10">
                    {/* Icon with glow */}
                    <motion.div
                        animate={{ rotate: isHovered ? 5 : 0, scale: isHovered ? 1.1 : 1 }}
                        transition={{ duration: 0.3 }}
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-6`}
                        style={{ boxShadow: `0 10px 30px ${feature.glow}` }}
                    >
                        <Icon className="w-7 h-7" />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-white transition-colors">
                        {feature.title}
                    </h3>

                    <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                        {feature.description}
                    </p>

                    {/* Learn more arrow */}
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                        className="mt-6 flex items-center gap-2 text-sm font-medium"
                        style={{ color: feature.glow.replace('0.4', '1') }}
                    >
                        <span>Keşfet</span>
                        <ArrowUpRight className="w-4 h-4" />
                    </motion.div>
                </div>

                {/* Corner decoration */}
                <div
                    className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-2xl"
                    style={{ background: feature.glow }}
                />
            </div>
        </motion.div>
    );
}
