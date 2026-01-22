"use client";

import { motion } from "framer-motion";
import { Utensils, Zap, Smartphone, ShoppingBag, Clock, CheckCircle, ArrowRight, TrendingUp, XCircle, DollarSign, Truck, ChefHat, Pizza, Coffee, BellRing } from "lucide-react";
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

export default function ClientFastFoodPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-50 text-slate-700 selection:bg-[#fd0355]/20 selection:text-[#fd0355] overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingIcon icon={Pizza} delay={0} className="w-32 h-32 top-20 right-10" />
                <FloatingIcon icon={Utensils} delay={2} className="w-24 h-24 top-1/3 left-10" />
                <FloatingIcon icon={Coffee} delay={1} className="w-28 h-28 bottom-1/4 right-20" />
                <FloatingIcon icon={ChefHat} delay={3} className="w-40 h-40 top-40 left-1/4" />
            </div>
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navigation />
                
                <main className="flex-grow pt-32 pb-20">
                    
                    {/* 1. HERO: SERT VE NET GİRİŞ */}
                    <div className="max-w-7xl mx-auto px-6 mb-24 text-center relative">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fd0355]/10 border border-[#fd0355]/20 mb-6 shadow-sm hover:shadow-md transition-all cursor-default">
                                <span className="w-2 h-2 rounded-full bg-[#fd0355] animate-pulse"></span>
                                <span className="text-sm font-bold text-[#fd0355] uppercase tracking-wide">Komisyon Canavarlarına Son</span>
                            </div>
                            
                            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 tracking-tight leading-none">
                                Kendi Müşterine <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fd0355] to-rose-500">Komisyon Ödeme!</span>
                            </h1>
                            
                            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
                                Yemek uygulamaları kârının yarısını alıyor mu? <br />
                                <span className="text-slate-900 font-bold underline decoration-[#fd0355] decoration-4 underline-offset-4">Tık Profil</span> ile dijital kimliğini oluştur. 
                                Kendi profilini oluştur, bütün para kasana kalsın.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/kayit-ol">
                                    <button className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[#fd0355] to-rose-600 text-white font-bold text-xl shadow-xl shadow-[#fd0355]/30 hover:scale-105 hover:shadow-[#fd0355]/50 transition-all flex items-center gap-3 group">
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

                    {/* 2. GERÇEKLERLE YÜZLEŞME (PAIN POINTS) */}
                    <div className="max-w-6xl mx-auto px-6 mb-32">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-[#fd0355]/10 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">💸</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Komisyondan Bıktın mı?</h3>
                                <p className="text-slate-600">Her 100 liralık siparişin 30-40 lirası başkasına gidiyor. Yazık değil mi emeğine?</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">📞</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Telefon Trafiği?</h3>
                                <p className="text-slate-600">"Adres neydi abla?", "Ketçap olsun mu?"... Telefonda vakit kaybetme, işine odaklan.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 text-center hover:bg-white/80 hover:scale-105 transition-all shadow-sm hover:shadow-xl">
                                <div className="w-16 h-16 rounded-full bg-rose-100 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">📉</div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Müşterini Tanı</h3>
                                <p className="text-slate-600">Uygulamalar müşteri datanı sana vermez. Tık Profil'de müşteri SENİN müşterin.</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. ÇÖZÜM: NASIL ÇALIŞIR? (SOMUT SENARYO) */}
                    <div className="max-w-7xl mx-auto px-6 mb-32">
                        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
                            {/* Arka plan efekti */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#fd0355]/20 rounded-full blur-[120px]" />
                            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-600/20 rounded-full blur-[100px]" />
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                                <div>
                                    <div className="inline-block px-4 py-1 rounded-full bg-[#fd0355]/10 border border-[#fd0355]/30 text-[#fd0355] text-sm font-bold mb-6">
                                        MODÜLER SİSTEM
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                                        İşte Sana <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fd0355] to-rose-300">Hayalindeki Sistem</span>
                                    </h2>
                                    
                                    <div className="space-y-8">
                                        <StepItem 
                                            number="1" 
                                            title="Profilini Oluştur" 
                                            desc="İşletme adını, logonu ve iletişim bilgilerini ekle. Dijital kimliğin anında hazır." 
                                        />
                                        <StepItem 
                                            number="2" 
                                            title="Menünü Yükle (QR Modülü)" 
                                            desc="Ürünlerini, fotoğraflarını ve fiyatlarını gir. İstersen 'Soğan Olmasın' gibi seçenekler ekle." 
                                        />
                                        <StepItem 
                                            number="3" 
                                            title="Siparişleri Yönet (Panel)" 
                                            desc="Siparişler anında paneline düşsün. Sesli bildirim al, fiş yazdır, kuryeni yönlendir." 
                                        />
                                    </div>
                                </div>
                                
                                {/* Mockup Alanı */}
                                <div className="relative perspective-1000">
                                    <motion.div 
                                        initial={{ rotateY: -10, rotateX: 5 }}
                                        whileHover={{ rotateY: 0, rotateX: 0 }}
                                        transition={{ type: "spring", stiffness: 100 }}
                                        className="bg-white rounded-3xl p-6 shadow-2xl relative z-10"
                                    >
                                        <div className="absolute -top-6 -right-6 bg-green-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg animate-bounce">
                                            +185 TL
                                        </div>
                                        <div className="flex items-center gap-3 border-b pb-4 mb-4">
                                            <div className="w-12 h-12 rounded-full bg-[#fd0355] flex items-center justify-center text-white shadow-md"><BellRing className="w-6 h-6" /></div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-lg">Yeni Sipariş #1284</div>
                                                <div className="text-xs text-slate-500">Masa 5 • Nakit Ödeme</div>
                                            </div>
                                        </div>
                                        <div className="bg-[#fd0355]/5 p-5 rounded-2xl text-slate-800 text-sm font-mono space-y-3 border border-[#fd0355]/10">
                                            <p className="font-bold flex items-center gap-2">👤 <span className="text-[#fd0355]">Mehmet Yılmaz</span></p>
                                            <div className="h-px bg-[#fd0355]/20 my-2" />
                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <span>2x Double Burger Menü</span>
                                                    <span className="font-bold">160 TL</span>
                                                </div>
                                                <p className="text-xs text-slate-500 pl-4">- Turşu olmasın</p>
                                                <div className="flex justify-between">
                                                    <span>1x Ekstra Patates</span>
                                                    <span className="font-bold">25 TL</span>
                                                </div>
                                            </div>
                                            <div className="h-px bg-[#fd0355]/20 my-2" />
                                            <div className="flex justify-between text-lg font-bold text-[#fd0355]">
                                                <span>Toplam Tutar:</span>
                                                <span>185 TL</span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 flex gap-2">
                                            <button className="flex-1 py-3 bg-[#fd0355] text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors shadow-lg shadow-[#fd0355]/20">Hazırla</button>
                                            <button className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Yazdır</button>
                                        </div>
                                    </motion.div>
                                    
                                    {/* Arka plandaki kart efekti */}
                                    <div className="absolute top-4 left-4 w-full h-full bg-[#fd0355]/20 rounded-3xl -z-10 blur-xl" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. KARŞILAŞTIRMA TABLOSU (RAKİPLERİ EZME) */}
                    <div className="max-w-5xl mx-auto px-6 mb-32">
                        <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Neden Tık Profil?</h2>
                        <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xl bg-white/50 backdrop-blur-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 text-slate-800 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-6">Özellik</th>
                                        <th className="p-6 text-[#fd0355] text-lg flex items-center gap-2">
                                            <Zap className="w-5 h-5 fill-current" /> Tık Profil
                                        </th>
                                        <th className="p-6 text-slate-400">Diğer Uygulamalar</th>
                                        <th className="p-6 text-slate-400">Web Sitesi Yaptırmak</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-[#fd0355]/10 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Profil Oluşturma</td>
                                        <td className="p-6 font-bold text-green-600">Ücretsiz</td>
                                        <td className="p-6 text-slate-500">Ücretsiz</td>
                                        <td className="p-6 text-red-500">Ücretli</td>
                                    </tr>
                                    <tr className="hover:bg-[#fd0355]/10 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Komisyon Oranı</td>
                                        <td className="p-6 font-bold text-green-600">%0 (Sıfır)</td>
                                        <td className="p-6 text-red-500">%30 - %40</td>
                                        <td className="p-6 font-bold text-green-600">%0</td>
                                    </tr>
                                    <tr className="hover:bg-[#fd0355]/10 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Kurulum Süresi</td>
                                        <td className="p-6 font-bold text-[#fd0355]">2 Dakika</td>
                                        <td className="p-6">1-2 Hafta</td>
                                        <td className="p-6">1 Ay</td>
                                    </tr>
                                    <tr className="hover:bg-[#fd0355]/10 transition-colors">
                                        <td className="p-6 font-medium text-slate-700">Maliyet</td>
                                        <td className="p-6 font-bold text-green-600">Sadece Kullandığın Modül</td>
                                        <td className="p-6 text-red-500">Yüksek Komisyon</td>
                                        <td className="p-6 text-red-500">Yüksek (20.000 TL+)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5. SOSYAL KANIT (HİKAYE) */}
                    <div className="max-w-4xl mx-auto px-6 mb-32">
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="bg-gradient-to-br from-[#fd0355] to-rose-800 rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10">
                                <div className="text-6xl mb-6 opacity-50 font-serif">❝</div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-8 leading-relaxed italic">
                                    "Eskiden telefonla sipariş alırken günde en az 1 saatim boşa gidiyordu. Şimdi siparişler panele düşüyor, ben sadece hazırlayıp gönderiyorum. Ayda 15.000 TL komisyon ödemekten kurtuldum."
                                </h3>
                                <div className="flex items-center justify-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl border-2 border-white/30">M</div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Mehmet Usta</div>
                                        <div className="text-rose-100 text-sm">Lezzet Döner - İşletme Sahibi</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* 6. SON VURUŞ (CTA) */}
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <h2 className="text-4xl font-bold text-slate-800 mb-6">
                            Kaybedecek Neyin Var?
                        </h2>
                        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                            Dijital profilini hemen oluştur, linkini paylaşmaya başla. İhtiyacın olan modülleri (QR Menü, Sipariş vb.) dilediğin zaman ekle.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/kayit-ol">
                                <button className="px-12 py-5 rounded-2xl bg-slate-900 text-white font-bold text-xl shadow-xl hover:bg-black transition-all hover:-translate-y-1 flex items-center gap-3">
                                    Profilimi Oluştur
                                    <ArrowRight className="w-6 h-6" />
                                </button>
                            </Link>
                            <Link href="/bebek-burger-akyazi">
                                <button className="px-12 py-5 rounded-2xl bg-white text-slate-700 border border-slate-200 font-bold text-xl hover:bg-slate-50 transition-all hover:border-[#fd0355]/30 hover:text-[#fd0355]">
                                    Örnek Sayfayı Gör
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
            <div className="w-12 h-12 rounded-2xl bg-[#fd0355] flex items-center justify-center shrink-0 font-bold shadow-lg group-hover:scale-110 transition-transform">{number}</div>
            <div>
                <h4 className="text-xl font-bold mb-2 group-hover:text-rose-300 transition-colors">{title}</h4>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
