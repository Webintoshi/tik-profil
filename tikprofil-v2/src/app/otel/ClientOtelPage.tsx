"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    BedDouble,
    ConciergeBell,
    Coffee,
    Wifi,
    Star,
    ArrowRight,
    Zap,
    CheckCircle,
    ChefHat,
    Bell,
    Users,
    Maximize,
    Wind,
    Tv,
    Bath,
    UtensilsCrossed,
    ChevronDown,
    ChevronUp,
    Loader2,
} from "lucide-react";
import { HotelInlineMenu } from "@/components/public/HotelInlineMenu";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";
import Link from "next/link";



export default function ClientOtelPage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const [isRoomsOpen, setIsRoomsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-50 text-slate-700 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navigation />
                
                <main className="flex-grow pt-32 pb-20">
                    
                    {/* HERO */}
                    <div className="max-w-7xl mx-auto px-6 mb-24 text-center relative">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-6 shadow-sm hover:shadow-md transition-all cursor-default">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">7/24 Dijital Resepsiyon</span>
                            </div>
                            
                            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 tracking-tight leading-none">
                                7/24 Dijital Resepsiyon ve <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-sky-500">Oda Servisi Sistemi</span>
                            </h1>
                            
                            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
                                Telefon trafiğini azaltın, oda servisi satışlarını artırın. <br />
                                <span className="text-slate-900 font-bold underline decoration-blue-500 decoration-4 underline-offset-4">Tık Profil Otel Modülü</span> ile misafirleriniz tek tıkla resepsiyona, restorana ve tüm hizmetlere ulaşsın.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/kayit-ol">
                                    <button className="px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-600 text-white font-bold text-xl shadow-xl shadow-blue-500/30 hover:scale-105 hover:shadow-blue-500/50 transition-all flex items-center gap-3 group">
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

                    {/* FEATURES GRID */}
                    <div className="max-w-6xl mx-auto px-6 mb-32">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">🛎️</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Oda Servisi</h3>
                                <p className="text-slate-600">Misafirler QR kod ile menüyü görsün, odasından sipariş versin. Telefon meşgul derdi yok.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-sky-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">🗺️</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Dijital Rehber</h3>
                                <p className="text-slate-600">Kahvaltı saatleri, havuz kuralları, wifi şifresi... Hepsi tek ekranda.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-cyan-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">⭐</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Geri Bildirim</h3>
                                <p className="text-slate-600">Google yorumları öncesi misafir şikayetlerini anında yakalayın ve çözün.</p>
                            </div>
                        </div>
                    </div>

                    {/* MOCKUP SECTION */}
                    <div className="max-w-7xl mx-auto px-6 mb-32">
                        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                                        Akıllı Oda Kartı <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">Cebinizde</span>
                                    </h2>
                                    <p className="text-lg text-slate-300 mb-8">
                                        Basılı oda kartlıkları, broşürler ve rehberler tarih oldu. Sadece bir QR kod ile misafirinize tüm oteli sunun.
                                    </p>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl">
                                            <Bell className="w-8 h-8 text-blue-400" />
                                            <div>
                                                <div className="font-bold">Oda Temizliği İste</div>
                                                <div className="text-sm text-slate-400">Tek tıkla housekeeping bildirimi</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl">
                                            <ChefHat className="w-8 h-8 text-blue-400" />
                                            <div>
                                                <div className="font-bold">Restoran Rezervasyonu</div>
                                                <div className="text-sm text-slate-400">A La Carte restoran için yer ayırtma</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative flex justify-center">
                                    <div className="w-64 h-[500px] bg-white rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden relative">
                                        <div className="absolute top-0 w-full h-32 bg-blue-600 rounded-b-[2rem] z-0"></div>
                                        <div className="relative z-10 p-6 pt-12 text-center">
                                            <div className="w-20 h-20 bg-white rounded-full mx-auto shadow-lg mb-4 flex items-center justify-center text-blue-600 font-bold text-2xl">G</div>
                                            <h3 className="font-bold text-slate-800 text-lg">Grand Hotel</h3>
                                            <p className="text-xs text-slate-500 mb-6">Hoş Geldiniz, Sn. Yılmaz</p>
                                            
                                            <div className="grid grid-cols-2 gap-3 text-left">
                                                <div className="bg-blue-50 p-3 rounded-xl">
                                                    <ConciergeBell className="w-6 h-6 text-blue-600 mb-2" />
                                                    <div className="text-xs font-bold text-slate-700">Oda Servisi</div>
                                                </div>
                                                <div className="bg-blue-50 p-3 rounded-xl">
                                                    <Wifi className="w-6 h-6 text-blue-600 mb-2" />
                                                    <div className="text-xs font-bold text-slate-700">Wifi Şifresi</div>
                                                </div>
                                                <div className="bg-blue-50 p-3 rounded-xl">
                                                    <Star className="w-6 h-6 text-blue-600 mb-2" />
                                                    <div className="text-xs font-bold text-slate-700">Değerlendir</div>
                                                </div>
                                                <div className="bg-blue-50 p-3 rounded-xl">
                                                    <Zap className="w-6 h-6 text-blue-600 mb-2" />
                                                    <div className="text-xs font-bold text-slate-700">Teknik Destek</div>
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
                        <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Neden Tık Profil Otel?</h2>
                        <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xl bg-white/50 backdrop-blur-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 text-slate-800 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-6">Özellik</th>
                                        <th className="p-6 text-blue-600 text-lg flex items-center gap-2">
                                            <Zap className="w-5 h-5 fill-current" /> Tık Profil
                                        </th>
                                        <th className="p-6 text-slate-400">Oda Telefonu</th>
                                        <th className="p-6 text-slate-400">Basılı Rehber</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Sipariş Hızı</td>
                                        <td className="p-6 font-bold text-green-600">Anında (Tek Tık)</td>
                                        <td className="p-6 text-slate-500">Bekleme Süresi Var</td>
                                        <td className="p-6 text-red-500">-</td>
                                    </tr>
                                    <tr className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Güncellenebilirlik</td>
                                        <td className="p-6 font-bold text-green-600">Saniyeler İçinde</td>
                                        <td className="p-6 text-slate-500">-</td>
                                        <td className="p-6 text-red-500">Yeniden Baskı Gerekir</td>
                                    </tr>
                                    <tr className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Dil Desteği</td>
                                        <td className="p-6 font-bold text-green-600">Otomatik Çeviri</td>
                                        <td className="p-6 text-red-500">Personel Bilgisine Bağlı</td>
                                        <td className="p-6 text-slate-500">Sınırlı</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ROOMS SECTION WITH DROPDOWN */}
                    <div className="max-w-7xl mx-auto px-6 mb-32">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-bold text-slate-800">Oda Türleri</h2>
                            <button
                                onClick={() => setIsRoomsOpen(!isRoomsOpen)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                            >
                                <span>Odaları Gör</span>
                                {isRoomsOpen ? (
                                    <ChevronUp className="w-5 h-5" />
                                ) : (
                                    <ChevronDown className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        <HotelInlineMenu
                            isOpen={isRoomsOpen}
                            businessSlug={slug}
                            onClose={() => setIsRoomsOpen(false)}
                        />
                    </div>

                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/kayit-ol">
                                <button className="px-12 py-5 rounded-2xl bg-slate-900 text-white font-bold text-xl shadow-xl hover:bg-black transition-all hover:-translate-y-1 flex items-center gap-3">
                                    Ücretsiz Profilini Oluştur
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
