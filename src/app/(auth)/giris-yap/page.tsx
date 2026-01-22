"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, ArrowRight as LogIn } from "lucide-react";
import { toast } from "sonner";

export default function GirisYapPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Lütfen tüm alanları doldurun");
            return;
        }

        setIsLoading(true);

        try {
            // Try owner login API
            const response = await fetch("/api/auth/owner-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // CRITICAL: Required to store cookies from response
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Giriş başarılı!", {
                    description: "İşletme panelinize yönlendiriliyorsunuz...",
                });
                // Use window.location for full page reload to pick up new cookies
                setTimeout(() => {
                    window.location.href = data.redirect || "/panel";
                }, 1000);
            } else {
                toast.error("E-posta veya şifre hatalı", {
                    description: "Lütfen bilgilerinizi kontrol edin.",
                });
            }
        } catch {
            toast.error("Bir hata oluştu", {
                description: "Lütfen tekrar deneyin.",
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
            {/* Header - Daha büyük ve net */}
            <div className="text-center lg:text-left space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/50 border border-blue-100 text-blue-600 text-xs font-semibold tracking-wide uppercase">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Güvenli Giriş
                </div>
                <h1 className="text-4xl font-bold text-blue-950 tracking-tight">Hoş Geldiniz</h1>
                <p className="text-lg text-slate-500 font-medium">Devam etmek için giriş yapın</p>
            </div>

            {/* Login Form - Geniş, Ferah ve Net */}
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* E-posta Alanı */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">E-posta Adresiniz</label>
                    <div className="relative group transition-all duration-300 focus-within:scale-[1.02]">
                        <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@sirket.com"
                            className="w-full pl-14 pr-4 h-16 rounded-2xl bg-white/60 backdrop-blur-md border-2 border-slate-100 text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium shadow-sm"
                        />
                    </div>
                </div>

                {/* Şifre Alanı */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-sm font-bold text-slate-700">Şifreniz</label>
                        <Link href="/sifremi-unuttum" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline decoration-2 underline-offset-2 transition-colors">
                            Şifremi Unuttum?
                        </Link>
                    </div>
                    <div className="relative group transition-all duration-300 focus-within:scale-[1.02]">
                        <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-14 pr-4 h-16 rounded-2xl bg-white/60 backdrop-blur-md border-2 border-slate-100 text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium shadow-sm"
                        />
                    </div>
                </div>

                {/* Submit Button - Büyük, Renkli ve Net */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full group relative h-16 flex items-center justify-center gap-3 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-1 active:translate-y-0"
                >
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <>
                            Giriş Yap
                            <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                                <LogIn className="h-5 w-5" />
                            </div>
                        </>
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-100" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-6 py-1 bg-white/50 backdrop-blur-md text-slate-400 font-semibold rounded-full border border-slate-100">veya</span>
                </div>
            </div>

            {/* Register link - Daha Belirgin */}
            <div className="text-center">
                <Link
                    href="/kayit-ol"
                    className="group block w-full py-4 px-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300"
                >
                    <span className="block text-sm text-slate-500 font-medium mb-1 group-hover:text-blue-600 transition-colors">Hesabınız yok mu?</span>
                    <span className="block text-lg font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                        Ücretsiz Hesap Oluşturun
                    </span>
                </Link>
            </div>
        </motion.div>
    );
}
