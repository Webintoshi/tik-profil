"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight, ArrowLeft, Check, Loader2, User, Mail, Lock,
    Building2, Phone, Globe, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
    type IndustryDefinition,
    subscribeToIndustries
} from "@/lib/industryService";
import {
    type SubscriptionPlan,
    subscribeToPlans
} from "@/lib/subscriptionPlans";
import clsx from "clsx";
import { TikLogo } from "@/components/TikLogo";

export default function KayitOlPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [businessName, setBusinessName] = useState("");
    const [businessSlug, setBusinessSlug] = useState("");
    const [businessPhone, setBusinessPhone] = useState("");

    const [industries, setIndustries] = useState<IndustryDefinition[]>([]);
    const [selectedIndustry, setSelectedIndustry] = useState<string>("");

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<string>("");

    // OWASP: Honeypot field for bot detection (hidden from users)
    const [honeypot, setHoneypot] = useState<string>("");

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubIndustries = subscribeToIndustries((data) => {
                const active = data.filter(i => i.status === "active");
                setIndustries(active);
            });
            const unsubPlans = subscribeToPlans((data) => {
                const active = data.filter(p => p.status === "active");
                setPlans(active);
            });
            return () => {
                unsubIndustries();
                unsubPlans();
            };
        }
    }, []);

    // Auto-generate slug from business name (always)
    useEffect(() => {
        if (businessName) {
            const slug = businessName
                .toLowerCase()
                .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
                .replace(/ö/g, "o").replace(/ç/g, "c").replace(/ı/g, "i")
                .replace(/İ/g, "i").replace(/Ş/g, "s").replace(/Ğ/g, "g")
                .replace(/Ü/g, "u").replace(/Ö/g, "o").replace(/Ç/g, "c")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
            setBusinessSlug(slug);
        } else {
            setBusinessSlug("");
        }
    }, [businessName]);

    const steps = [
        { num: 1, label: "Hesap" },
        { num: 2, label: "İşletme" },
        { num: 3, label: "Sektör" },
    ];

    const canProceed = () => {
        switch (step) {
            case 1: return fullName && email && password.length >= 6;
            case 2: return businessName && businessSlug && businessPhone;
            case 3: return selectedIndustry;
            default: return false;
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // CRITICAL: Required to store cookies from response
                body: JSON.stringify({
                    fullName,
                    email,
                    password,
                    businessName,
                    businessSlug,
                    businessPhone,
                    industryId: selectedIndustry,
                    industryLabel: industries.find(i => i.id === selectedIndustry)?.label || "İşletme",
                    planId: null, // Package optional - free tier by default
                    website: honeypot, // OWASP: Honeypot field - bots fill this
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Hesabınız oluşturuldu!", {
                    description: "İşletme panelinize yönlendiriliyorsunuz...",
                });
                // Increased delay to ensure cookie is properly set before redirect
                setTimeout(() => {
                    window.location.href = data.redirect || "/panel";
                }, 1500);
            } else {
                toast.error(data.message || "Bir hata oluştu", {
                    description: "Lütfen bilgilerinizi kontrol edin.",
                });
            }
        } catch {
            toast.error("Bir hata oluştu", {
                description: "Lütfen tekrar deneyin.",
            });
        }
        setIsLoading(false);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
    };

    return (
        <div className="space-y-10">
            {/* Mobile Header Logo */}
            <div className="lg:hidden flex flex-col items-center mb-8">
                <Link href="/">
                    <TikLogo className="w-12 h-12 mb-4" variant="light" />
                </Link>
                <h1 className="text-2xl font-bold text-[#1d1d1f]">Hemen Başla</h1>
                <p className="text-gray-500 text-sm mt-1">Dijital yolculuğun başlıyor!</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block">
                <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Hemen Başla</h1>
                <p className="text-[#86868b] mt-2 font-medium">30 saniyede ücretsiz hesabınızı oluşturun.</p>
            </div>

            {/* Refined Stepper */}
            <div className="flex items-center justify-between px-1">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <div
                            className={clsx(
                                "relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                                step === s.num
                                    ? "bg-[#0071e3] text-white shadow-lg shadow-blue-500/30 scale-110" // Active
                                    : step > s.num
                                        ? "bg-green-500 text-white" // Completed
                                        : "bg-white border-2 border-gray-200 text-gray-400" // Inactive
                            )}
                        >
                            {step > s.num ? <Check className="w-4 h-4" /> : s.num}

                            {/* Label under step */}
                            <span className={clsx(
                                "absolute -bottom-6 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
                                step === s.num ? "text-[#0071e3]" : "text-gray-400"
                            )}>
                                {s.label}
                            </span>
                        </div>

                        {/* Line */}
                        {i < steps.length - 1 && (
                            <div
                                className={clsx(
                                    "w-12 lg:w-20 h-[2px] mx-3 rounded-full transition-colors duration-300",
                                    step > s.num ? "bg-green-500" : "bg-gray-200"
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Form Steps */}
            <div className="pt-4">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-5"
                        >
                            {/* OWASP: Honeypot */}
                            <input
                                type="text"
                                name="website"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                                autoComplete="off"
                                tabIndex={-1}
                                aria-hidden="true"
                                style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                            />

                            <InputGroup label="Ad Soyad" icon={User}>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Adınız ve soyadınız"
                                    className="w-full pl-12 pr-4 h-12 rounded-xl bg-white border border-gray-200 text-[#1d1d1f] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all font-medium"
                                />
                            </InputGroup>

                            <InputGroup label="E-posta" icon={Mail}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ornek@email.com"
                                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                                    inputMode="email"
                                    autoComplete="email"
                                    className="w-full pl-12 pr-4 h-12 rounded-xl bg-white border border-gray-200 text-[#1d1d1f] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all font-medium"
                                />
                            </InputGroup>

                            <InputGroup label="Şifre" icon={Lock}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="En az 6 karakter"
                                    className="w-full pl-12 pr-4 h-12 rounded-xl bg-white border border-gray-200 text-[#1d1d1f] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all font-medium"
                                />
                            </InputGroup>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-5"
                        >
                            <InputGroup label="İşletme Adı" icon={Building2}>
                                <input
                                    type="text"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="İşletmenizin adı"
                                    className="w-full pl-12 pr-4 h-12 rounded-xl bg-white border border-gray-200 text-[#1d1d1f] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all font-medium"
                                />
                            </InputGroup>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Profil Linki</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={businessSlug}
                                        readOnly
                                        className="w-full pl-12 pr-4 h-12 rounded-xl bg-gray-50 border border-gray-200 text-[#1d1d1f] font-medium font-mono cursor-not-allowed opacity-70"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2 font-medium">
                                    tikprofil.com/<span className="text-[#0071e3]">{businessSlug || "isletme"}</span>
                                </p>
                            </div>

                            <InputGroup label="Telefon" icon={Phone}>
                                <input
                                    type="tel"
                                    value={businessPhone}
                                    onChange={(e) => {
                                        // Only allow numbers
                                        const numericValue = e.target.value.replace(/\D/g, '');
                                        setBusinessPhone(numericValue);
                                    }}
                                    placeholder="05XX XXX XX XX"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={11}
                                    className="w-full pl-12 pr-4 h-12 rounded-xl bg-white border border-gray-200 text-[#1d1d1f] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all font-medium"
                                />
                            </InputGroup>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <InputGroup label="Sektörünüz" icon={Building2}>
                                <select
                                    value={selectedIndustry}
                                    onChange={(e) => setSelectedIndustry(e.target.value)}
                                    className={clsx(
                                        "w-full pl-12 pr-10 h-12 rounded-xl bg-white border border-gray-200 font-semibold appearance-none cursor-pointer",
                                        "focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all",
                                        selectedIndustry ? "text-[#1d1d1f]" : "text-gray-500"
                                    )}
                                    style={{ color: selectedIndustry ? '#1d1d1f' : '#6b7280' }}
                                >
                                    <option value="" disabled style={{ color: '#6b7280' }}>İşletme türünü seçin...</option>
                                    {industries.map((industry) => (
                                        <option key={industry.id} value={industry.id} style={{ color: '#1d1d1f' }}>
                                            {industry.label}
                                        </option>
                                    ))}
                                </select>
                                {/* Custom dropdown arrow */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </InputGroup>

                            {/* Show selected industry info */}
                            {selectedIndustry && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-4 bg-blue-50/50 border border-[#0071e3]/20 rounded-xl"
                                >
                                    <div className="p-2 bg-[#0071e3]/10 rounded-lg">
                                        <Sparkles className="w-5 h-5 text-[#0071e3]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[#0071e3]">
                                            {industries.find(i => i.id === selectedIndustry)?.label}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Bu sektör için özelleştirilmiş panel ve özellikler sunulacak
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
                {step > 1 && (
                    <button
                        type="button"
                        onClick={() => setStep(s => s - 1)}
                        className="w-1/3 flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-gray-100 text-[#1d1d1f] hover:bg-gray-200 font-semibold transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Geri
                    </button>
                )}

                {step < 3 ? (
                    <button
                        type="button"
                        onClick={() => setStep(s => s + 1)}
                        disabled={!canProceed()}
                        className="flex-1 flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-[#0071e3] text-white font-semibold hover:bg-[#0077ed] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                    >
                        Devam Et
                        <ArrowRight className="h-4 w-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canProceed() || isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-[#0071e3] text-white font-semibold hover:bg-[#0077ed] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Check className="h-5 w-5" />
                                Hesabı Oluştur
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Login link */}
            <p className="text-center text-sm text-[#86868b] font-medium">
                Zaten hesabınız var mı?{" "}
                <Link href="/giris-yap" className="text-[#0071e3] hover:text-[#0077ed] hover:underline">
                    Giriş Yapın
                </Link>
            </p>
        </div>
    );
}

function InputGroup({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
            <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                {children}
            </div>
        </div>
    );
}
