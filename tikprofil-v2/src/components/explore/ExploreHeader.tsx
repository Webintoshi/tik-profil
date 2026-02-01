"use client";

import { useTheme } from "./ThemeProvider";
import { MapPin, Search, Filter, Grid, List, Bell, SlidersHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ExploreHeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onFilterClick: () => void;
    onViewModeChange: (mode: "feed" | "grid") => void;
    viewMode: "feed" | "grid";
    locationText: string;
}

export default function ExploreHeader({
    searchQuery,
    onSearchChange,
    onFilterClick,
    onViewModeChange,
    viewMode,
    locationText,
}: ExploreHeaderProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [isFocused, setIsFocused] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const locationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
                setShowLocationDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className={`sticky top-0 z-50 transition-all duration-300
                           ${isFocused
                    ? isDark
                        ? "bg-gray-950/95 shadow-2xl shadow-gray-900/20"
                        : "bg-white/95 shadow-2xl shadow-gray-200/30"
                    : isDark
                        ? "bg-gray-950/80 backdrop-blur-xl border-b border-white/5"
                        : "bg-white/80 backdrop-blur-xl border-b border-gray-100"}`}>
            <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/kesfet-v2"
                        className="flex-shrink-0"
                    >
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600
                                      flex items-center justify-center
                                      shadow-lg shadow-emerald-500/30
                                      text-white font-bold text-lg">
                            T
                        </div>
                    </Link>

                    <div className="flex-1 relative">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5
                                             transition-colors duration-200
                                             ${isFocused
                                            ? "text-emerald-500"
                                            : isDark ? "text-gray-400" : "text-gray-400"}`} />
                        <input
                            type="text"
                            placeholder="Restoran, mağaza, hizmet ara..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className={`w-full pl-12 pr-4 py-3.5 rounded-2xl
                                           text-sm font-medium transition-all duration-300
                                           ${isFocused
                                            ? isDark
                                                ? "bg-white/5 border-2 border-emerald-500 text-white placeholder:text-white/40 ring-2 ring-emerald-500/20"
                                                : "bg-white border-2 border-emerald-500 text-gray-900 placeholder:text-gray-400 ring-2 ring-emerald-500/20"
                                            : isDark
                                                ? "bg-white/5 border border-white/10 text-white placeholder:text-white/40"
                                                : "bg-gray-100 border border-transparent text-gray-900 placeholder:text-gray-400"
                                           }`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange("")}
                                className={`absolute right-3 top-1/2 -translate-y-1/2
                                               px-2 py-1 rounded-lg text-xs font-semibold
                                               transition-all duration-200
                                               ${isDark ? "bg-white/10 hover:bg-white/20 text-white/60" : "bg-gray-200 hover:bg-gray-300 text-gray-500"}`}
                            >
                                Temizle
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onViewModeChange(viewMode === "feed" ? "grid" : "feed")}
                            className={`p-3 rounded-2xl transition-all duration-200
                                           ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"}`}
                        >
                            {viewMode === "feed" ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={onFilterClick}
                            className={`relative p-3 rounded-2xl transition-all duration-200
                                           ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900"}`}
                        >
                            <Filter className="w-5 h-5" />
                        </button>

                        <Link
                            href="/kesfet-v2/notifications"
                            className="relative p-3 rounded-2xl transition-all duration-200"
                        >
                            <div className={`absolute inset-0 rounded-2xl transition-all duration-200
                                           ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"}`} />
                            <Bell className={`relative w-5 h-5 ${isDark ? "text-white/70" : "text-gray-600"}`} />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-emerald-500" />
                        </Link>

                        <Link
                            href="/kesfet-v2/profile"
                            className="w-11 h-11 rounded-2xl overflow-hidden ring-2 transition-all duration-200
                                      hover:ring-2 hover:scale-105
                                      active:scale-95
                                      bg-gradient-to-br from-violet-500 to-purple-600
                                      text-white font-bold"
                        >
                            <div className="w-full h-full flex items-center justify-center">
                                K
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="relative" ref={locationRef}>
                        <button
                            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                            className={`flex items-center gap-2 px-3 py-2 pr-8 rounded-xl
                                           text-sm font-semibold transition-all duration-200
                                           ${showLocationDropdown
                                            ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                                            : isDark ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            <MapPin className="w-4 h-4" />
                            <span>{locationText}</span>
                        </button>

                        <AnimatePresence>
                            {showLocationDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute top-full left-0 mt-2 py-2 rounded-xl shadow-2xl z-50 min-w-[200px]
                                                   ${isDark ? "bg-gray-900 border border-white/10" : "bg-white border border-gray-100"}`}
                                >
                                    <div className="px-3 pb-2 border-b border-dashed">
                                        <p className="text-xs font-medium mb-1">Konum</p>
                                        <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                                            {locationText}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowLocationDropdown(false)}
                                        className="w-full px-3 py-2 text-left text-sm font-medium transition-colors
                                                       hover:bg-emerald-500/10 hover:text-emerald-500"
                                    >
                                        <div className="flex items-center gap-2">
                                            <SlidersHorizontal className="w-4 h-4" />
                                            <span>Filtreleri Ayarla</span>
                                        </div>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isDark ? "text-white/50" : "text-gray-500"}`}>
                            {viewMode === "feed" ? "Feed" : "Grid"} görünümü
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
