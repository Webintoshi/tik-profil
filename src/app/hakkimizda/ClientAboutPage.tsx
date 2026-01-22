"use client";

import { motion } from "framer-motion";
import { Shield, Target, Users, Zap, Award, Globe } from "lucide-react";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";

export default function AboutPage() {
    const values = [
        {
            icon: Shield,
            title: "Güvenilirlik",
            desc: "Veri güvenliği ve şeffaflık, işimizin temelidir. Kullanıcılarımızın bilgileri bizim için kutsaldır."
        },
        {
            icon: Target,
            title: "İnovasyon",
            desc: "Sürekli gelişen dijital dünyada, en yeni teknolojileri kullanıcılarımıza sunmak için çalışıyoruz."
        },
        {
            icon: Users,
            title: "Kullanıcı Odaklılık",
            desc: "Her özelliğimizi, kullanıcılarımızın hayatını kolaylaştırmak ve işlerini büyütmek için tasarlıyoruz."
        }
    ];

    const stats = [
        { label: "Aktif Kullanıcı", value: "10K+" },
        { label: "İşletme", value: "500+" },
        { label: "Ülke", value: "5+" },
        { label: "Mutlu Müşteri", value: "%99" }
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
                                <span className="text-sm font-medium text-blue-700">Hikayemiz</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800">
                                Dijital Kimliğinizi <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
                                    Geleceğe Taşıyoruz
                                </span>
                            </h1>
                            <p className="text-xl text-slate-700/80 max-w-3xl mx-auto leading-relaxed">
                                Tık Profil, işletmelerin ve profesyonellerin dijital dünyada var olmalarını sağlayan, yeni nesil bir kimlik yönetim platformudur.
                            </p>
                        </motion.div>

                        {/* Mission / Vision Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                            <motion.div 
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-8 md:p-12 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm relative overflow-hidden group hover:border-white/60 transition-all duration-500"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-100/50 flex items-center justify-center mb-6">
                                        <Zap className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Misyonumuz</h2>
                                    <p className="text-slate-600/90 leading-relaxed text-lg">
                                        Her ölçekten işletmenin, kodlama bilgisine ihtiyaç duymadan profesyonel, etkileyici ve işlevsel bir dijital varlık oluşturmasını sağlamak. Karmaşık teknolojileri basitleştirerek herkes için erişilebilir kılıyoruz.
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="p-8 md:p-12 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm relative overflow-hidden group hover:border-white/60 transition-all duration-500"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-100/50 flex items-center justify-center mb-6">
                                        <Globe className="w-7 h-7 text-purple-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Vizyonumuz</h2>
                                    <p className="text-slate-600/90 leading-relaxed text-lg">
                                        Dijital kimlik kartı ve link-in-bio çözümlerinde global bir standart olmak. Fiziksel kartvizitlerin tamamen yerini alarak, daha sürdürülebilir ve bağlantılı bir iş dünyası yaratmak.
                                    </p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Stats Section */}
                        <div className="mb-20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                                {stats.map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="p-6 rounded-2xl bg-white/30 backdrop-blur-md border border-white/30 text-center"
                                    >
                                        <div className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">{stat.value}</div>
                                        <div className="text-sm md:text-base text-slate-600 font-medium">{stat.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Values Section */}
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">Değerlerimiz</h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                Bizi biz yapan ve her kararımızda bize yol gösteren prensiplerimiz.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {values.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className="p-8 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 hover:border-white/60 transition-all text-center group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white/60 mx-auto flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <item.icon className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
                                    <p className="text-slate-600/90 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
