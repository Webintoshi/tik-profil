"use client";

import { motion } from "framer-motion";
import { Navigation, Footer } from "@/components/landing/LandingPage";

interface StaticPageLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function StaticPageLayout({ title, subtitle, children }: StaticPageLayoutProps) {
    return (
        <div className="min-h-screen bg-[#F5F0E8] text-slate-800 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden">
            <Navigation />

            {/* Hero Section */}
            <section className="pt-32 pb-16">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-4"
                    >
                        {title}
                    </motion.h1>
                    {subtitle && (
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-slate-600"
                        >
                            {subtitle}
                        </motion.p>
                    )}
                </div>
            </section>

            {/* Content */}
            <section className="pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-4xl mx-auto px-6"
                >
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100">
                        <div className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-800">
                            {children}
                        </div>
                    </div>
                </motion.div>
            </section>

            <Footer />
        </div>
    );
}
