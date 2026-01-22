"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TikLogo } from "@/components/TikLogo";

const BUSINESS_NAMES = ["EZMEO", "OKUR OTOMASYON", "DERYCRAFT", "ALAZ RESTORAN"];

export function HeroHardware() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % BUSINESS_NAMES.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-[92vw] max-w-[440px] md:max-w-none md:w-full h-[320px] md:h-[400px] flex items-center justify-center perspective-[1200px]">

            {/* --- 1. QR STAND (Frosted Glass Block) --- */}
            {/* Positioned slightly behind and offset */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 50, rotateY: -15 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="absolute z-0 w-48 h-56 rounded-xl border border-white/40 bg-white/10 backdrop-blur-md shadow-xl flex items-center justify-center"
                style={{
                    transformStyle: "preserve-3d",
                    transform: "translateZ(-50px) rotateY(-10deg) rotateX(5deg)",
                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.2)"
                }}
            >
                {/* Engraved QR Code Sim (Abstract Grid) */}
                <div className="w-32 h-32 bg-white/20 rounded-lg grid grid-cols-4 gap-1 p-2 opacity-50">
                    {[...Array(16)].map((_, i) => (
                        <div key={i} className={`rounded-sm bg-white ${i % 3 === 0 ? 'opacity-0' : 'opacity-80'}`} />
                    ))}
                </div>

                {/* Glass Reflections */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-xl pointer-events-none" />
            </motion.div>

            {/* --- 2. NFC CARD (Matte Black Premium) --- */}
            <motion.div
                initial={{ y: 20, opacity: 0, rotateX: 10 }}
                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full md:w-96 aspect-[1.586] rounded-2xl bg-[#0f0f11] overflow-hidden group"
                style={{
                    boxShadow: "0 20px 60px -15px rgba(0,113,227,0.3), 0 0 0 1px rgba(255,255,255,0.05)", // Updated Softer Blue Shadow
                    transformStyle: "preserve-3d",
                }}
            >
                {/* Floating Animation Wrapper */}
                <motion.div
                    animate={{
                        y: [-10, 10, -10],
                        rotateY: [-5, 5, -5]
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-full h-full relative p-8 flex flex-col justify-between"
                >
                    {/* Card Noise/Texture */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />

                    {/* Sheen/Glare Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                    {/* Top Row: NFC Icon Only (Sleek Tech) */}
                    <div className="flex justify-end items-start w-full">
                        {/* Contactless Ripple Symbol */}
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping opacity-20 bg-white rounded-full" />
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" className="opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                                <path d="M8.5 14.5A2.5 2.5 0 0 1 11 12" />
                                <path d="M12 15.5A4.5 4.5 0 0 1 15 11" />
                                <path d="M15.5 16.5A6.5 6.5 0 0 1 20 10" />
                            </svg>
                        </div>
                    </div>

                    {/* Center: Logo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                            {/* Blue Glow behind Logo */}
                            <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full" />
                            <TikLogo className="w-20 h-20 relative z-10" variant="dark" />
                        </div>
                    </div>

                    {/* Bottom Row: Name & Label */}
                    <div className="flex justify-between items-end text-white/90">
                        <div className="space-y-1 w-full">
                            <p className="text-[10px] uppercase tracking-widest text-white/50">Business Card</p>
                            <div className="h-6 relative overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-sm font-medium tracking-wide absolute top-0 left-0"
                                    >
                                        {BUSINESS_NAMES[index]}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* --- Ambient Scene Floor Shadow (Optional) --- */}
            <div className="absolute -bottom-16 w-64 h-4 bg-black/20 blur-3xl rounded-full" />

        </div>
    );
}
