"use client";

import { motion } from "framer-motion";
import { Utensils, Zap, Smartphone, BookOpen, Clock, CheckCircle, ArrowRight, TrendingUp, Printer, DollarSign, ChefHat, Pizza, Coffee, Wine, QrCode } from "lucide-react";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";
import Link from "next/link";

// Floating Food Icon Component
function FloatingIcon({ icon: Icon, delay, className }: any) {
    return (
        <motion.div
            animate={{ 
                y: [0, -20, 0],
                rotate: [0, 10, -10, 0]
            }}
            transition={{ 
                duration: 5, 
                repeat: Infinity, 
                delay: delay,
                ease: "easeInOut"
            }}
            className={`absolute opacity-20 pointer-events-none ${className}`}
        >
            <Icon className="w-full h-full text-slate-400" />
        </motion.div>
    );
}

export default function ClientRestoranPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-red-50 text-slate-700 selection:bg-rose-900/20 selection:text-rose-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingIcon icon={ChefHat} delay={0} className="w-32 h-32 top-20 right-10" />
                <FloatingIcon icon={Utensils} delay={2} className="w-24 h-24 top-1/3 left-10" />
                <FloatingIcon icon={Wine} delay={1} className="w-28 h-28 bottom-1/4 right-20" />
                <FloatingIcon icon={QrCode} delay={3} className="w-40 h-40 top-40 left-1/4" />
            </div>
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navigation />
                
                <main className="flex-grow pt-32 pb-20">
                    
                    {/* 1. HERO */}
                    <div className="max-w-7xl mx-auto px-6 mb-24 text-center relative">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 border border-rose-200 mb-6 shadow-sm hover:shadow-md transition-all cursor-default">
                                <span className="w-2 h-2 rounded-full bg-[#800020] animate-pulse"></span>
                                <span className="text-sm font-bold text-[#800020] uppercase tracking-wide">Menü Baskı Maliyetine Son</span>
                            </div>
                            
                            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 tracking-tight leading-none">
                                Komisyonsuz QR Menü ve <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#800020] to-rose-800">Masadan Sipariş</span>
                            </h1>
                            
                            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
                                Fiyatlar değiştiğinde menüleri yeniden bastırmaktan yoruldunuz mu? <br />
                                <span className="text-slate-900 font-bold underline decoration-[#800020] decoration-4 underline-offset-4">QR Menü</span> ile fiyatları anında güncelle, 
                                garsonlarının yükünü hafiflet, müşterilerine modern bir deneyim sun.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/kayit-ol">
                                    <button className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[#800020] to-rose-800 text-white font-bold text-xl shadow-xl shadow-rose-900/30 hover:scale-105 hover:shadow-rose-900/50 transition-all flex items-center gap-3 group">
                                        Ücretsiz Profilini Oluştur
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <p className="text-sm text-slate-500 font-medium mt-2 sm:mt-0 px-4">
                                    %100 Ücretsiz Başlangıç
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* 2. PAIN POINTS */}
                    <div className="max-w-6xl mx-auto px-6 mb-32">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-rose-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">💸</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Baskı Maliyeti</h3>
                                <p className="text-slate-600">Her fiyat değişikliğinde, her yıpranmada menü bastırmak büyük masraf.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">🦠</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Hijyen Sorunu</h3>
                                <p className="text-slate-600">Elden ele dolaşan menüler hijyenik değil. QR menü ile temassız deneyim.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">🌍</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Dil Desteği</h3>
                                <p className="text-slate-600">Turistler için menü çevirmek zor. QR Menü otomatik olarak müşterinin dilinde açılır.</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. ÇÖZÜM */}
                    <div className="max-w-7xl mx-auto px-6 mb-32">
                        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#800020]/20 rounded-full blur-[120px]" />
                            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-800/20 rounded-full blur-[100px]" />
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                                <div>
                                    <div className="inline-block px-4 py-1 rounded-full bg-[#800020]/10 border border-[#800020]/30 text-[#800020] text-sm font-bold mb-6">
                                        RESTO MODÜLÜ
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                                        Modern Restoranın <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#800020] to-rose-500">Yeni Standardı</span>
                                    </h2>
                                    
                                    <div className="space-y-8">
                                        <StepItem 
                                            number="1" 
                                            title="Menünü Dijitalleştir" 
                                            desc="Ürünlerini, fotoğraflarını, kalorilerini ve alerjen bilgilerini gir. Menün hazır." 
                                        />
                                        <StepItem 
                                            number="2" 
                                            title="QR Kodları Masalara Yapıştır" 
                                            desc="Her masa için özel QR kod oluştur. Müşteri okuttuğunda hangi masada olduğu belli olsun." 
                                        />
                                        <StepItem 
                                            number="3" 
                                            title="Sipariş & Ödeme (Opsiyonel)" 
                                            desc="İstersen müşteriler masadan sipariş versin, istersen garson çağırsın, istersen online ödesin." 
                                        />
                                    </div>
                                </div>
                                
                                {/* Mockup */}
                                <div className="relative perspective-1000">
                                    <motion.div 
                                        initial={{ rotateY: -10, rotateX: 5 }}
                                        whileHover={{ rotateY: 0, rotateX: 0 }}
                                        transition={{ type: "spring", stiffness: 100 }}
                                        className="bg-white rounded-3xl p-6 shadow-2xl relative z-10 text-slate-800"
                                    >
                                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                                            <div className="font-bold text-lg">Lezzet Steakhouse</div>
                                            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Açık</div>
                                        </div>
                                        
                                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                                            <span className="px-4 py-2 bg-[#800020] text-white rounded-full text-sm font-bold whitespace-nowrap">Ana Yemekler</span>
                                            <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-bold whitespace-nowrap">Başlangıçlar</span>
                                            <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-bold whitespace-nowrap">İçecekler</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex gap-4 items-start">
                                                <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0"></div>
                                                <div className="flex-grow">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold">Dana Bonfile</h4>
                                                        <span className="font-bold text-[#800020]">650₺</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">Özel soslu, ızgara sebzeler ve patates püresi ile servis edilir.</p>
                                                    <button className="mt-2 text-xs bg-rose-50 text-[#800020] px-3 py-1 rounded-lg font-bold hover:bg-rose-100 transition-colors">Sepete Ekle</button>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0"></div>
                                                <div className="flex-grow">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold">Kuzu Pirzola</h4>
                                                        <span className="font-bold text-[#800020]">580₺</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">Kekik ile marine edilmiş, közlenmiş domates ve biber ile.</p>
                                                    <button className="mt-2 text-xs bg-rose-50 text-[#800020] px-3 py-1 rounded-lg font-bold hover:bg-rose-100 transition-colors">Sepete Ekle</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t flex justify-between items-center">
                                            <div className="text-xs text-slate-500">Masa: 12</div>
                                            <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Garson Çağır</button>
                                        </div>
                                    </motion.div>
                                    <div className="absolute top-4 left-4 w-full h-full bg-[#800020]/20 rounded-3xl -z-10 blur-xl" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. COMPARISON */}
                    <div className="max-w-5xl mx-auto px-6 mb-32">
                        <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Geleneksel vs Dijital</h2>
                        <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xl bg-white/50 backdrop-blur-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 text-slate-800 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-6">Özellik</th>
                                        <th className="p-6 text-[#800020] text-lg flex items-center gap-2">
                                            <Zap className="w-5 h-5 fill-current" /> Tık Profil
                                        </th>
                                        <th className="p-6 text-slate-400">Basılı Menü</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-rose-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Fiyat Güncelleme</td>
                                        <td className="p-6 font-bold text-green-600">Saniyeler İçinde (Ücretsiz)</td>
                                        <td className="p-6 text-red-500">Yeniden Baskı (Pahalı)</td>
                                    </tr>
                                    <tr className="hover:bg-rose-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Görsellik</td>
                                        <td className="p-6 font-bold text-green-600">Sınırsız Fotoğraf & Video</td>
                                        <td className="p-6 text-slate-500">Sınırlı Alan</td>
                                    </tr>
                                    <tr className="hover:bg-rose-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Çoklu Dil</td>
                                        <td className="p-6 font-bold text-green-600">Otomatik Çeviri</td>
                                        <td className="p-6 text-red-500">Yok veya Ayrı Menü</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5. TESTIMONIAL */}
                    <div className="max-w-4xl mx-auto px-6 mb-32">
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="bg-gradient-to-br from-[#800020] to-rose-900 rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10">
                                <div className="text-6xl mb-6 opacity-50 font-serif">❝</div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-8 leading-relaxed italic">
                                    "Menü fiyatlarını değiştirmek artık kâbus değil. Eskiden matbaacı beklerdik, şimdi telefonumdan 10 saniyede hallediyorum. Müşteriler fotoğraflı menüye bayılıyor."
                                </h3>
                                <div className="flex items-center justify-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl border-2 border-white/30">A</div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Ahmet Bey</div>
                                        <div className="text-rose-100 text-sm">Deniz Restoran - İşletme Sahibi</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* 6. CTA */}
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <h2 className="text-4xl font-bold text-slate-800 mb-6">
                            Menünü Dijitalleştir
                        </h2>
                        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                            Tık Profil ile restoranını dijital çağa taşı. QR Menü, sipariş sistemi ve daha fazlası tek platformda.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/kayit-ol">
                                <button className="px-12 py-5 rounded-2xl bg-slate-900 text-white font-bold text-xl shadow-xl hover:bg-black transition-all hover:-translate-y-1 flex items-center gap-3">
                                    Profilini Oluştur
                                    <ArrowRight className="w-6 h-6" />
                                </button>
                            </Link>
                            <p className="text-sm text-slate-500 font-medium mt-2 sm:mt-0 px-4">
                                %100 Ücretsiz Başlangıç
                            </p>
                        </div>
                    </div>

                </main>

                <Footer />
            </div>
        </div>
    );
}

function StepItem({ number, title, desc }: any) {
    return (
        <div className="flex gap-6 group">
            <div className="w-12 h-12 rounded-2xl bg-[#800020] flex items-center justify-center shrink-0 font-bold shadow-lg group-hover:scale-110 transition-transform">{number}</div>
            <div>
                <h4 className="text-xl font-bold mb-2 group-hover:text-rose-300 transition-colors">{title}</h4>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
