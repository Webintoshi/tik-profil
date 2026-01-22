"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export default function SifremiUnuttumPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (data.success) {
                setSent(true);
            } else {
                setError(data.error || "Bir hata oluştu");
            }
        } catch {
            setError("Sunucu hatası");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
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
                        Email Gönderildi
                    </h1>
                    <p className="text-gray-500 mt-3">
                        Eğer <span className="font-medium text-gray-900">{email}</span> ile kayıtlı bir hesap varsa,
                        şifre sıfırlama bağlantısı gönderildi.
                    </p>
                </div>
                <p className="text-sm text-gray-400">
                    Email gelen kutunuzu ve spam klasörünü kontrol edin.
                </p>
                <Link
                    href="/giris-yap"
                    className="inline-flex items-center gap-2 text-[#0071e3] hover:underline font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Giriş sayfasına dön
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="text-center lg:text-left">
                {/* Mobile Icon */}
                <div className="lg:hidden flex justify-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <Mail className="w-8 h-8 text-[#0071e3]" />
                    </div>
                </div>

                <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Şifremi Unuttum</h1>
                <p className="text-gray-500 mt-2">
                    Email adresinizi girin, şifre sıfırlama bağlantısı gönderelim.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        E-posta
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@email.com"
                            required
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
                    disabled={loading || !email}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-[#0071e3] text-white font-semibold hover:bg-[#0077ed] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        "Sıfırlama Bağlantısı Gönder"
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
