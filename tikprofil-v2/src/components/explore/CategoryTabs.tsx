"use client";

import { useTheme } from "./ThemeProvider";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, UtensilsCrossed, Coffee, ShoppingBag, Scissors, Heart, Dumbbell, Hotel, Car, Gamepad2, Music, Scale, Grid3X3 } from "lucide-react";

interface Category {
    id: string;
    label: string;
    icon?: string;
    count?: number;
    color: string;
}

interface CategoryTabsProps {
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
}

const CATEGORIES: Category[] = [
    { id: "all", label: "Tümü", icon: "Sparkles", color: "from-emerald-500 to-teal-500" },
    { id: "restaurant", label: "Yeme & İçme", icon: "UtensilsCrossed", color: "from-orange-500 to-red-500" },
    { id: "cafe", label: "Kafe & Kahve", icon: "Coffee", color: "from-amber-600 to-orange-600" },
    { id: "shopping", label: "Alışveriş", icon: "ShoppingBag", color: "from-pink-500 to-rose-500" },
    { id: "beauty", label: "Güzellik", icon: "Scissors", color: "from-purple-500 to-pink-500" },
    { id: "fitness", label: "Fitness", icon: "Dumbbell", color: "from-cyan-500 to-blue-500" },
    { id: "hotel", label: "Konaklama", icon: "Hotel", color: "from-indigo-500 to-purple-500" },
    { id: "automotive", label: "Oto & Servis", icon: "Car", color: "from-slate-500 to-gray-600" },
    { id: "entertainment", label: "Eğlence", icon: "Gamepad2", color: "from-violet-500 to-fuchsia-500" },
    { id: "health", label: "Sağlık", icon: "Heart", color: "from-red-500 to-rose-600" },
    { id: "education", label: "Eğitim", icon: "Music", color: "from-blue-600 to-indigo-600" },
    { id: "services", label: "Hizmetler", icon: "Scale", color: "from-teal-500 to-emerald-500" },
];

function getCategoryIcon(categoryId: string) {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return Grid3X3;

    switch (category.icon) {
        case "Sparkles": return Sparkles;
        case "UtensilsCrossed": return UtensilsCrossed;
        case "Coffee": return Coffee;
        case "ShoppingBag": return ShoppingBag;
        case "Scissors": return Scissors;
        case "Dumbbell": return Dumbbell;
        case "Hotel": return Hotel;
        case "Car": return Car;
        case "Gamepad2": return Gamepad2;
        case "Heart": return Heart;
        case "Music": return Music;
        case "Scale": return Scale;
        default: return Grid3X3;
    }
}

export default function CategoryTabs({ selectedCategory, onCategoryChange }: CategoryTabsProps) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isDark = theme === "dark";

    useEffect(() => {
        async function fetchCategories() {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 800));
            setLoading(false);
        }
        fetchCategories();
    }, []);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const scrollAmount = 280;
            scrollRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth"
            });
        }
    };

    return (
        <div className="relative py-4">
            <div className="flex items-center justify-between px-4 mb-3">
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Kategoriler
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => scroll("left")}
                        className={`w-8 h-8 rounded-full flex items-center justify-center
                                       transition-all duration-200
                                       ${isDark ? "bg-white/5 hover:bg-white/10 text-white/60" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className={`w-8 h-8 rounded-full flex items-center justify-center
                                       transition-all duration-200
                                       ${isDark ? "bg-white/5 hover:bg-white/10 text-white/60" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide px-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className={`flex-shrink-0 w-28 h-28 rounded-2xl animate-pulse
                                           ${isDark ? "bg-white/10" : "bg-gray-200"}`}
                        />
                    ))
                ) : (
                    CATEGORIES.map((category, index) => {
                        const Icon = getCategoryIcon(category.id);
                        const isSelected = selectedCategory === category.id;

                        return (
                            <motion.button
                                key={category.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                                onClick={() => onCategoryChange(category.id)}
                                className={`flex-shrink-0 w-28 h-28 rounded-2xl flex flex-col items-center justify-center gap-2
                                               relative overflow-hidden transition-all duration-300 ease-out
                                               ${isSelected
                                                ? `bg-gradient-to-br ${category.color} text-white shadow-lg`
                                                : isDark
                                                    ? "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                                                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 shadow-sm"
                                                }`}
                            >
                                {isSelected && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    />
                                )}
                                <Icon className="w-6 h-6 relative z-10" />
                                <span className="text-xs font-semibold text-center px-1 truncate w-full relative z-10">
                                    {category.label}
                                </span>
                                {category.count !== undefined && category.count > 0 && (
                                    <span className={`absolute top-2 right-2 min-w-[20px] h-[20px]
                                                     flex items-center justify-center
                                                     rounded-full text-[10px] font-bold
                                                     relative z-10
                                                     ${isSelected ? "bg-white text-gray-900" : "bg-emerald-500 text-white"}`}>
                                        {category.count}
                                    </span>
                                )}
                            </motion.button>
                        );
                    })
                )}
            </div>

            <div className={`absolute left-0 top-0 bottom-0 w-12 pointer-events-none
                            bg-gradient-to-r ${isDark ? "from-gray-950" : "from-white"} to-transparent`} />
            <div className={`absolute right-0 top-0 bottom-0 w-12 pointer-events-none
                            bg-gradient-to-l ${isDark ? "from-gray-950" : "from-white"} to-transparent`} />
        </div>
    );
}
