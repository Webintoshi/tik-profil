"use client";

import { motion } from "framer-motion";
import { ShoppingBag, Instagram, CreditCard, Truck, ArrowRight, Camera, Star, Package, Zap } from "lucide-react";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";
import Link from "next/link";

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

export default function ClientEcommercePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-amber-50 text-slate-700 selection:bg-orange-500/20 selection:text-orange-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingIcon icon={ShoppingBag} delay={0} className="w-32 h-32 top-20 right-10" />
                <FloatingIcon icon={Instagram} delay={2} className="w-24 h-24 top-1/3 left-10" />
                <FloatingIcon icon={CreditCard} delay={1} className="w-28 h-28 bottom-1/4 right-20" />
                <FloatingIcon icon={Package} delay={3} className="w-40 h-40 top-40 left-1/4" />
            </div>
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navigation />
                
                <main className="flex-grow pt-32 pb-20">
                    
                    {/* HERO */}
                    <div className="max-w-7xl mx-auto px-6 mb-24 text-center relative">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 mb-6 shadow-sm hover:shadow-md transition-all cursor-default">
                                <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
                                <span className="text-sm font-bold text-orange-700 uppercase tracking-wide">Instagram Satışlarını Katla</span>
                            </div>
                            
                            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 tracking-tight leading-none">
                                Linkin Bio'dan <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Direkt Satış Yap</span>
                            </h1>
                            
                            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
                                "DM'den fiyat bilgisi verildi" devri bitti. <br />
                                <span className="text-slate-900 font-bold underline decoration-orange-500 decoration-4 underline-offset-4">Tık Profil E-ticaret</span> ile ürünlerini listele, WhatsApp üzerinden sipariş al. Komisyon yok, limit yok.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/kayit-ol">
                                    <button className="px-10 py-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xl shadow-xl shadow-orange-500/30 hover:scale-105 hover:shadow-orange-500/50 transition-all flex items-center gap-3 group">
                                        Profilini Oluştur
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <p className="text-sm text-slate-500 font-medium mt-2 sm:mt-0 px-4">
                                    %100 Ücretsiz Başlangıç
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* FEATURES */}
                    <div className="max-w-6xl mx-auto px-6 mb-32">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-orange-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">🛍️</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Mini Mağaza</h3>
                                <p className="text-slate-600">Ürünlerini fotoğrafı, fiyatı ve açıklamasıyla ekle. Müşterilerin tek linkte her şeyi görsün.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">💬</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">WhatsApp Sipariş</h3>
                                <p className="text-slate-600">Siparişler hazır mesaj şablonuyla direkt WhatsApp'ına düşsün. Hızlı ve samimi.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">🚫</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Komisyon Yok</h3>
                                <p className="text-slate-600">Satışlarından kesinti yapmıyoruz. Kazancının tamamı senin.</p>
                            </div>
                        </div>
                    </div>

                    {/* MOCKUP */}
                    <div className="max-w-7xl mx-auto px-6 mb-32">
                        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                                        Butiğin Cebine <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Sığsın</span>
                                    </h2>
                                    <p className="text-lg text-slate-300 mb-8">
                                        Web sitesi masrafına girmeden profesyonel görün. Linkini Instagram biyografine yapıştır, satışa başla.
                                    </p>
                                    <ul className="space-y-4">
                                        <li className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
                                            <span>Sınırsız Ürün Ekleme</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center"><Instagram className="w-4 h-4 text-white" /></div>
                                            <span>Instagram ile Tam Uyumlu</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="relative flex justify-center">
                                    {/* Phone Mockup */}
                                    <div className="w-72 h-[550px] bg-white rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden relative">
                                        <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-orange-500 to-amber-600 rounded-b-[2rem] z-0"></div>
                                        <div className="relative z-10 p-4 pt-8 text-center h-full overflow-y-auto no-scrollbar">
                                            <div className="w-20 h-20 bg-white p-1 rounded-full mx-auto shadow-lg mb-2">
                                                <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden">
                                                    <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150)'}}></div>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-lg">Moda Butik</h3>
                                            <p className="text-xs text-slate-500 mb-6">En trend parçalar burada ✨</p>
                                            
                                            <div className="space-y-3 pb-8">
                                                <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 flex gap-3 text-left">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-lg shrink-0"></div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">Yazlık Elbise</div>
                                                        <div className="text-orange-600 font-bold text-sm">450₺</div>
                                                        <button className="mt-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded">Whatsapp Sipariş</button>
                                                    </div>
                                                </div>
                                                <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 flex gap-3 text-left">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-lg shrink-0"></div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">Kot Ceket</div>
                                                        <div className="text-orange-600 font-bold text-sm">600₺</div>
                                                        <button className="mt-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded">Whatsapp Sipariş</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COMPARISON TABLE */}
                    <div className="max-w-5xl mx-auto px-6 mb-32">
                        <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Neden Tık Profil E-ticaret?</h2>
                        <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xl bg-white/50 backdrop-blur-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 text-slate-800 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-6">Özellik</th>
                                        <th className="p-6 text-orange-600 text-lg flex items-center gap-2">
                                            <Zap className="w-5 h-5 fill-current" /> Tık Profil
                                        </th>
                                        <th className="p-6 text-slate-400">Pazaryerleri (Trendyol vb.)</th>
                                        <th className="p-6 text-slate-400">E-ticaret Sitesi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-orange-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Komisyon</td>
                                        <td className="p-6 font-bold text-green-600">%0 (Sıfır)</td>
                                        <td className="p-6 text-red-500">%20 - %30</td>
                                        <td className="p-6 text-green-600">%0</td>
                                    </tr>
                                    <tr className="hover:bg-orange-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Maliyet</td>
                                        <td className="p-6 font-bold text-green-600">Ücretsiz Başla</td>
                                        <td className="p-6 text-slate-500">Giriş Ücreti Yok</td>
                                        <td className="p-6 text-red-500">Çok Yüksek (30.000₺+)</td>
                                    </tr>
                                    <tr className="hover:bg-orange-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Müşteri İletişimi</td>
                                        <td className="p-6 font-bold text-blue-600">Direkt WhatsApp</td>
                                        <td className="p-6 text-red-500">Yasak / Kısıtlı</td>
                                        <td className="p-6 text-slate-500">Canlı Destek Modülü</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto px-6 text-center">
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
