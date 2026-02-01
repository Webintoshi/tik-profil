"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Share2, Search, MapPin, Star, Clock, Flame, Bell, Home, Compass, ShoppingBag, User, Filter, SlidersHorizontal, Map, Coffee, UtensilsCrossed, Briefcase, Scissors, Building, ShoppingBag as ShoppingBagIcon, Palette, Plane, Sparkles, Pizza, QrCode, ChevronDown, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TikLogo } from "@/components/TikLogo";
import { CityGuideSection } from "@/components/CityGuideSection";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface Story {
    id: number;
    name: string;
    avatar: string;
    isLive?: boolean;
    hasUnseen?: boolean;
}

interface BusinessType {
    id: string;
    name: string;
    icon: React.ReactNode;
    active?: boolean;
}

interface BusinessCard {
    id: number;
    name: string;
    category: string;
    image: string;
    description: string;
    rating: number;
    reviews: number;
    distance: string;
    time: string;
    tags: string[];
    featured?: boolean;
    isLive?: boolean;
    type?: "restaurant" | "cafe" | "fastfood" | "other";
    logo?: string;
}

const stories: Story[] = [
    { id: 1, name: "Gourmet", avatar: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100", isLive: true, hasUnseen: true },
    { id: 2, name: "Urban Cafe", avatar: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100", hasUnseen: true },
    { id: 3, name: "Sakura", avatar: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=100", hasUnseen: true },
    { id: 4, name: "Burger", avatar: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100", hasUnseen: true },
    { id: 5, name: "Pasta", avatar: "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=100", hasUnseen: true },
    { id: 6, name: "Fresh", avatar: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100", hasUnseen: true },
    { id: 7, name: "Street", avatar: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=100", hasUnseen: true },
    { id: 8, name: "Asian", avatar: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=100", hasUnseen: false },
];

const businessTypes: BusinessType[] = [
    { id: "all", name: "Tümü", icon: <Compass className="w-5 h-5" />, active: true },
    { id: "restaurant", name: "Restoran", icon: <UtensilsCrossed className="w-5 h-5" /> },
    { id: "cafe", name: "Cafe", icon: <Coffee className="w-5 h-5" /> },
    { id: "fastfood", name: "Fast Food", icon: <Pizza className="w-5 h-5" /> },
    { id: "beauty", name: "Güzellik", icon: <Scissors className="w-5 h-5" /> },
    { id: "shopping", name: "Alışveriş", icon: <ShoppingBagIcon className="w-5 h-5" /> },
    { id: "service", name: "Hizmet", icon: <Briefcase className="w-5 h-5" /> },
    { id: "other", name: "Diğer", icon: <Building className="w-5 h-5" /> },
];

const businessCards: BusinessCard[] = [
    { 
        id: 1, 
        name: "Gourmet Kitchen", 
        category: "Fine Dining",
        image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800",
        description: "Premium yemek deneyimi, şefin özel menüsü ve unutulmaz lezzetler.",
        rating: 4.9, 
        reviews: 2340, 
        distance: "0.8 km", 
        time: "15-20 dk",
        tags: ["Premium", "Reservasyon"],
        featured: true,
        isLive: true,
        type: "restaurant",
        logo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=200"
    },
    { 
        id: 2, 
        name: "Urban Cafe", 
        category: "Coffee & Brunch",
        image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800",
        description: "Şehrin kalbinde en iyi kahve ve brunch deneyimi.",
        rating: 4.7, 
        reviews: 1890, 
        distance: "1.2 km", 
        time: "10-15 dk",
        tags: ["Popüler"],
        type: "cafe",
        logo: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=200"
    },
    { 
        id: 3, 
        name: "Sakura Sushi", 
        category: "Japanese",
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800",
        description: "Otantik Japon mutfağı, taze sushi ve sashimi seçenekleri.",
        rating: 4.8, 
        reviews: 3210, 
        distance: "2.1 km", 
        time: "20-25 dk",
        tags: ["Japon", "Sushi"],
        type: "restaurant",
        logo: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=200"
    },
    { 
        id: 4, 
        name: "Burger House", 
        category: "Fast Food",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800",
        description: "Efsanevi burgerlar, ev yapımı soslar ve taze malzemeler.",
        rating: 4.5, 
        reviews: 1450, 
        distance: "0.5 km", 
        time: "5-10 dk",
        tags: ["Hızlı", "Uygun"],
        type: "fastfood",
        logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200"
    },
    { 
        id: 5, 
        name: "Pasta Italiano", 
        category: "Italian",
        image: "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?q=80&w=800",
        description: "İtalyan mutfağının en lezzetli pastaları ve makarnaları.",
        rating: 4.6, 
        reviews: 2100, 
        distance: "1.5 km", 
        time: "15-20 dk",
        tags: ["İtalyan", "Pasta"],
        type: "restaurant",
        logo: "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?q=80&w=200"
    },
    { 
        id: 6, 
        name: "Fresh Salad", 
        category: "Healthy",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800",
        description: "Sağlıklı beslenme için taze salatalar ve vegan seçenekler.",
        rating: 4.4, 
        reviews: 980, 
        distance: "0.9 km", 
        time: "10-15 dk",
        tags: ["Sağlıklı", "Vegan"],
        type: "cafe",
        logo: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200"
    },
    { 
        id: 7, 
        name: "Street Food", 
        category: "Street Food",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800",
        description: "Sokak lezzetleri, uygun fiyatlar ve hızlı servis.",
        rating: 4.3, 
        reviews: 760, 
        distance: "1.1 km", 
        time: "10-15 dk",
        tags: ["Uygun", "Hızlı"],
        type: "fastfood",
        logo: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=200"
    },
    { 
        id: 8, 
        name: "Asian Fusion", 
        category: "Asian",
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=800",
        description: "Asya mutfağının en iyi lezzetleri, füzyon tatlar.",
        rating: 4.7, 
        reviews: 1650, 
        distance: "2.3 km", 
        time: "25-30 dk",
        tags: ["Asya", "Füzyon"],
        type: "other",
        logo: "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=200"
    },
    { 
        id: 9, 
        name: "Hair Studio", 
        category: "Beauty",
        image: "https://images.unsplash.com/photo-1560066794370-0600f9600f5e?w=800",
        description: "Profesyonel saç tasarımı ve bakım hizmetleri.",
        rating: 4.8, 
        reviews: 1200, 
        distance: "1.5 km", 
        time: "30-60 dk",
        tags: ["Saç", "Bakım"],
        type: "other",
        logo: "https://images.unsplash.com/photo-1560066794370-0600f9600f5e?w=200"
    },
    { 
        id: 10, 
        name: "Tech Repair", 
        category: "Service",
        image: "https://images.unsplash.com/photo-1581091226825-8cc24d5d5623?w=800",
        description: "Elektronik cihaz tamiri ve bakım hizmetleri.",
        rating: 4.9, 
        reviews: 2100, 
        distance: "0.7 km", 
        time: "20-40 dk",
        tags: ["Teknoloji", "Tamir"],
        type: "other",
        logo: "https://images.unsplash.com/photo-1581091226825-8cc24d5d5623?w=200"
    },
];

function StoriesBar() {
    return (
        <div className="flex gap-2.5 overflow-x-auto pb-2 px-0">
            {stories.map((story) => (
                <motion.button
                    key={story.id}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex-shrink-0 relative group"
                >
                    <div className={`w-14 h-14 rounded-full p-0.5 backdrop-blur-xl border-2 border-white/60 ${story.hasUnseen 
                        ? 'bg-gradient-to-br from-blue-500/90 via-blue-600/90 to-cyan-500/90 shadow-xl shadow-blue-500/20' 
                        : 'bg-gray-200/85 backdrop-blur-xl shadow-lg shadow-gray-200/30'}`}>
                        <div className="w-full h-full rounded-full bg-white/95 p-0.5 relative">
                            <Image
                                src={toR2ProxyUrl(story.avatar)}
                                alt={story.name}
                                width={52}
                                height={52}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                    </div>
                    {story.isLive && (
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30 border border-white/60"
                        >
                            <span className="text-[8px] font-black text-white">LIVE</span>
                        </motion.div>
                    )}
                    <p className="text-xs text-gray-600 text-center mt-1 truncate w-14 font-medium">{story.name}</p>
                </motion.button>
            ))}
        </div>
    );
}

function BusinessTypesBar() {
    return (
        <div className="flex gap-2.5 overflow-x-auto pb-2 px-0">
            {businessTypes.map((type) => (
                <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all relative overflow-hidden border
                              ${type.active 
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 border-blue-500/50' 
                                : 'bg-white/60 text-gray-600 border-white/60 hover:border-blue-200 hover:bg-white/80 backdrop-blur-xl'}`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden
                                    ${type.active ? 'bg-white/20' : 'bg-gray-100/50 backdrop-blur-md'}`}>
                        <div className={type.active ? 'text-white relative z-10' : 'text-gray-600 relative z-10'}>
                            {type.icon}
                        </div>
                    </div>
                    <span className={`text-xs font-bold relative z-10 ${type.active ? 'text-white' : 'text-gray-600'}`}>{type.name}</span>
                </motion.button>
            ))}
        </div>
    );
}

interface BusinessCardProps {
    card: BusinessCard;
    index: number;
}

function BusinessCard({ card, index }: BusinessCardProps) {
    const [isLiked, setIsLiked] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="w-full"
        >
            <Link href={`/${card.id}`} className="block w-full h-full">
                <motion.div
                    whileHover={{ scale: [1, 1.02, 1.03], y: -5 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative w-full transition-all duration-500 group"
                >
                    {/* Ambient Glow Behind Card */}
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                    
                    <div className="relative w-full bg-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/20 hover:border-white/50 transition-all duration-500 overflow-hidden">
                        {/* Glass Reflection Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent opacity-100 pointer-events-none z-0" />
                        
                        <div className="relative h-[180px] overflow-hidden z-10">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="absolute inset-0"
                            >
                                <div className="absolute inset-0 bg-black/20 z-10" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                                <Image
                                    src={card.image}
                                    alt={card.name}
                                    fill
                                    className="object-cover"
                                />
                            </motion.div>

                            {card.isLive && (
                                <div className="absolute top-3 right-3 px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-full flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.1)] border border-white/30 z-20 group-hover:bg-white/30 transition-colors duration-300">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                                    </span>
                                    <span className="text-[10px] font-semibold text-white tracking-wide uppercase">Önerilen</span>
                                </div>
                            )}
                            
                            <div className="absolute bottom-4 left-4 z-20 flex items-end gap-3 w-full pr-4">
                                 <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative w-12 h-12 rounded-2xl overflow-hidden border border-white/30 bg-white/10 backdrop-blur-md flex-shrink-0 shadow-lg"
                                >
                                    <Image
                                        src={card.logo || card.image}
                                        alt={card.name}
                                        fill
                                        className="object-cover"
                                    />
                                </motion.div>
                                
                                <div className="flex-1 min-w-0 mb-0.5">
                                    <h3 className="text-xl font-bold text-white mb-0.5 line-clamp-1 tracking-tight drop-shadow-md">{card.name}</h3>
                                    <p className="text-xs font-medium text-white/80 line-clamp-1 backdrop-blur-sm">{card.category}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative p-4 z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        <span className="font-bold text-gray-900 text-sm">{card.rating}</span>
                                        <span className="text-xs text-gray-500 font-medium">({card.reviews})</span>
                                    </div>
                                    <span className="text-gray-300">|</span>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-xs font-medium text-gray-600">{card.time}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-600">{card.distance}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-medium mb-2">{card.description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {card.tags.slice(0, 2).map((tag, i) => (
                                            <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100/80 text-gray-600">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                 <motion.button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsLiked(!isLiked);
                                    }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all group/btn hover:bg-red-50"
                                >
                                    <motion.div
                                        animate={isLiked ? { scale: [1, 1.4, 1] } : {}}
                                        transition={{ duration: 0.35 }}
                                    >
                                        <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-300 group-hover/btn:text-red-500'}`} />
                                    </motion.div>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </Link>
        </motion.div>
    );
}

export default function KesfetPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [currentLocation, setCurrentLocation] = useState("İstanbul");
    const [isLocating, setIsLocating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const getCurrentLocation = () => {
        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                        );
                        const data = await response.json();
                        const city = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || "Konum";
                        setCurrentLocation(city);
                    } catch (error) {
                        console.error("Konum alınamadı:", error);
                    } finally {
                        setIsLocating(false);
                    }
                },
                (error) => {
                    console.error("Konum izni reddedildi:", error);
                    setIsLocating(false);
                }
            );
        } else {
            setIsLocating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F4F8] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]">
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-4xl border-b border-white/50 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/15 to-transparent opacity-60 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link href="/" className="flex-shrink-0 relative group">
                            <motion.div
                                className="relative"
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <TikLogo className="w-8 h-8 sm:w-9 sm:h-9" variant="light" />
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-full blur-xl" />
                            </motion.div>
                        </Link>

                        <div className="flex-1 relative min-w-0">
                            <input
                                type="text"
                                placeholder="Ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white/80 backdrop-blur-3xl border border-white/80
                                          rounded-2xl focus:bg-white/95 focus:border-blue-400 
                                          focus:ring-4 focus:ring-blue-500/15
                                          focus:shadow-xl focus:shadow-blue-500/10
                                          shadow-md shadow-gray-200/50
                                          transition-all duration-300 outline-none font-semibold text-gray-900 text-xs sm:text-sm relative z-10 placeholder:text-gray-400"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/25 to-transparent opacity-0 focus-within:opacity-100 transition-opacity duration-400 pointer-events-none rounded-2xl" />
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowLocationModal(true)}
                                className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 bg-white/70 hover:bg-white/85 backdrop-blur-xl rounded-xl border border-white/60 hover:border-white/80 transition-all shadow-md shadow-gray-200/40"
                            >
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                <span className="text-[10px] sm:text-xs font-semibold text-gray-700 truncate max-w-[60px] sm:max-w-none">{currentLocation}</span>
                                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative p-2.5 sm:p-3 bg-white/70 hover:bg-white/85 backdrop-blur-xl rounded-xl border border-white/60 hover:border-white/80 transition-all shadow-md shadow-gray-200/40"
                            >
                                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                <span className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/40" />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </header>

            <main ref={containerRef} className="pt-4 pb-24 overflow-y-auto max-h-screen">
                <div className="max-w-7xl mx-auto px-4 space-y-4">
                    <section className="pt-2">
                        <StoriesBar />
                    </section>

                    <section>
                        <BusinessTypesBar />
                    </section>

                    <section className="pt-2">
                        <CityGuideSection currentLocation={currentLocation} />
                    </section>

                    <section>
                        <div className="mb-4">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 mb-1">
                                    Keşfet
                                </h1>
                                <p className="text-gray-600 text-sm">Yakınındaki en iyi mekanlar</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-[15px]">
                            {businessCards.map((card, index) => (
                                <BusinessCard key={card.id} card={card} index={index} />
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-3xl border-t-2 border-white/80 shadow-2xl shadow-gray-200/40">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent opacity-50 pointer-events-none" />
                <div className="max-w-7xl mx-auto relative">
                    <div className="flex items-center justify-around py-2">
                        <Link href="/">
                            <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl
                                           transition-all duration-300 font-bold text-gray-600 hover:bg-white/75 backdrop-blur-xl border border-white/60 hover:border-white/90 relative"
                            >
                                <Home className="w-5 h-5 relative z-10" />
                                <span className="text-[10px] relative z-10">Ana Sayfa</span>
                            </motion.button>
                        </Link>

                        <Link href="/kesfet">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl
                                           transition-all duration-300 font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20 relative"
                            >
                                <Compass className="w-5 h-5 relative z-10" />
                                <span className="text-[10px] relative z-10">Keşfet</span>
                            </motion.button>
                        </Link>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative -mt-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700
                                      flex items-center justify-center shadow-xl shadow-blue-600/30 border-4 border-white/90 overflow-hidden"
                        >
                            <QrCode className="w-7 h-7 text-white relative z-10" />
                        </motion.button>

                        <Link href="/kesfet/orders">
                            <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl
                                           transition-all duration-300 font-bold text-gray-600 hover:bg-white/75 backdrop-blur-xl border border-white/60 hover:border-white/90 relative"
                            >
                                <ShoppingBag className="w-5 h-5 relative z-10" />
                                <span className="text-[10px] relative z-10">Siparişler</span>
                            </motion.button>
                        </Link>

                        <Link href="/kesfet/profile">
                            <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl
                                           transition-all duration-300 font-bold text-gray-600 hover:bg-white/75 backdrop-blur-xl border border-white/60 hover:border-white/90 relative"
                            >
                                <User className="w-5 h-5 relative z-10" />
                                <span className="text-[10px] relative z-10">Profil</span>
                            </motion.button>
                        </Link>
                    </div>
                </div>
            </nav>

            <AnimatePresence>
                {showLocationModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-4xl"
                        onClick={() => setShowLocationModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="absolute bottom-0 left-0 right-0 bg-white/70 backdrop-blur-4xl rounded-t-3xl p-6 border-t-2 border-white/70 shadow-2xl shadow-gray-200/70 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-1 bg-gray-400/80 backdrop-blur-md rounded-full mx-auto mb-6 relative z-10" />
                            
                            <h2 className="text-xl font-black text-gray-900 mb-2 relative z-10">Konumunuzu Seçin</h2>
                            <p className="text-gray-600 text-sm mb-6 font-semibold relative z-10">
                                Konum bilgileriniz size yakın işletmeleri göstermemize yardımcı olur.
                            </p>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    getCurrentLocation();
                                    setShowLocationModal(false);
                                }}
                                disabled={isLocating}
                                className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-blue-50/80 backdrop-blur-xl border border-blue-100
                                          rounded-2xl hover:bg-blue-100/80 transition-all mb-3 relative"
                            >
                                <MapPin className="w-5 h-5 text-blue-600 relative z-10" />
                                <span className="font-bold text-blue-700 relative z-10">
                                    {isLocating ? "Konum Alınıyor..." : "Mevcut Konumu Kullan"}
                                </span>
                            </motion.button>

                            <div className="space-y-2.5">
                                {["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa"].map((city) => (
                                    <motion.button
                                        key={city}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => {
                                            setCurrentLocation(city);
                                            setShowLocationModal(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all backdrop-blur-xl border relative
                                                  ${currentLocation === city 
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-blue-500' 
                                                    : 'bg-white/60 hover:bg-white/80 text-gray-700 border-white/60 hover:border-blue-200'}`}
                                    >
                                        <MapPin className="w-4 h-4 relative z-10" />
                                        <span className="font-bold relative z-10">{city}</span>
                                        {currentLocation === city && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="ml-auto text-white font-black relative z-10"
                                            >
                                                <Check className="w-4 h-4" />
                                            </motion.span>
                                        )}
                                    </motion.button>
                                ))}
                            </div>

                            <p className="text-[10px] text-gray-500 text-center mt-4 font-semibold relative z-10">
                                Konum bilgileriniz sadece size yakın işletmeleri göstermek için kullanılır.
                                Gizlilik politikamızı inceleyebilirsiniz.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
