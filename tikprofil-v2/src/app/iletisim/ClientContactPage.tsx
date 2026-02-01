"use client";

import { motion } from "framer-motion";
import { Mail, MapPin, Phone, MessageCircle, Send } from "lucide-react";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";

export default function ContactPage() {
    const contactInfo = [
        {
            icon: Mail,
            title: "E-posta",
            value: "merhaba@tikprofil.com",
            desc: "7/24 bize yazabilirsiniz."
        },
        {
            icon: Phone,
            title: "Telefon",
            value: "+90 (850) 123 45 67",
            desc: "Hafta içi 09:00 - 18:00"
        },
        {
            icon: MapPin,
            title: "Ofis",
            value: "Maslak, İstanbul",
            desc: "Kolektif House Levent"
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
                            className="text-center mb-16"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/40 mb-6">
                                <span className="text-sm font-medium text-blue-700">İletişim</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800">
                                Size Nasıl Yardımcı <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
                                    Olabiliriz?
                                </span>
                            </h1>
                            <p className="text-xl text-slate-700/80 max-w-2xl mx-auto">
                                Sorularınız, önerileriniz veya iş birlikleri için bize dilediğiniz zaman ulaşabilirsiniz.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                            {/* Contact Info Cards */}
                            <div className="space-y-6 lg:col-span-1">
                                {contactInfo.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ x: 5 }}
                                        className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/40 hover:border-white/60 transition-all group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <item.icon className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                                                <div className="text-lg font-medium text-blue-600 mb-1">{item.value}</div>
                                                <div className="text-sm text-slate-500">{item.desc}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 text-white relative overflow-hidden"
                                >
                                    <div className="relative z-10">
                                        <MessageCircle className="w-8 h-8 mb-4 opacity-80" />
                                        <h3 className="text-xl font-bold mb-2">Canlı Destek</h3>
                                        <p className="text-blue-100 mb-6 text-sm">
                                            Hemen şimdi bir müşteri temsilcimizle görüşmek ister misiniz?
                                        </p>
                                        <button className="w-full py-3 rounded-xl bg-white text-blue-600 font-bold text-sm hover:bg-blue-50 transition-colors">
                                            Sohbeti Başlat
                                        </button>
                                    </div>
                                    {/* Decorative circles */}
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                    <div className="absolute top-10 -right-10 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                                </motion.div>
                            </div>

                            {/* Contact Form */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="lg:col-span-2"
                            >
                                <div className="p-8 md:p-10 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm">
                                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Mesaj Gönderin</h2>
                                    <form className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Adınız Soyadınız</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400"
                                                    placeholder="Adınız Soyadınız"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">E-posta Adresiniz</label>
                                                <input 
                                                    type="email" 
                                                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400"
                                                    placeholder="ornek@sirket.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Konu</label>
                                            <select className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-600">
                                                <option>Genel Bilgi</option>
                                                <option>Teknik Destek</option>
                                                <option>Satış ve İş Birliği</option>
                                                <option>Diğer</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Mesajınız</label>
                                            <textarea 
                                                rows={5}
                                                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-slate-400 resize-none"
                                                placeholder="Mesajınızı buraya yazın..."
                                            />
                                        </div>

                                        <button className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 bg-gradient-to-r from-blue-600 to-blue-700">
                                            <Send className="w-5 h-5" />
                                            Mesajı Gönder
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
