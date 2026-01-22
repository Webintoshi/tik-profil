"use client";

import { motion } from "framer-motion";
import { Laptop, Coffee, Heart, Zap, ArrowRight, MapPin, Clock } from "lucide-react";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";

export default function CareerPage() {
    const benefits = [
        {
            icon: Laptop,
            title: "Uzaktan Çalışma",
            desc: "Dünyanın neresinde olduğun önemli değil. İşini iyi yaptığın sürece özgürsün."
        },
        {
            icon: Clock,
            title: "Esnek Saatler",
            desc: "Sabah kuşu musun yoksa gece baykuşu mu? Kendi çalışma düzenini kendin belirle."
        },
        {
            icon: Coffee,
            title: "Sürekli Gelişim",
            desc: "Online eğitimler, konferanslar ve kitaplar için sınırsız öğrenme bütçesi."
        },
        {
            icon: Heart,
            title: "Özel Sağlık",
            desc: "Senin ve ailenin sağlığı bizim için önemli. Kapsamlı sağlık sigortası desteği."
        }
    ];

    const positions = [
        {
            title: "Senior Frontend Developer",
            department: "Engineering",
            location: "Uzaktan",
            type: "Tam Zamanlı"
        },
        {
            title: "UI/UX Designer",
            department: "Design",
            location: "İstanbul / Hibrit",
            type: "Tam Zamanlı"
        },
        {
            title: "Digital Marketing Specialist",
            department: "Marketing",
            location: "Uzaktan",
            type: "Tam Zamanlı"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-50 text-slate-700 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navigation />
                
                <main className="flex-grow pt-32 pb-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Header Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-20"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/40 mb-6">
                                <span className="text-sm font-medium text-blue-700">Kariyer Fırsatları</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800">
                                Geleceği Birlikte <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
                                    İnşa Edelim
                                </span>
                            </h1>
                            <p className="text-xl text-slate-700/80 max-w-2xl mx-auto leading-relaxed">
                                Tık Profil'de biz sadece kod yazmıyoruz, işletmelerin dijital dönüşümüne öncülük ediyoruz. Ekibimize katıl ve fark yarat.
                            </p>
                        </motion.div>

                        {/* Benefits Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
                            {benefits.map((benefit, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className="p-8 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 hover:border-white/60 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <benefit.icon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">{benefit.title}</h3>
                                    <p className="text-sm text-slate-600/90 leading-relaxed">
                                        {benefit.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Open Positions */}
                        <div className="max-w-4xl mx-auto">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-center mb-10"
                            >
                                <h2 className="text-3xl font-bold text-slate-800 mb-4">Açık Pozisyonlar</h2>
                                <p className="text-slate-600">
                                    Yetenekli takım arkadaşları arıyoruz.
                                </p>
                            </motion.div>

                            <div className="space-y-4">
                                {positions.map((pos, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="group p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 hover:border-blue-300/50 transition-all flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:shadow-lg hover:shadow-blue-500/5"
                                    >
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                                                {pos.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Zap className="w-4 h-4" />
                                                    {pos.department}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {pos.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {pos.type}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors">
                                            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div 
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4 }}
                                className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center"
                            >
                                <h3 className="text-2xl font-bold mb-2">Aradığın pozisyonu bulamadın mı?</h3>
                                <p className="text-blue-100 mb-6 max-w-lg mx-auto">
                                    Yine de tanışmak isteriz! Genel başvuru yaparak CV'ni bize ilet, uygun bir pozisyon açıldığında ilk sana haber verelim.
                                </p>
                                <button className="px-8 py-3 rounded-xl bg-white text-blue-600 font-bold hover:bg-blue-50 transition-colors shadow-lg shadow-blue-900/20">
                                    Genel Başvuru Yap
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
