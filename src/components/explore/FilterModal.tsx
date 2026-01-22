"use client";

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Sparkles } from "lucide-react";

interface FilterModalProps {
    onClose: () => void;
    category: string;
    onCategoryChange: (category: string) => void;
}

const DISTANCE_OPTIONS = [
    { value: 5, label: "5 km" },
    { value: 10, label: "10 km" },
    { value: 25, label: "25 km" },
    { value: 50, label: "50 km" },
    { value: 100, label: "100 km" },
    { value: 0, label: "Tümü" },
];

const RATING_OPTIONS = [
    { value: 4.5, label: "4.5+ Yıldız" },
    { value: 4.0, label: "4+ Yıldız" },
    { value: 3.5, label: "3.5+ Yıldız" },
    { value: 0, label: "Tümü" },
];

const SORT_OPTIONS = [
    { value: "distance", label: "En Yakın" },
    { value: "rating", label: "En Yüksek Puan" },
    { value: "reviews", label: "En Çok Değerlendirme" },
    { value: "trending", label: "Trending" },
];

export default function FilterModal({ onClose, category, onCategoryChange }: FilterModalProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [selectedDistance, setSelectedDistance] = useState(0);
    const [selectedRating, setSelectedRating] = useState(0);
    const [selectedSort, setSelectedSort] = useState("distance");

    const handleApply = () => {
        onClose();
    };

    const handleReset = () => {
        setSelectedDistance(0);
        setSelectedRating(0);
        setSelectedSort("distance");
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            >
                <div className={`max-h-[80vh] overflow-y-auto
                                ${isDark ? "bg-gray-900" : "bg-white"}`}>
                    <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4
                                    border-b ${isDark ? "border-white/10" : "border-gray-100"}`}>
                        <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            Filtreler
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-colors
                                           ${isDark ? "hover:bg-white/10 text-white/70" : "hover:bg-gray-100 text-gray-500"}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <section>
                            <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                                Kategori
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => onCategoryChange("all")}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                                   ${category === "all"
                                            ? "bg-emerald-500 text-white"
                                            : isDark
                                                ? "bg-white/5 hover:bg-white/10 text-white/70"
                                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                        }`}
                                >
                                    Tümü
                                </button>
                                {category !== "all" && (
                                    <div
                                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold
                                                   ${isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
                                    >
                                        {category}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                                Konum
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {DISTANCE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSelectedDistance(option.value)}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                                       ${selectedDistance === option.value
                                                            ? isDark
                                                                ? "bg-emerald-500 text-white"
                                                                : "bg-emerald-500 text-white"
                                                            : isDark
                                                                ? "bg-white/5 hover:bg-white/10 text-white/70"
                                                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                                       }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                                Minimum Puan
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {RATING_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSelectedRating(option.value)}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                                       ${selectedRating === option.value
                                                            ? isDark
                                                                ? "bg-amber-500 text-white"
                                                                : "bg-amber-500 text-white"
                                                            : isDark
                                                                ? "bg-white/5 hover:bg-white/10 text-white/70"
                                                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                                       }`}
                                    >
                                        <div className="flex items-center gap-1.5 justify-center">
                                            {option.value > 0 && <Star className="w-3.5 h-3.5 fill-current" />}
                                            <span>{option.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                                Sırala
                            </h3>
                            <div className="space-y-2">
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSelectedSort(option.value)}
                                        className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium flex items-center justify-between
                                                       transition-all duration-200
                                                       ${selectedSort === option.value
                                                            ? isDark
                                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : isDark
                                                                ? "bg-white/5 hover:bg-white/10 text-white/70"
                                                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                                       }`}
                                    >
                                        <span>{option.label}</span>
                                        {selectedSort === option.value && (
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center
                                                            ${isDark ? "bg-emerald-500" : "bg-emerald-500"}`}>
                                                <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className={`sticky bottom-0 px-6 py-4
                                    border-t ${isDark ? "border-white/10" : "border-gray-100"}`}>
                        <div className="flex gap-3">
                            <button
                                onClick={handleReset}
                                className={`flex-1 px-4 py-3.5 rounded-xl text-sm font-semibold
                                               transition-all duration-200
                                               ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                            >
                                Sıfırla
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-[2] px-4 py-3.5 rounded-xl text-sm font-semibold
                                               bg-gradient-to-r from-emerald-500 to-teal-600
                                               text-white shadow-lg shadow-emerald-500/30
                                               hover:shadow-emerald-500/40 active:scale-95
                                               transition-all duration-200"
                            >
                                Filtreleri Uygula
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
