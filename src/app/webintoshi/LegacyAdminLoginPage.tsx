"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2, Lock, Sparkles, User } from "lucide-react";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const [showLogoutToast, setShowLogoutToast] = useState(false);

    useEffect(() => {
        if (searchParams.get("logout") === "success") {
            setShowLogoutToast(true);
            window.history.replaceState({}, "", "/webintoshi");
            const timeout = window.setTimeout(() => setShowLogoutToast(false), 3000);
            return () => window.clearTimeout(timeout);
        }

        return undefined;
    }, [searchParams]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
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
                setError(data.error || "Giris basarisiz");
                setShake(true);
                window.setTimeout(() => setShake(false), 500);
                setIsLoading(false);
                return;
            }

            router.push("/dashboard");
        } catch {
            setError("Baglanti hatasi");
            setShake(true);
            window.setTimeout(() => setShake(false), 500);
            setIsLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {showLogoutToast ? (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed left-1/2 top-6 z-50 -translate-x-1/2"
                    >
                        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-white/90 px-5 py-3 shadow-lg backdrop-blur-xl">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-800">Basariyla cikis yapildi</span>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-md"
            >
                <motion.div
                    className="mb-8 text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#5856D6] shadow-lg shadow-blue-500/25">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Tik Profil</h1>
                    <p className="mt-1 text-sm text-gray-500">Yonetim Paneli</p>
                </motion.div>

                <motion.div
                    animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.5 } } : {}}
                    className="relative"
                >
                    <div className="rounded-3xl border border-white/50 bg-white/72 p-8 shadow-2xl shadow-gray-200/50 backdrop-blur-[40px]">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Kullanici Adi</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        placeholder="Kullanici adinizi girin"
                                        required
                                        className="w-full rounded-xl border border-gray-200 bg-white/80 py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#0071E3] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Sifre</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        className="w-full rounded-xl border border-gray-200 bg-white/80 py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#0071E3] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                                    />
                                </div>
                            </div>

                            {error ? (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3"
                                >
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </motion.div>
                            ) : null}

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0071E3] to-[#0077ED] py-3.5 font-medium text-white shadow-lg shadow-blue-500/25 disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Giris yapiliyor...
                                    </>
                                ) : (
                                    "Giris Yap"
                                )}
                            </motion.button>
                        </form>
                    </div>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-center text-xs text-gray-400"
                >
                    Guvenli baglanti ile korunuyor
                </motion.p>
            </motion.div>
        </>
    );
}

export default function LegacyAdminLoginPage() {
    return (
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-gray-400" />}>
                <LoginContent />
            </Suspense>
        </div>
    );
}
