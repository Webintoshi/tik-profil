"use client";

import { motion, useInView } from "framer-motion";
import { Star, Quote, ArrowRight } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";

const testimonials = [
    {
        quote: "Eskiden menü bastırmakla uğraşırdık. Şimdi fiyatı değiştiriyorum, anında masada. Müthiş!",
        author: "Murat Ş.",
        role: "Restoran Sahibi",
        location: "İstanbul",
        gradient: "from-violet-500 to-purple-500",
    },
    {
        quote: "Randevu kaçırma derdi bitti. Müşteriler online randevu alıyor, sistem otomatik hatırlatıyor.",
        author: "Ayşe K.",
        role: "Güzellik Salonu",
        location: "Ankara",
        gradient: "from-pink-500 to-rose-500",
    },
    {
        quote: "Kurye takip sistemi müşteri şikayetlerini %80 azalttı. Herkes siparişini canlı izleyebiliyor.",
        author: "Kemal D.",
        role: "Cafe Sahibi",
        location: "İzmir",
        gradient: "from-cyan-500 to-blue-500",
    },
];

const stats = [
    { value: 500, suffix: "+", label: "Aktif İşletme", color: "violet" },
    { value: 1.2, suffix: "M+", label: "Aylık İşlem", decimals: 1, color: "cyan" },
    { value: 40, suffix: "%", label: "Ciro Artışı", color: "emerald" },
];

export function SocialProof() {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, margin: "-100px" });

    return (
        <section
            ref={containerRef}
            id="social-proof"
            className="relative py-32 overflow-hidden bg-[#030014]"
        >
            {/* Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.05),transparent_60%)]" />

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                    {stats.map((stat, index) => (
                        <StatCard key={index} stat={stat} index={index} isInView={isInView} />
                    ))}
                </div>

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
                        <span className="text-white">Onlar </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            ne diyor?
                        </span>
                    </h2>
                </motion.div>

                {/* Testimonials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <TestimonialCard key={index} testimonial={testimonial} index={index} isInView={isInView} />
                    ))}
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.8 }}
                    className="mt-24 text-center"
                >
                    <Link href="/kayit-ol">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg text-white"
                            style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                                boxShadow: '0 0 60px rgba(139,92,246,0.4), 0 20px 40px -20px rgba(6,182,212,0.4)'
                            }}
                        >
                            Siz de Katılın
                            <motion.span
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <ArrowRight className="w-5 h-5" />
                            </motion.span>
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

function StatCard({ stat, index, isInView }: any) {
    const ref = useRef(null);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (isInView) {
            const duration = 2000;
            const steps = 60;
            const increment = stat.value / steps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= stat.value) {
                    setCount(stat.value);
                    clearInterval(timer);
                } else {
                    setCount(Math.floor(current * 10) / 10);
                }
            }, duration / steps);

            return () => clearInterval(timer);
        }
    }, [isInView, stat.value]);

    const displayValue = stat.decimals ? count.toFixed(stat.decimals) : Math.floor(count);

    const colors: Record<string, { gradient: string; glow: string }> = {
        violet: { gradient: "from-violet-500 to-purple-500", glow: "rgba(139,92,246,0.3)" },
        cyan: { gradient: "from-cyan-500 to-blue-500", glow: "rgba(6,182,212,0.3)" },
        emerald: { gradient: "from-emerald-500 to-green-500", glow: "rgba(16,185,129,0.3)" },
    };

    const color = colors[stat.color];

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.1 }}
            className="relative group"
        >
            {/* Glow */}
            <motion.div
                className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
                style={{ background: color.glow }}
            />

            <div
                className="relative text-center p-8 rounded-3xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <motion.div
                    className={`text-6xl md:text-7xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r ${color.gradient}`}
                >
                    {displayValue}{stat.suffix}
                </motion.div>
                <div className="text-gray-500 font-medium">{stat.label}</div>
            </div>
        </motion.div>
    );
}

function TestimonialCard({ testimonial, index, isInView }: any) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 + index * 0.1 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative group"
        >
            {/* Glow */}
            <motion.div
                className={`absolute -inset-1 rounded-3xl bg-gradient-to-r ${testimonial.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
            />

            <div
                className="relative p-8 rounded-3xl h-full"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                {/* Quote Icon */}
                <div className={`absolute top-6 right-6 w-10 h-10 rounded-xl bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white shadow-lg`}>
                    <Quote className="w-5 h-5" />
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                    ))}
                </div>

                {/* Quote */}
                <p className="text-lg text-gray-300 leading-relaxed mb-8">
                    "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {testimonial.author[0]}
                    </div>
                    <div>
                        <div className="font-semibold text-white">{testimonial.author}</div>
                        <div className="text-sm text-gray-500">
                            {testimonial.role} • {testimonial.location}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
