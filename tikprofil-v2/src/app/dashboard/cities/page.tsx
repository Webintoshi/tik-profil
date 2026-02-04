"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Edit, MapPin, Search, Building2, Plus, CheckCircle2, AlertCircle } from "lucide-react";

// Types
interface City {
    id: string;
    name: string;
    plate: string;
    description?: string;
    businessCount?: number;
}

// Liquid Metal Card Component
const LiquidMetalCard = ({ children, className = "", delay = 0 }: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
        className={`
            relative overflow-hidden rounded-3xl
            bg-gradient-to-br from-[#1a1a2e]/90 via-[#16162a]/90 to-[#0f0f1a]/90
            border border-white/[0.08]
            backdrop-blur-xl
            shadow-2xl shadow-black/50
            ${className}
        `}
    >
        {/* Chrome Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/[0.03] pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
            {children}
        </div>
    </motion.div>
);

// Animated Counter
const AnimatedCounter = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        const duration = 1000;
        const steps = 30;
        const increment = value / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, duration / steps);
        
        return () => clearInterval(timer);
    }, [value]);
    
    return <span>{displayValue}</span>;
};

export default function CitiesPage() {
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [stats, setStats] = useState({ total: 0, active: 0, empty: 0 });

    useEffect(() => {
        fetch("/api/cities")
            .then((res) => res.json())
            .then((data) => {
                if (!Array.isArray(data)) {
                    console.error("Cities API did not return an array:", data);
                    setLoading(false);
                    return;
                }
                setCities(data);
                // Calculate stats
                const total = data.length;
                const active = data.filter((c: City) => c.description).length;
                const empty = total - active;
                setStats({ total, active, empty });
                setLoading(false);
            })
            .catch((error) => {
                console.error("Failed to fetch cities:", error);
                setLoading(false);
            });
    }, []);

    const filteredCities = cities.filter((city) =>
        city.name.toLowerCase().includes(search.toLowerCase()) ||
        city.plate.toString().includes(search)
    );

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                        Şehir Rehberi
                    </h1>
                    <p className="text-white/50 mt-2 text-lg">
                        Türkiye genelindeki şehir rehberlerini yönetin
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                        type="text"
                        placeholder="Şehir veya plaka kodu ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/[0.1] rounded-2xl 
                                   text-white placeholder-white/40 
                                   focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 focus:border-[#fe1e50]/50
                                   transition-all duration-300"
                    />
                </div>
            </motion.div>

            {/* Stats Cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <LiquidMetalCard delay={0.1}>
                        <div className="p-6 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 
                                            border border-blue-500/30 flex items-center justify-center">
                                <MapPin className="w-7 h-7 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-white/50 text-sm">Toplam Şehir</p>
                                <p className="text-3xl font-bold text-white">
                                    <AnimatedCounter value={stats.total} />
                                </p>
                            </div>
                        </div>
                    </LiquidMetalCard>

                    <LiquidMetalCard delay={0.2}>
                        <div className="p-6 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 
                                            border border-emerald-500/30 flex items-center justify-center">
                                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-white/50 text-sm">Aktif Rehber</p>
                                <p className="text-3xl font-bold text-white">
                                    <AnimatedCounter value={stats.active} />
                                </p>
                            </div>
                        </div>
                    </LiquidMetalCard>

                    <LiquidMetalCard delay={0.3}>
                        <div className="p-6 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 
                                            border border-amber-500/30 flex items-center justify-center">
                                <AlertCircle className="w-7 h-7 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-white/50 text-sm">Boş Rehber</p>
                                <p className="text-3xl font-bold text-white">
                                    <AnimatedCounter value={stats.empty} />
                                </p>
                            </div>
                        </div>
                    </LiquidMetalCard>
                </div>
            )}

            {/* Cities Table */}
            <LiquidMetalCard delay={0.4} className="overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
                            <span className="text-white/50">Şehirler yükleniyor...</span>
                        </div>
                    </div>
                ) : filteredCities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
                            <Search className="w-10 h-10 text-white/30" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Şehir Bulunamadı</h3>
                        <p className="text-white/50 max-w-md">
                            Aradığınız kriterlere uygun şehir bulunmuyor. 
                            Farklı bir arama terimi deneyin.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.08]">
                                    <th className="px-6 py-5 text-left text-sm font-semibold text-white/60 uppercase tracking-wider">
                                        Şehir
                                    </th>
                                    <th className="px-6 py-5 text-left text-sm font-semibold text-white/60 uppercase tracking-wider">
                                        Plaka
                                    </th>
                                    <th className="px-6 py-5 text-left text-sm font-semibold text-white/60 uppercase tracking-wider">
                                        Durum
                                    </th>
                                    <th className="px-6 py-5 text-right text-sm font-semibold text-white/60 uppercase tracking-wider">
                                        İşlemler
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.05]">
                                {filteredCities.map((city, index) => (
                                    <motion.tr 
                                        key={city.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group hover:bg-white/[0.03] transition-colors duration-200"
                                    >
                                        {/* City Name */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fe1e50]/20 to-[#fe1e50]/5 
                                                                border border-[#fe1e50]/20 flex items-center justify-center
                                                                group-hover:scale-110 group-hover:border-[#fe1e50]/40 transition-all duration-300">
                                                    <span className="text-lg font-bold text-[#fe1e50]">
                                                        {city.plate}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-white text-lg block">
                                                        {city.name}
                                                    </span>
                                                    {city.description && (
                                                        <span className="text-white/40 text-sm line-clamp-1 max-w-xs">
                                                            {city.description.substring(0, 60)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Plate */}
                                        <td className="px-6 py-5">
                                            <span className="px-4 py-2 rounded-lg bg-white/[0.05] text-white/70 font-mono">
                                                {city.plate}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-5">
                                            {city.description ? (
                                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                                                               bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                                                               text-sm font-medium">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                                                               bg-amber-500/10 text-amber-400 border border-amber-500/20
                                                               text-sm font-medium">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Boş
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-5 text-right">
                                            <Link
                                                href={`/dashboard/cities/${city.id}`}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 
                                                         bg-gradient-to-r from-[#fe1e50] to-[#fe1e50]/80
                                                         hover:from-[#fe1e50]/90 hover:to-[#fe1e50]/70
                                                         text-white rounded-xl transition-all duration-300
                                                         text-sm font-medium shadow-lg shadow-[#fe1e50]/20
                                                         hover:shadow-xl hover:shadow-[#fe1e50]/30
                                                         hover:scale-105 active:scale-95"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Düzenle
                                            </Link>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </LiquidMetalCard>

            {/* Bottom Info */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-between text-white/40 text-sm"
            >
                <p>
                    Toplam {cities.length} şehir listeleniyor
                    {search && ` ("${search}" için ${filteredCities.length} sonuç)`}
                </p>
                <p>Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
            </motion.div>
        </div>
    );
}
