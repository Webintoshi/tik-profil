"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setVerifying(false);
            return;
        }

        const verifyToken = async () => {
            try {
                const res = await fetch(`/api/auth/reset-password?token=${token}`);
                const data = await res.json();
                setTokenValid(data.valid);
            } catch {
                setTokenValid(false);
            } finally {
                setVerifying(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor");
            return;
        }

        if (password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.error || "Bir hata oluştu");
            }
        } catch {
            setError("Sunucu hatası");
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (verifying) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
            </div>
        );
    }

    // Invalid token
    if (!token || !tokenValid) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 text-center"
            >
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                        Geçersiz Bağlantı
                    </h1>
                    <p className="text-gray-500 mt-3">
                        Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
                    </p>
                </div>
                <Link
                    href="/sifremi-unuttum"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-4 rounded-xl bg-[#0071e3] text-white font-semibold hover:bg-[#0077ed] transition-all shadow-lg shadow-blue-500/30"
                >
                    Yeni Bağlantı İste
                </Link>
            </motion.div>
        );
    }

    // Success
    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 text-center"
            >
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                        Şifre Güncellendi
                    </h1>
                    <p className="text-gray-500 mt-3">
                        Şifreniz başarıyla güncellendi. Şimdi yeni şifrenizle giriş yapabilirsiniz.
                    </p>
                </div>
                <Link
                    href="/giris-yap"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-4 rounded-xl bg-[#0071e3] text-white font-semibold hover:bg-[#0077ed] transition-all shadow-lg shadow-blue-500/30"
                >
                    Giriş Yap
                </Link>
            </motion.div>
        );
    }

    // Reset form
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <Lock className="w-8 h-8 text-[#0071e3]" />
                    </div>
                </div>

                <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Yeni Şifre Belirle</h1>
                <p className="text-gray-500 mt-2">
                    Hesabınız için yeni bir şifre belirleyin.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Yeni Şifre
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="w-full pl-12 pr-12 h-12 rounded-xl bg-white border border-gray-200 text-[#1d1d1f] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Şifre Tekrar
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="w-full pl-12 pr-4 h-12 rounded-xl bg-white border border-gray-200 text-[#1d1d1f] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all font-medium"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-[#0071e3] text-white font-semibold hover:bg-[#0077ed] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        "Şifreyi Güncelle"
                    )}
                </button>
            </form>

            {/* Back link */}
            <div className="text-center">
                <Link
                    href="/giris-yap"
                    className="inline-flex items-center gap-2 text-[#0071e3] hover:underline font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Giriş sayfasına dön
                </Link>
            </div>
        </motion.div>
    );
}

export default function SifreSifirlaPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
