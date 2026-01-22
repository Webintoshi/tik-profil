"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ArrowRight, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface Place {
    id: string;
    name: string;
    image: string;
    category: string;
}

interface CityData {
    id: string;
    name: string;
    tagline: string;
    description: string;
    coverImage: string;
    places: Place[];
}

interface CityGuideSectionProps {
    currentLocation: string;
}

export function CityGuideSection({ currentLocation }: CityGuideSectionProps) {
    const [cityData, setCityData] = useState<CityData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCityData = async () => {
            setLoading(true);
            try {
                // Şehir ismini temizle (örn: "İstanbul" -> "istanbul")
                // Türkçe karakter sorunu olmaması için encodeURIComponent kullanıyoruz
                const response = await fetch(`/api/cities?name=${encodeURIComponent(currentLocation)}`);
                const data = await response.json();
                setCityData(data);
            } catch (error) {
                console.error("City data fetch error:", error);
                setCityData(null);
            } finally {
                setLoading(false);
            }
        };

        if (currentLocation) {
            fetchCityData();
        }
    }, [currentLocation]);

    // Yükleniyor veya veri yoksa
    if (!cityData && !loading) return null;

    return (
        <AnimatePresence mode="wait">
            {loading ? (
                // Skeleton Loading State
                <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-[280px] bg-white/10 backdrop-blur-xl rounded-3xl animate-pulse mb-8"
                />
            ) : cityData ? (
                <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-full overflow-hidden rounded-3xl mb-8 group"
                >
                    {/* Background Image with Parallax Effect */}
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={toR2ProxyUrl(cityData.coverImage)}
                            alt={cityData.name}
                            fill
                            className="object-cover transition-transform duration-[10s] group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                    </div>

                    {/* Content Container */}
                    <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row gap-8 h-full">
                        
                        {/* Left Side: Info */}
                        <div className="flex-1 flex flex-col justify-center text-white">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-blue-300" />
                                    <span className="text-xs font-bold tracking-wide uppercase">Şehir Rehberi</span>
                                </div>
                            </div>
                            
                            <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight drop-shadow-lg">
                                {cityData.name}
                                <span className="text-blue-400">.</span>
                            </h2>
                            
                            <p className="text-lg font-medium text-white/90 mb-4 italic">
                                "{cityData.tagline}"
                            </p>
                            
                            <p className="text-sm text-white/70 line-clamp-3 mb-6 max-w-lg leading-relaxed backdrop-blur-sm bg-black/10 p-2 rounded-xl border border-white/5">
                                {cityData.description}
                            </p>

                            <button className="w-fit flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg shadow-white/10">
                                <span>Detaylı Keşfet</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Right Side: Places (Horizontal Scroll) */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-400" />
                                    Gezilecek Yerler
                                </h3>
                            </div>
                            
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                {cityData.places.map((place) => (
                                    <motion.div
                                        key={place.id}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        className="relative flex-shrink-0 w-32 h-40 rounded-2xl overflow-hidden border border-white/30 shadow-lg snap-center group/card cursor-pointer"
                                    >
                                        <Image
                                            src={place.image}
                                            alt={place.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                                        
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <p className="text-[10px] text-blue-300 font-bold mb-0.5">{place.category}</p>
                                            <p className="text-xs font-bold text-white leading-tight">{place.name}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
