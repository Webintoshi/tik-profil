"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight as LogIn, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function LegacyLoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!email || !password) {
            toast.error("Lutfen tum alanlari doldurun");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/owner-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (data.success) {
                toast.success("Giris basarili", {
                    description: "Isletme panelinize yonlendiriliyorsunuz.",
                });
                window.setTimeout(() => {
                    window.location.href = data.redirect || "/panel";
                }, 1000);
                return;
            }

            toast.error("E-posta veya sifre hatali", {
                description: "Lutfen bilgilerinizi kontrol edin.",
            });
        } catch {
            toast.error("Bir hata olustu", {
                description: "Lutfen tekrar deneyin.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="space-y-3 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    </span>
                    Guvenli Giris
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-blue-950">Hos Geldiniz</h1>
                <p className="text-lg font-medium text-slate-500">Devam etmek icin giris yapin</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="ml-1 text-sm font-bold text-slate-700">E-posta Adresiniz</label>
                    <div className="group relative transition-all duration-300 focus-within:scale-[1.02]">
                        <div className="absolute bottom-0 left-0 top-0 flex w-14 items-center justify-center">
                            <Mail className="h-6 w-6 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="ornek@sirket.com"
                            className="h-16 w-full rounded-2xl border-2 border-slate-100 bg-white/60 pl-14 pr-4 text-lg font-medium text-slate-800 placeholder-slate-400 shadow-sm backdrop-blur-md transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="ml-1 flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-700">Sifreniz</label>
                        <Link
                            href="/sifremi-unuttum"
                            className="text-sm font-semibold text-blue-600 decoration-2 underline-offset-2 transition-colors hover:text-blue-700 hover:underline"
                        >
                            Sifremi Unuttum?
                        </Link>
                    </div>
                    <div className="group relative transition-all duration-300 focus-within:scale-[1.02]">
                        <div className="absolute bottom-0 left-0 top-0 flex w-14 items-center justify-center">
                            <Lock className="h-6 w-6 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
                            className="h-16 w-full rounded-2xl border-2 border-slate-100 bg-white/60 pl-14 pr-4 text-lg font-medium text-slate-800 placeholder-slate-400 shadow-sm backdrop-blur-md transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-lg font-bold text-white shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-600/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <>
                            Giris Yap
                            <div className="rounded-lg bg-white/20 p-1.5 transition-colors group-hover:bg-white/30">
                                <LogIn className="h-5 w-5" />
                            </div>
                        </>
                    )}
                </button>
            </form>

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-100" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="rounded-full border border-slate-100 bg-white/50 px-6 py-1 font-semibold text-slate-400 backdrop-blur-md">
                        veya
                    </span>
                </div>
            </div>

            <div className="text-center">
                <Link
                    href="/kayit-ol"
                    className="group block w-full rounded-2xl border-2 border-dashed border-slate-300 px-6 py-4 transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/50"
                >
                    <span className="mb-1 block text-sm font-medium text-slate-500 transition-colors group-hover:text-blue-600">
                        Hesabiniz yok mu?
                    </span>
                    <span className="block text-lg font-bold text-slate-700 transition-colors group-hover:text-blue-700">
                        Ucretsiz Hesap Olusturun
                    </span>
                </Link>
            </div>
        </motion.div>
    );
}
