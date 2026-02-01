"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Save,
    Loader2,
    User,
    Phone,
    Mail,
    Camera,
    Lock,
    Eye,
    EyeOff,
    QrCode,
    Download,
    Copy,
    Check,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useConsultantSession } from "@/hooks/useConsultantSession";
import { QRCodeSVG } from "qrcode.react";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface ProfileFormData {
    name: string;
    title: string;
    phone: string;
    email: string;
    whatsapp: string;
    bio: string;
    photoUrl: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export default function ConsultantProfilePage() {
    const router = useRouter();
    const { session, consultant, isLoading: sessionLoading, refresh } = useConsultantSession();

    const [loading, setLoading] = useState(false);
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    const [form, setForm] = useState<ProfileFormData>({
        name: "",
        title: "",
        phone: "",
        email: "",
        whatsapp: "",
        bio: "",
        photoUrl: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push('/danisman-giris');
        }
    }, [sessionLoading, session, router]);

    useEffect(() => {
        if (consultant) {
            setForm(prev => ({
                ...prev,
                name: consultant.name || "",
                title: consultant.title || "",
                phone: consultant.phone || "",
                email: consultant.email || "",
                whatsapp: consultant.whatsapp || "",
                bio: consultant.bio || "",
                photoUrl: consultant.photoUrl || "",
            }));
        }
    }, [consultant]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // Generate profile URL
    const getProfileUrl = useCallback(() => {
        if (!consultant?.slug) return '';
        // Use window.location.origin for full URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tikprofil.com';
        return `${baseUrl}/danisman/${consultant.slug}`;
    }, [consultant?.slug]);

    // Download QR code as PNG
    const downloadQR = useCallback(() => {
        if (!qrRef.current) return;
        const svg = qrRef.current.querySelector('svg');
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new window.Image();
        img.onload = () => {
            canvas.width = 512;
            canvas.height = 512;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 512, 512);
            URL.revokeObjectURL(url);

            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `qr-${consultant?.slug || 'profile'}.png`;
            link.href = pngUrl;
            link.click();
            toast.success('QR kod indirildi');
        };
        img.src = url;
    }, [consultant?.slug]);

    // Copy profile URL to clipboard
    const copyProfileUrl = useCallback(async () => {
        const url = getProfileUrl();
        if (!url) return;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('Profil linki kopyalandı');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Kopyalama başarısız');
        }
    }, [getProfileUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error('İsim zorunlu');
            return;
        }
        if (!form.phone.trim()) {
            toast.error('Telefon zorunlu');
            return;
        }

        // Password validation if changing
        if (showPasswordSection && form.newPassword) {
            if (form.newPassword.length < 6) {
                toast.error('Yeni şifre en az 6 karakter olmalı');
                return;
            }
            if (form.newPassword !== form.confirmPassword) {
                toast.error('Şifreler eşleşmiyor');
                return;
            }
        }

        setLoading(true);

        try {
            const payload: Record<string, string> = {
                name: form.name.trim(),
                title: form.title.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                whatsapp: form.whatsapp.trim(),
                bio: form.bio.trim(),
                photoUrl: form.photoUrl.trim(),
            };

            // Include password change if applicable
            if (showPasswordSection && form.newPassword) {
                payload.currentPassword = form.currentPassword;
                payload.newPassword = form.newPassword;
            }

            const res = await fetch('/api/consultant/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success('Profil güncellendi');
                // Refresh session to get updated data
                refresh();
                // Reset password fields
                setForm(prev => ({
                    ...prev,
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                }));
                setShowPasswordSection(false);
            } else {
                toast.error(data.error || 'Güncelleme başarısız');
            }
        } catch {
            toast.error('Güncelleme sırasında hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    if (sessionLoading || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    const inputClass = "w-full px-4 py-3 rounded-xl border bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all";
    const labelClass = "block text-sm font-medium mb-1.5 text-gray-700";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/danisman-panel"
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Profilim</h1>
                        <p className="text-sm text-gray-500">Profil bilgilerinizi düzenleyin</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Photo */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <div className="flex items-center gap-6">
                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-purple-100 flex-shrink-0">
                                {form.photoUrl ? (
                                    <Image
                                        src={toR2ProxyUrl(form.photoUrl)}
                                        alt={form.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-12 h-12 text-purple-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className={labelClass}>
                                    <Camera className="w-4 h-4 inline mr-1" />
                                    Fotoğraf URL
                                </label>
                                <input
                                    type="url"
                                    name="photoUrl"
                                    value={form.photoUrl}
                                    onChange={handleChange}
                                    placeholder="https://example.com/photo.jpg"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </motion.section>

                    {/* Basic Info */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                            <User className="w-5 h-5 text-purple-500" />
                            Kişisel Bilgiler
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Ad Soyad *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Ünvan</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="Emlak Danışmanı"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Hakkında</label>
                                <textarea
                                    name="bio"
                                    value={form.bio}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Kendinizi tanıtın..."
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </motion.section>

                    {/* Contact Info */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                            <Phone className="w-5 h-5 text-purple-500" />
                            İletişim Bilgileri
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Telefon *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="0532 123 45 67"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>WhatsApp</label>
                                <input
                                    type="tel"
                                    name="whatsapp"
                                    value={form.whatsapp}
                                    onChange={handleChange}
                                    placeholder="0532 123 45 67"
                                    className={inputClass}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>
                                    <Mail className="w-4 h-4 inline mr-1" />
                                    E-posta
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="ornek@email.com"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </motion.section>

                    {/* Password Change */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                                <Lock className="w-5 h-5 text-purple-500" />
                                Şifre Değiştir
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowPasswordSection(!showPasswordSection)}
                                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                {showPasswordSection ? 'İptal' : 'Şifre Değiştir'}
                            </button>
                        </div>

                        {showPasswordSection && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className={labelClass}>Mevcut Şifre</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="currentPassword"
                                            value={form.currentPassword}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Yeni Şifre</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={form.newPassword}
                                        onChange={handleChange}
                                        placeholder="En az 6 karakter"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Yeni Şifre (Tekrar)</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </motion.section>

                    {/* QR Code Section */}
                    {consultant?.slug && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="p-6 rounded-2xl bg-white shadow-sm"
                        >
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                                <QrCode className="w-5 h-5 text-purple-500" />
                                Profil QR Kodu
                            </h2>

                            <div className="flex flex-col md:flex-row items-center gap-6">
                                {/* QR Code */}
                                <div
                                    ref={qrRef}
                                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                                >
                                    <QRCodeSVG
                                        value={getProfileUrl()}
                                        size={160}
                                        level="M"
                                        includeMargin={false}
                                        fgColor="#7C3AED"
                                        bgColor="#FFFFFF"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">Profil Linkiniz:</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={getProfileUrl()}
                                                readOnly
                                                className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm border border-gray-200"
                                            />
                                            <a
                                                href={getProfileUrl()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={downloadQR}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium"
                                        >
                                            <Download className="w-4 h-4" />
                                            İndir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={copyProfileUrl}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    Kopyalandı
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4" />
                                                    Link Kopyala
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-xs text-gray-400">
                                        Bu QR kodu müşterilerinize göstererek profil sayfanıza doğrudan erişmelerini sağlayabilirsiniz.
                                    </p>
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4 pb-8">
                        <Link
                            href="/danisman-panel"
                            className="px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            İptal
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Kaydet
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
