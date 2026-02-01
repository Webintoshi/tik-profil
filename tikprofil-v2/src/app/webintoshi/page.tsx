"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Lock, User, AlertCircle, Loader2, CheckCircle } from "lucide-react";

// Separate component to handle search params
function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const [showLogoutToast, setShowLogoutToast] = useState(false);

    // Check for logout success message
    useEffect(() => {
        if (searchParams.get("logout") === "success") {
            setShowLogoutToast(true);
            window.history.replaceState({}, "", "/webintoshi");
            setTimeout(() => setShowLogoutToast(false), 3000);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Giriş başarısız");
                setShake(true);
                setTimeout(() => setShake(false), 500);
                setIsLoading(false);
                return;
            }

            router.push("/dashboard");
        } catch {
            setError("Bağlantı hatası");
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Logout Success Toast */}
            <AnimatePresence>
                {showLogoutToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div
                            className="flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg"
                            style={{
                                background: "rgba(255, 255, 255, 0.9)",
                                backdropFilter: "blur(20px)",
                                border: "1px solid rgba(52, 199, 89, 0.3)",
                            }}
                        >
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-800">
                                Başarıyla çıkış yapıldı
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#5856D6] shadow-lg shadow-blue-500/25 mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Tık Profil
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Yönetim Paneli</p>
                </motion.div>

                {/* Login Card */}
                <motion.div
                    animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.5 } } : {}}
                    className="relative"
                >
                    <div
                        className="rounded-3xl p-8 shadow-2xl shadow-gray-200/50"
                        style={{
                            background: "rgba(255, 255, 255, 0.72)",
                            backdropFilter: "blur(40px)",
                            WebkitBackdropFilter: "blur(40px)",
                            border: "1px solid rgba(255, 255, 255, 0.5)",
                        }}
                    >
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Kullanıcı adınızı girin"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/80 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Şifre</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/80 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100"
                                >
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </motion.div>
                            )}

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0071E3] to-[#0077ED] text-white font-medium shadow-lg shadow-blue-500/25 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Giriş yapılıyor...
                                    </>
                                ) : (
                                    "Giriş Yap"
                                )}
                            </motion.button>
                        </form>
                    </div>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-xs text-gray-400 mt-6"
                >
                    Güvenli bağlantı ile korunuyor
                </motion.p>
            </motion.div>
        </>
    );
}

// Main page with Suspense wrapper
export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
            <Suspense fallback={
                <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            }>
                <LoginContent />
            </Suspense>
        </div>
    );
}
