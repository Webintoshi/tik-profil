"use client";

import { Lock, LogIn } from "lucide-react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";

interface AuthRequiredProps {
    title?: string;
    description?: string;
}

export default function AuthRequired({ title = "Giriş Gerekiyor", description = "Bu özelliği kullanmak için giriş yapmalısınız" }: AuthRequiredProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4
                          ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                <Lock className={`w-10 h-10 ${isDark ? "text-white/30" : "text-gray-400"}`} />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {title}
            </h2>
            <p className={`text-center mb-6 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                {description}
            </p>
            <Link
                href="/kesfet/login"
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
            >
                <LogIn className="w-5 h-5" />
                Giriş Yap
            </Link>
        </div>
    );
}
