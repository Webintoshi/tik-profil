"use client";

import { useTheme } from "./ThemeProvider";
import { MapPin, Home, Heart, User } from "lucide-react";
import Link from "next/link";

export default function KesfetHeader() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <header className={`sticky top-0 z-40 px-4 py-3
                          ${isDark ? "bg-gray-950/90 border-b border-white/5" : "bg-white/90 border-b border-gray-100"}
                          backdrop-blur-xl`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                        T
                    </div>
                    <div>
                        <h1 className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            TikProfil
                        </h1>
                        <div className={`flex items-center gap-1 text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>
                            <MapPin className="w-3 h-3" />
                            <span>Türkiye</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/kesfet/explore"
                        className={`p-2.5 rounded-xl transition-colors
                                  ${isDark ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        <Home className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/kesfet/favorites"
                        className={`p-2.5 rounded-xl transition-colors
                                  ${isDark ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        <Heart className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/kesfet/profile"
                        className={`p-2.5 rounded-xl transition-colors
                                  ${isDark ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        <User className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </header>
    );
}
