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
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { MouseFollowerBackground } from "@/components/landing/MouseFollowerBackground";
import Link from "next/link";

interface RoomType {
    id: string;
    name: string;
    description: string;
    price: number;
    capacity: number;
    bedType: string;
    size: number;
    photos: string[];
    amenities: string[];
}

const AMENITIES = [
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "ac", label: "Klima", icon: Wind },
    { id: "tv", label: "TV", icon: Tv },
    { id: "minibar", label: "Mini Bar", icon: Coffee },
    { id: "bathroom", label: "Banyo", icon: Bath },
    { id: "roomservice", label: "Oda Servisi", icon: UtensilsCrossed },
];

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

export default function ClientOtelPage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const [isRoomsOpen, setIsRoomsOpen] = useState(false);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    const fetchRoomTypes = async () => {
        if (!slug) return;
        
        try {
            setLoadingRooms(true);
            const res = await fetch(`/api/hotel/public-room-types?businessSlug=${slug}`);
            const data = await res.json();

            if (data.success) {
                setRoomTypes(data.data.roomTypes || []);
            }
        } catch (err) {
            console.error("Room types fetch error:", err);
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleRoomsToggle = () => {
        setIsRoomsOpen(!isRoomsOpen);
        if (!isRoomsOpen && roomTypes.length === 0) {
            fetchRoomTypes();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-50 text-slate-700 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">
            <MouseFollowerBackground />
            
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingIcon icon={BedDouble} delay={0} className="w-32 h-32 top-20 right-10" />
                <FloatingIcon icon={ConciergeBell} delay={2} className="w-24 h-24 top-1/3 left-10" />
                <FloatingIcon icon={Coffee} delay={1} className="w-28 h-28 bottom-1/4 right-20" />
                <FloatingIcon icon={Wifi} delay={3} className="w-40 h-40 top-40 left-1/4" />
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
                    <div className="max-w-6xl mx-auto px-6 mb-32">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-bold text-slate-800">Oda Türleri</h2>
                            <button
                                onClick={handleRoomsToggle}
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

                        <AnimatePresence>
                            {isRoomsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
                                        {loadingRooms ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                            </div>
                                        ) : roomTypes.length === 0 ? (
                                            <div className="text-center py-12">
                                                <BedDouble className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-600">Henüz oda türü eklenmemiş</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {roomTypes.map((roomType) => (
                                                    <div
                                                        key={roomType.id}
                                                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                                                    >
                                                        <div className="aspect-[4/3] bg-slate-100 relative">
                                                            {roomType.photos?.length > 0 ? (
                                                                <img
                                                                    src={roomType.photos[0]}
                                                                    alt={roomType.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <BedDouble className="w-16 h-16 text-slate-300" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-5">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <h3 className="text-lg font-semibold text-slate-800">
                                                                    {roomType.name}
                                                                </h3>
                                                                <span className="text-lg font-bold text-blue-500">
                                                                    ₺{roomType.price}
                                                                    <span className="text-xs text-slate-400 font-normal">/gece</span>
                                                                </span>
                                                            </div>

                                                            <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                                                                {roomType.description}
                                                            </p>

                                                            <div className="flex items-center gap-4 mb-4 text-sm text-slate-600">
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-4 h-4" />
                                                                    {roomType.capacity} Kişi
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Maximize className="w-4 h-4" />
                                                                    {roomType.size} m²
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <BedDouble className="w-4 h-4" />
                                                                    {roomType.bedType}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                {roomType.amenities?.slice(0, 4).map((amenityId) => {
                                                                    const amenity = AMENITIES.find(a => a.id === amenityId);
                                                                    if (!amenity) return null;
                                                                    const Icon = amenity.icon;
                                                                    return (
                                                                        <span
                                                                            key={amenityId}
                                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600"
                                                                        >
                                                                            <Icon className="w-3 h-3" />
                                                                            {amenity.label}
                                                                        </span>
                                                                    );
                                                                })}
                                                                {roomType.amenities?.length > 4 && (
                                                                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-500">
                                                                        +{roomType.amenities.length - 4}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
