"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight, ArrowLeft, Check, Loader2, User, Mail, Lock,
    Building2, Phone, Globe, Sparkles, ChevronDown, Search
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

// Category labels mapping
const CATEGORY_LABELS: Record<string, string> = {
    yeme_icme: "Yeme & İçme",
    saglik: "Sağlık & Bakım",
    hizmet: "Hizmet Sektörü",
    perakende: "Perakende & Ticaret",
    konaklama: "Konaklama & Turizm",
    ulasim: "Ulaşım & Lojistik",
    egitim: "Eğitim & Gelişim",
    eglence: "Eğlence & Medya",
};

// Group industries by category
function groupIndustries(industries: IndustryDefinition[]) {
    const groups: Record<string, IndustryDefinition[]> = {};
    
    industries.forEach(ind => {
        const cat = ind.category || "other";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ind);
    });
    
    return Object.entries(groups).map(([category, items]) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        items
    }));
}

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
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<string>("");

    // OWASP: Honeypot field for bot detection (hidden from users)
    const [honeypot, setHoneypot] = useState<string>("");

    // Fetch only ACTIVE industries from super admin panel
    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubIndustries = subscribeToIndustries((data) => {
                // ONLY show ACTIVE industries (set by super admin)
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
                credentials: "include",
                body: JSON.stringify({
                    fullName,
                    email,
                    password,
                    businessName,
                    businessSlug,
                    businessPhone,
                    industryId: selectedIndustry,
                    industryLabel: industries.find(i => i.id === selectedIndustry)?.label || "İşletme",
                    planId: null,
                    website: honeypot,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Hesabınız oluşturuldu!", {
                    description: "İşletme panelinize yönlendiriliyorsunuz...",
                });
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

    // Filter industries by search
    const filteredIndustries = searchQuery
        ? industries.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : industries;

    const groupedIndustries = groupIndustries(filteredIndustries);
    const selectedIndustryLabel = industries.find(i => i.id === selectedIndustry)?.label;

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
                                    ? "bg-[#0071e3] text-white shadow-lg shadow-blue-500/30 scale-110"
                                    : step > s.num
                                        ? "bg-green-500 text-white"
                                        : "bg-white border-2 border-gray-200 text-gray-400"
                            )}
                        >
                            {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                            <span className={clsx(
                                "absolute -bottom-6 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
                                step === s.num ? "text-[#0071e3]" : "text-gray-400"
                            )}>
                                {s.label}
                            </span>
                        </div>
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
                            {/* Custom Grouped Dropdown */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    İşletme Türü
                                </label>
                                
                                {/* Selected Value Display */}
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={clsx(
                                        "w-full h-12 rounded-xl border-2 bg-white flex items-center justify-between px-4 transition-all",
                                        isDropdownOpen 
                                            ? "border-[#0071e3] ring-2 ring-[#0071e3]/20" 
                                            : selectedIndustry 
                                                ? "border-gray-200" 
                                                : "border-gray-200"
                                    )}
                                >
                                    <span className={clsx(
                                        "font-medium",
                                        selectedIndustry ? "text-[#1d1d1f]" : "text-gray-400"
                                    )}>
                                        {selectedIndustryLabel || "İşletme türünüzü seçin..."}
                                    </span>
                                    <ChevronDown className={clsx(
                                        "w-5 h-5 text-gray-400 transition-transform",
                                        isDropdownOpen && "rotate-180"
                                    )} />
                                </button>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl max-h-[320px] overflow-hidden"
                                        >
                                            {/* Search */}
                                            <div className="p-3 border-b border-gray-100">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        placeholder="Ara..."
                                                        autoFocus
                                                        className="w-full pl-9 pr-3 h-9 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Grouped Options */}
                                            <div className="overflow-y-auto max-h-[240px]">
                                                {groupedIndustries.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">
                                                        Sonuç bulunamadı
                                                    </div>
                                                ) : (
                                                    groupedIndustries.map((group) => (
                                                        <div key={group.category}>
                                                            <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                {group.label}
                                                            </div>
                                                            {group.items.map((industry) => (
                                                                <button
                                                                    key={industry.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedIndustry(industry.id);
                                                                        setIsDropdownOpen(false);
                                                                        setSearchQuery("");
                                                                    }}
                                                                    className={clsx(
                                                                        "w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2",
                                                                        selectedIndustry === industry.id
                                                                            ? "bg-blue-50 text-[#0071e3] font-medium"
                                                                            : "text-gray-700 hover:bg-gray-50"
                                                                    )}
                                                                >
                                                                    {selectedIndustry === industry.id && (
                                                                        <Check className="w-4 h-4" />
                                                                    )}
                                                                    {industry.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Show selected industry info */}
                            {selectedIndustry && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-4 bg-blue-50/50 border border-[#0071e3]/20 rounded-xl"
                                >
                                    <div className="p-2 bg-[#0071e3]/10 rounded-lg">
                                        <IndustryIcon iconName={industries.find(i => i.id === selectedIndustry)?.icon} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[#0071e3]">
                                            {selectedIndustryLabel}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Bu sektör için özel profil hazırlandı
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Info text */}
                            <p className="text-xs text-gray-400 text-center">
                                Sadece aktif işletme türleri listelenir
                            </p>
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

// Industry icon mapper based on industry icon field
function IndustryIcon({ iconName }: { iconName?: string }) {
    const icons: Record<string, React.ReactNode> = {
        Utensils: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        ),
        Scissors: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="6" cy="6" r="3" strokeWidth={2} />
                <circle cx="6" cy="18" r="3" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
        ),
        Stethoscope: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
        Building: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
        Cat: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        Home: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
        Dumbbell: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
        ),
        Store: (
            <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
    };
    
    return icons[iconName || ""] || (
        <Sparkles className="w-5 h-5 text-[#0071e3]" />
    );
}
