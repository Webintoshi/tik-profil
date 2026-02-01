"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Play, Zap } from "lucide-react";

export function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

    // Mouse tracking for 3D tilt effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 100, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 100, damping: 30 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            mouseX.set((clientX / innerWidth) - 0.5);
            mouseY.set((clientY / innerHeight) - 0.5);
            setMousePosition({ x: clientX, y: clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <section
            ref={containerRef}
            className="relative min-h-[120vh] flex items-center justify-center overflow-hidden bg-[#030014]"
        >
            {/* Animated Gradient Mesh Background */}
            <div className="absolute inset-0">
                {/* Deep space gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-[#0a0020] to-[#030014]" />

                {/* Animated aurora effect */}
                <motion.div
                    className="absolute inset-0"
                    animate={{
                        background: [
                            'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(120,0,255,0.15), transparent)',
                            'radial-gradient(ellipse 80% 50% at 80% 60%, rgba(0,150,255,0.15), transparent)',
                            'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(200,0,200,0.12), transparent)',
                            'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(120,0,255,0.15), transparent)',
                        ]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Floating orbs with glow */}
                <motion.div
                    className="absolute w-[800px] h-[800px] rounded-full"
                    style={{
                        left: '10%',
                        top: '20%',
                        background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                    animate={{
                        x: [0, 100, 50, 0],
                        y: [0, -50, 100, 0],
                        scale: [1, 1.3, 0.8, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />

                <motion.div
                    className="absolute w-[600px] h-[600px] rounded-full"
                    style={{
                        right: '5%',
                        bottom: '10%',
                        background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(6,182,212,0.15) 40%, transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                    animate={{
                        x: [0, -80, -40, 0],
                        y: [0, 80, -60, 0],
                        scale: [1, 0.9, 1.2, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                />

                <motion.div
                    className="absolute w-[500px] h-[500px] rounded-full"
                    style={{
                        left: '50%',
                        top: '60%',
                        background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 60%)',
                        filter: 'blur(80px)',
                    }}
                    animate={{
                        x: [0, 60, -60, 0],
                        y: [0, -80, 40, 0],
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Cursor-following spotlight */}
                <motion.div
                    className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 50%)',
                        x: mousePosition.x - 300,
                        y: mousePosition.y - 300,
                    }}
                />

                {/* Animated grid */}
                <div className="absolute inset-0 opacity-20">
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `
                                linear-gradient(rgba(139,92,246,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(139,92,246,0.1) 1px, transparent 1px)
                            `,
                            backgroundSize: '100px 100px',
                            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)'
                        }}
                    />
                </div>

                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white/30 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -200],
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: 5 + Math.random() * 5,
                                repeat: Infinity,
                                delay: Math.random() * 5,
                                ease: "linear",
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <motion.div
                className="relative z-10 max-w-6xl mx-auto px-6 py-32"
                style={{ opacity, scale, y }}
            >
                <div className="text-center">
                    {/* Announcement Badge with glow */}
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-10"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.15) 100%)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            boxShadow: '0 0 40px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}
                    >
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="w-4 h-4 text-violet-400" />
                        </motion.div>
                        <span className="text-sm font-medium text-violet-300">
                            2025'in en gelişmiş işletme platformu
                        </span>
                        <Zap className="w-4 h-4 text-cyan-400" />
                    </motion.div>

                    {/* Main Headline with 3D effect */}
                    <motion.div
                        style={{ rotateX, rotateY, transformPerspective: 1000 }}
                        className="mb-8"
                    >
                        <motion.h1
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.9]"
                        >
                            <span className="text-white">İşletmenizi</span>
                            <br />
                            <span
                                className="bg-clip-text text-transparent relative"
                                style={{
                                    backgroundImage: 'linear-gradient(135deg, #a855f7 0%, #6366f1 25%, #06b6d4 50%, #8b5cf6 75%, #ec4899 100%)',
                                    backgroundSize: '200% 200%',
                                    animation: 'gradient-shift 5s ease infinite',
                                }}
                            >
                                Dönüştürün
                                {/* Glow effect */}
                                <span
                                    className="absolute inset-0 blur-2xl opacity-50 bg-clip-text text-transparent"
                                    style={{
                                        backgroundImage: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%)',
                                    }}
                                    aria-hidden
                                >
                                    Dönüştürün
                                </span>
                            </span>
                        </motion.h1>
                    </motion.div>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium"
                    >
                        Dijital menü • Online sipariş • Randevu sistemi • Kurye takibi
                        <br />
                        <span className="text-white/80">Tek platform. Sonsuz olasılık.</span>
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        {/* Primary CTA - Morphing button */}
                        <Link href="/kayit-ol">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="group relative px-10 py-5 rounded-2xl font-bold text-white text-lg overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #06b6d4 100%)',
                                    boxShadow: '0 0 60px rgba(139,92,246,0.5), 0 20px 40px -20px rgba(99,102,241,0.5)'
                                }}
                            >
                                {/* Animated border */}
                                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 via-cyan-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ padding: '2px', backgroundSize: '200% 100%', animation: 'border-flow 2s linear infinite' }} />

                                <span className="relative flex items-center gap-3">
                                    Ücretsiz Başla
                                    <motion.span
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </motion.span>
                                </span>
                            </motion.button>
                        </Link>

                        {/* Secondary CTA */}
                        <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            className="group flex items-center gap-3 px-8 py-5 rounded-2xl font-medium text-white/80 border border-white/10 backdrop-blur-sm transition-all"
                        >
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                            </div>
                            <span>Demo İzle</span>
                        </motion.button>
                    </motion.div>

                    {/* Stats Row */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="mt-20 flex flex-wrap items-center justify-center gap-8 md:gap-16"
                    >
                        {[
                            { value: "500+", label: "Aktif İşletme" },
                            { value: "1.2M+", label: "Aylık İşlem" },
                            { value: "4.9", label: "Kullanıcı Puanı", icon: "⭐" },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="text-center p-4 rounded-2xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
                                }}
                            >
                                <div className="text-3xl md:text-4xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                                    {stat.icon && <span>{stat.icon}</span>}
                                    {stat.value}
                                </div>
                                <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2"
                >
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex flex-col items-center gap-2 text-gray-500"
                    >
                        <span className="text-xs uppercase tracking-wider">Kaydır</span>
                        <div className="w-5 h-8 rounded-full border border-gray-600 flex items-start justify-center p-1">
                            <motion.div
                                animate={{ y: [0, 12, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-1.5 h-1.5 rounded-full bg-violet-500"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* CSS for gradient animation */}
            <style jsx global>{`
                @keyframes gradient-shift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes border-flow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
            `}</style>
        </section>
    );
}
