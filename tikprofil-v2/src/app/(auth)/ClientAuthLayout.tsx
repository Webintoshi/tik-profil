"use client";

import { Toaster } from "sonner";
import { QRWorldAnimation } from "@/components/landing/QRWorldAnimation";
import { useRef, useState } from "react";

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

export default function ClientAuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
        <>
            {/* Toast notifications - Light theme */}
            <Toaster
                position="top-center"
                richColors
                closeButton
                theme="light"
            />

            {/* Modern Gradient Layout (Unified with Landing Page) */}
            <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                className="min-h-screen flex bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50/40 font-sans relative overflow-hidden text-slate-600 selection:bg-cyan-100 selection:text-cyan-800"
            >
                {/* Interactive Mouse Gradient */}
                <div
                    className="absolute inset-0 pointer-events-none transition-all duration-300"
                    style={{
                        background: `radial-gradient(1000px at ${mousePos.x}px ${mousePos.y}px, rgba(14, 165, 233, 0.05), transparent)`
                    }}
                />
                
                {/* Background Orbs (Exact match from HeroSection) */}
                <FloatingOrb className="w-96 h-96 bg-sky-400/20 top-20 -left-20 !blur-[120px]" delay={0} />
                <FloatingOrb className="w-80 h-80 bg-blue-400/20 top-40 right-20 !blur-[120px]" delay={2} />
                <FloatingOrb className="w-72 h-72 bg-cyan-400/20 bottom-20 left-1/3 !blur-[120px]" delay={4} />

                {/* Left: Visual Side (Hidden on mobile) */}
                <div className="hidden lg:flex lg:w-[50%] flex-col justify-center items-center px-12 py-12 relative z-10">
                    {/* Content Stack */}
                    <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-lg">

                        {/* Visual - Animation with Glass Effect */}
                        <div className="w-full flex justify-center py-4">
                            <div className="relative w-full h-[400px]">
                                <div className="absolute inset-0 rounded-3xl backdrop-blur-[40px] border border-sky-100/50 shadow-[0_20px_50px_rgba(14,165,233,0.15)]"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(240,249,255,0.4) 0%, rgba(224,242,254,0.1) 100%)',
                                        boxShadow: '0 25px 50px -12px rgba(14, 165, 233, 0.15), 0 0 0 1px rgba(224, 242, 254, 0.3)'
                                    }}
                                >
                                    <QRWorldAnimation />
                                </div>
                            </div>
                        </div>

                        {/* Text */}
                        <div className="text-center">
                            <h2 className="text-3xl font-bold text-blue-950 mb-4 tracking-tight">
                                İşletmenizin Dijital Kimliği
                            </h2>
                            <p className="text-lg text-slate-500 leading-relaxed">
                                Tek dokunuşla müşterilerinizle bağ kurun. Menü, randevu ve sosyal medya hesaplarınız tek bir kartta.
                            </p>
                        </div>

                        {/* Social Proof */}
                        <div className="flex flex-col items-center gap-3 mt-4">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden shadow-sm">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                                2,500+ Mutlu İşletme
                            </p>
                        </div>

                    </div>
                </div>

                {/* Right: Form Side */}
                <div className="flex-1 flex flex-col justify-center items-center min-h-screen p-6 lg:p-12 relative z-10">
                    <div className="w-full max-w-[440px] bg-sky-50/60 backdrop-blur-[40px] p-8 rounded-3xl border border-sky-100/50 shadow-[0_20px_60px_-15px_rgba(14,165,233,0.15)]">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
