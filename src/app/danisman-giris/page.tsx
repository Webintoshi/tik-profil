"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, User, Lock, Phone, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ConsultantLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loginType, setLoginType] = useState<'email' | 'phone'>('email');
    const [form, setForm] = useState({
        email: "",
        phone: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const identifier = loginType === 'email' ? form.email : form.phone;
        if (!identifier.trim()) {
            toast.error(loginType === 'email' ? 'E-posta gerekli' : 'Telefon numarası gerekli');
            return;
        }
        if (!form.password.trim()) {
            toast.error('Şifre gerekli');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/consultant-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: loginType === 'email' ? form.email : undefined,
                    phone: loginType === 'phone' ? form.phone : undefined,
                    password: form.password,
                }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`Hoş geldiniz, ${data.data.consultant.name}!`);
                router.push('/danisman-panel');
            } else {
                if (data.needsPasswordSetup) {
                    toast.error('Şifreniz henüz oluşturulmamış. Lütfen işletme sahibinden şifre talep edin.');
                } else {
                    toast.error(data.error || 'Giriş başarısız');
                }
            }
        } catch {
            toast.error('Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Ana Sayfa
                </Link>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    {/* Logo/Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <User className="w-8 h-8 text-white" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        Danışman Girişi
                    </h1>
                    <p className="text-gray-500 text-center mb-8">
                        Emlak danışmanı olarak giriş yapın
                    </p>

                    {/* Login Type Toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => setLoginType('email')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${loginType === 'email'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Mail className="w-4 h-4 inline-block mr-2" />
                            E-posta
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginType('phone')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${loginType === 'phone'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Phone className="w-4 h-4 inline-block mr-2" />
                            Telefon
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {loginType === 'email' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    E-posta
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="danisman@ornek.com"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Telefon
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="+90 532 123 4567"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Şifre
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Giriş Yap"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            İşletme sahibi misiniz?{" "}
                            <Link href="/giris" className="text-purple-600 hover:text-purple-700 font-medium">
                                İşletme Girişi
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-400 mt-8">
                    Tık Profil © 2025
                </p>
            </motion.div>
        </div>
    );
}
