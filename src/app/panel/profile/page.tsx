"use client";

import { useState, useEffect, useRef } from "react";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { motion, AnimatePresence } from "framer-motion";
import {
    Building2, Camera, Phone,
    Sun, Moon, Eye, QrCode,
    Clock, Check, Loader2, Copy,
    Star, Instagram, Facebook, Youtube, Linkedin, Globe,
    MessageCircle, Link2, Music, Search, Sparkles
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { logActivity } from "@/lib/services/auditService";
import { CircularProgress } from "@/components/panel/CircularProgress";
import { ProfileWizard } from "@/components/panel/ProfileWizard";
import { toR2ProxyUrl } from "@/lib/publicImage";

// ============================================
// SOCIAL MEDIA PLATFORMS (Pre-defined)
// ============================================
const SOCIAL_FIELDS = [
    { id: "instagram", label: "Instagram", icon: Instagram, placeholder: "@kullanici_adi veya instagram.com/...", color: "text-pink-500" },
    { id: "google", label: "Google Yorum", icon: Star, placeholder: "g.page/isletme-adi veya Google yorum linki", color: "text-yellow-500" },
    { id: "facebook", label: "Facebook", icon: Facebook, placeholder: "facebook.com/sayfa-adi", color: "text-blue-600" },
    { id: "tiktok", label: "TikTok", icon: Music, placeholder: "@kullanici_adi veya tiktok.com/@...", color: "text-white" },
    { id: "youtube", label: "YouTube", icon: Youtube, placeholder: "@kanal veya youtube.com/@...", color: "text-red-500" },
    { id: "twitter", label: "X (Twitter)", icon: Link2, placeholder: "@kullanici_adi veya x.com/...", color: "text-gray-400" },
    { id: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin.com/company/...", color: "text-blue-400" },
    { id: "website", label: "Website", icon: Globe, placeholder: "https://www.siteniz.com", color: "text-purple-400" },
];

// ============================================
// TYPES
// ============================================
interface SocialLinks {
    google: string;
    instagram: string;
    facebook: string;
    twitter: string;
    tiktok: string;
    youtube: string;
    linkedin: string;
    whatsapp: string;
    website: string;
}

interface WorkingDay {
    day: string;
    dayLabel: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
}

interface BusinessProfile {
    name: string;
    slogan: string;
    about: string;
    logo?: string;
    cover?: string;
    phone: string;
    address: string;
    mapsUrl: string;
    socialLinks: SocialLinks;
    showHours: boolean;
    workingHours: WorkingDay[];
}

// ============================================
// DEFAULT VALUES
// ============================================
const DEFAULT_SOCIAL_LINKS: SocialLinks = {
    google: "",
    instagram: "",
    facebook: "",
    twitter: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    whatsapp: "",
    website: "",
};

const DEFAULT_WORKING_HOURS: WorkingDay[] = [
    { day: "monday", dayLabel: "Pazartesi", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "tuesday", dayLabel: "Salı", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "wednesday", dayLabel: "Çarşamba", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "thursday", dayLabel: "Perşembe", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "friday", dayLabel: "Cuma", isOpen: true, openTime: "09:00", closeTime: "18:00" },
    { day: "saturday", dayLabel: "Cumartesi", isOpen: false, openTime: "10:00", closeTime: "16:00" },
    { day: "sunday", dayLabel: "Pazar", isOpen: false, openTime: "10:00", closeTime: "16:00" },
];

const INITIAL_PROFILE: BusinessProfile = {
    name: "",
    slogan: "",
    about: "",
    phone: "",
    address: "",
    mapsUrl: "",
    socialLinks: DEFAULT_SOCIAL_LINKS,
    showHours: true,
    workingHours: DEFAULT_WORKING_HOURS,
};

// ============================================
// GLASS CARD COMPONENT
// ============================================
function GlassCard({
    children,
    className = "",
    isDark = false
}: {
    children: React.ReactNode;
    className?: string;
    isDark?: boolean;
}) {
    return (
        <div
            className={clsx(
                "rounded-2xl border overflow-hidden transition-all duration-300",
                isDark
                    ? "bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-2xl"
                    : "bg-white/80 border-white/50 backdrop-blur-xl shadow-xl shadow-black/5",
                className
            )}
        >
            {children}
        </div>
    );
}

// ============================================
// THEME TOGGLE BUTTON
// ============================================
function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <button
            onClick={toggleTheme}
            className={clsx(
                "p-3 rounded-xl transition-all duration-300",
                isDark
                    ? "bg-white/10 text-yellow-400 hover:bg-white/20 shadow-lg shadow-yellow-500/10"
                    : "bg-black/5 text-gray-600 hover:bg-black/10"
            )}
            title={isDark ? "Gündüz Modu" : "Gece Modu"}
        >
            <motion.div
                initial={false}
                animate={{ rotate: isDark ? 180 : 0 }}
                transition={{ duration: 0.3 }}
            >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.div>
        </button>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function ProfilePage() {
    const { theme, isDark } = useTheme();
    const { session, isLoading: sessionLoading } = useBusinessSession();
    const [profile, setProfile] = useState<BusinessProfile>(INITIAL_PROFILE);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [businessId, setBusinessId] = useState<string>("");
    const [businessSlug, setBusinessSlug] = useState<string>("");

    // Image upload states
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isFindingGoogle, setIsFindingGoogle] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Calculate profile completion percentage
    const calculateProgress = () => {
        let filled = 0;
        const total = 10; // Total fields to check

        if (profile.name) filled++;
        if (profile.slogan) filled++;
        if (profile.about) filled++;
        if (profile.logo) filled++;
        if (profile.cover) filled++;
        if (profile.phone) filled++;
        if (profile.address) filled++;
        if (profile.socialLinks.instagram) filled++;
        if (profile.socialLinks.google) filled++;
        if (profile.workingHours.some(h => h.isOpen)) filled++;

        return Math.round((filled / total) * 100);
    };

    // Handle logo upload
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !businessId) return;

        setIsUploadingLogo(true);
        try {
            const { uploadLogo } = await import('@/lib/storage');
            const result = await uploadLogo(businessId, file);

            if (result.success && result.url) {
                // Update local state
                setProfile(prev => ({ ...prev, logo: result.url }));

                // Save to document store immediately
                const { updateDocumentREST } = await import('@/lib/documentStore');
                await updateDocumentREST('businesses', businessId, { logo: result.url });

                toast.success('Logo başarıyla yüklendi');
            } else {
                toast.error(result.error || 'Logo yüklenemedi');
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            toast.error('Logo yüklenirken bir hata oluştu');
        } finally {
            setIsUploadingLogo(false);
            // Reset input
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    // Handle cover upload
    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !businessId) return;

        setIsUploadingCover(true);
        try {
            const { uploadCover } = await import('@/lib/storage');
            const result = await uploadCover(businessId, file);

            if (result.success && result.url) {
                // Update local state
                setProfile(prev => ({ ...prev, cover: result.url }));

                // Save to document store immediately
                const { updateDocumentREST } = await import('@/lib/documentStore');
                await updateDocumentREST('businesses', businessId, { cover: result.url });

                toast.success('Kapak fotoğrafı başarıyla yüklendi');
            } else {
                toast.error(result.error || 'Kapak fotoğrafı yüklenemedi');
            }
        } catch (error) {
            console.error('Cover upload error:', error);
            toast.error('Kapak fotoğrafı yüklenirken bir hata oluştu');
        } finally {
            setIsUploadingCover(false);
            // Reset input
            if (coverInputRef.current) coverInputRef.current.value = '';
        }
    };

    // Load profile from document store
    useEffect(() => {
        if (sessionLoading) return;
        if (!session) {
            setIsLoading(false);
            return;
        }

        setBusinessId(session.businessId);
        setBusinessSlug(session.businessSlug);

        const loadProfile = async () => {
            try {
                const { getDocumentREST } = await import("@/lib/documentStore");
                const doc = await getDocumentREST("businesses", session.businessId);

                if (doc) {
                    setProfile({
                        name: (doc.name as string) || session.businessName || "",
                        slogan: (doc.slogan as string) || "",
                        about: (doc.about as string) || "",
                        logo: (doc.logo as string) || undefined,
                        cover: (doc.cover as string) || undefined,
                        phone: (doc.phone as string) || "",
                        address: (doc.address as string) || "",
                        mapsUrl: (doc.mapsUrl as string) || "",
                        socialLinks: (doc.socialLinks as SocialLinks) || DEFAULT_SOCIAL_LINKS,
                        showHours: (doc.showHours as boolean) ?? true,
                        workingHours: (doc.workingHours as WorkingDay[]) || DEFAULT_WORKING_HOURS,
                    });
                } else {
                    // Use session data as fallback
                    setProfile({
                        ...INITIAL_PROFILE,
                        name: session.businessName || "",
                    });
                }
            } catch (error) {
                console.error("Failed to load profile:", error);
                setProfile({
                    ...INITIAL_PROFILE,
                    name: session.businessName || "",
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [session?.businessId, sessionLoading]);

    // Update profile helper
    const updateProfile = (updates: Partial<BusinessProfile>) => {
        setProfile(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    // Update social link
    const updateSocialLink = (key: keyof SocialLinks, value: string) => {
        setProfile(prev => ({
            ...prev,
            socialLinks: { ...prev.socialLinks, [key]: value }
        }));
        setHasChanges(true);
    };

    // Save profile to document store
    const handleSave = async () => {
        if (!businessId) {
            toast.error("İşletme bilgisi bulunamadı");
            return;
        }

        // Validation (Matches Flutter Logic)
        if (!profile.name.trim()) {
            toast.error("İşletme adı gerekli.");
            return;
        }
        if (profile.slogan.length > 60) {
            toast.error("Slogan en fazla 60 karakter olabilir.");
            return;
        }

        setIsSaving(true);
        try {
            const { updateDocumentREST } = await import("@/lib/documentStore");
            await updateDocumentREST("businesses", businessId, {
                name: profile.name,
                slogan: profile.slogan,
                about: profile.about,
                phone: profile.phone,
                address: profile.address,
                mapsUrl: profile.mapsUrl,
                socialLinks: profile.socialLinks,
                showHours: profile.showHours,
                workingHours: profile.workingHours,
            });

            // Log profile update
            await logActivity({
                actor_id: businessId,
                actor_name: profile.name || "İşletme",
                action_type: "PROFILE_UPDATE",
                metadata: {
                    updated_fields: ["name", "slogan", "phone", "address"],
                },
            });

            toast.success("Değişiklikler kaydedildi");
            setHasChanges(false);
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Kaydetme hatası");
        }
        setIsSaving(false);
    };

    // Working hours handlers
    const updateWorkingDay = (day: string, field: keyof WorkingDay, value: any) => {
        const newHours = profile.workingHours.map(d =>
            d.day === day ? { ...d, [field]: value } : d
        );
        updateProfile({ workingHours: newHours });
    };

    const applyToAllWeekdays = () => {
        const monday = profile.workingHours.find(d => d.day === "monday");
        if (!monday) return;

        const newHours = profile.workingHours.map(d => {
            if (["monday", "tuesday", "wednesday", "thursday", "friday"].includes(d.day)) {
                return { ...d, isOpen: monday.isOpen, openTime: monday.openTime, closeTime: monday.closeTime };
            }
            return d;
        });
        updateProfile({ workingHours: newHours });
        toast.success("Hafta içi günlere uygulandı");
    };

    // Common styles
    const inputClass = clsx(
        "w-full px-4 py-3 rounded-[14px] border outline-none transition-all duration-300",
        isDark
            ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:bg-white/10"
            : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
    );

    const labelClass = clsx(
        "block text-sm font-medium mb-2",
        isDark ? "text-white/60" : "text-gray-600"
    );

    const sectionHeaderClass = clsx(
        "px-6 py-4 border-b",
        isDark ? "border-white/5" : "border-gray-100/50"
    );

    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-white/50" : "text-gray-500";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", textSecondary)} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* ============================================ */}
            {/* HEADER BAR */}
            {/* ============================================ */}
            <div className="flex items-center justify-between py-6">
                <div>
                    <h1 className={clsx("text-2xl font-bold tracking-tight", textPrimary)}>
                        İşletme Profili
                    </h1>
                    <p className={textSecondary}>
                        Profil bilgilerinizi düzenleyin
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300",
                            hasChanges
                                ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30"
                                : isDark
                                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Kaydet
                    </button>
                </div>
            </div>

            {/* ============================================ */}
            {/* COVER & PROFILE SECTION */}
            {/* ============================================ */}
            <GlassCard isDark={isDark} className="mb-6">
                {/* Cover Photo */}
                {/* Cover Photo */}
                <div className="relative h-48 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 group overflow-hidden">
                    {profile.cover ? (
                        <img src={toR2ProxyUrl(profile.cover)} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <Camera className="h-10 w-10 text-white/40 mx-auto mb-2" />
                                <span className="text-white/60 text-sm">Kapak Fotoğrafı</span>
                            </div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {/* Hidden file input for cover */}
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        onChange={handleCoverUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isUploadingCover}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                    >
                        {isUploadingCover ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <>
                                <Camera className="h-6 w-6 mr-2" />
                                Değiştir
                            </>
                        )}
                    </button>
                </div>

                {/* Profile Row */}
                <div className="px-6 py-5 flex items-center gap-6">
                    {/* Profile Photo */}
                    <div className="relative -mt-16 flex-shrink-0 group">
                        <div className={clsx(
                            "h-28 w-28 rounded-full border-4 flex items-center justify-center overflow-hidden shadow-xl",
                            isDark ? "border-[#0a0a0a] bg-white/10" : "border-white bg-gray-100"
                        )}>
                            {profile.logo ? (
                                <img src={toR2ProxyUrl(profile.logo)} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                                <Camera className={clsx("h-10 w-10", isDark ? "text-white/40" : "text-gray-300")} />
                            )}
                        </div>
                        {/* Hidden file input for logo */}
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => logoInputRef.current?.click()}
                            disabled={isUploadingLogo}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer disabled:cursor-wait"
                        >
                            {isUploadingLogo ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Camera className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    {/* Name & Slogan */}
                    <div className="flex-1 min-w-0">
                        <h2 className={clsx("text-xl font-bold truncate", textPrimary)}>
                            {profile.name || "İşletme Adı"}
                        </h2>
                        <p className={clsx("text-sm truncate", textSecondary)}>
                            {profile.slogan || "Slogan ekleyin..."}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Progress Indicator - Mobile */}
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                                "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25"
                            )}
                        >
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">Profil Sihirbazı</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                {calculateProgress()}%
                            </span>
                        </button>
                        <button
                            onClick={() => window.open(`/${businessSlug}`, '_blank')}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all backdrop-blur-sm",
                                isDark
                                    ? "bg-white/10 text-white hover:bg-white/20"
                                    : "bg-white border border-gray-200 text-gray-700 shadow-sm hover:border-blue-300 hover:text-blue-600"
                            )}>
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Profili Gör</span>
                        </button>
                        <button
                            onClick={() => window.location.href = '/panel/qr'}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all backdrop-blur-sm",
                                isDark
                                    ? "bg-white/10 text-white hover:bg-white/20"
                                    : "bg-white border border-gray-200 text-gray-700 shadow-sm hover:border-blue-300 hover:text-blue-600"
                            )}>
                            <QrCode className="h-4 w-4" />
                            <span className="hidden sm:inline">QR Kod Oluştur</span>
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* ============================================ */}
            {/* GENERAL INFO SECTION */}
            {/* ============================================ */}
            <GlassCard isDark={isDark} className="mb-6">
                <div className={sectionHeaderClass}>
                    <h2 className={clsx("font-semibold flex items-center gap-2", textPrimary)}>
                        <Building2 className={isDark ? "h-5 w-5 text-white/50" : "h-5 w-5 text-gray-400"} />
                        Genel Bilgiler
                    </h2>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className={labelClass}>İşletme Adı</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => updateProfile({ name: e.target.value })}
                            placeholder="İşletmenizin adı"
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Slogan</label>
                        <input
                            type="text"
                            value={profile.slogan}
                            onChange={(e) => updateProfile({ slogan: e.target.value })}
                            placeholder="Kısa, anlaşılır ve profesyonel (Max 60)"
                            maxLength={60}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>İşletme Açıklaması</label>
                        <textarea
                            value={profile.about}
                            onChange={(e) => updateProfile({ about: e.target.value })}
                            placeholder="İşletmenizi kısaca tanıtın (Max 155 karakter)"
                            maxLength={155}
                            rows={3}
                            className={clsx(inputClass, "resize-none")}
                        />
                        <p className={clsx("text-xs mt-1", profile.about.length >= 140 ? "text-orange-500" : (isDark ? "text-white/40" : "text-gray-400"))}>
                            {profile.about.length}/155 karakter
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* ============================================ */}
            {/* CONTACT SECTION */}
            {/* ============================================ */}
            <GlassCard isDark={isDark} className="mb-6">
                <div className={sectionHeaderClass}>
                    <h2 className={clsx("font-semibold flex items-center gap-2", textPrimary)}>
                        <Phone className={isDark ? "h-5 w-5 text-white/50" : "h-5 w-5 text-gray-400"} />
                        İletişim Bilgileri
                    </h2>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Telefon</label>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => updateProfile({ phone: e.target.value })}
                                placeholder="05XX XXX XX XX"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={clsx(labelClass, "flex items-center gap-2")}>
                                <MessageCircle className="h-4 w-4 text-green-500" />
                                WhatsApp
                            </label>
                            <input
                                type="tel"
                                value={profile.socialLinks.whatsapp}
                                onChange={(e) => updateSocialLink("whatsapp", e.target.value)}
                                placeholder="5XX XXX XX XX"
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Adres</label>
                        <textarea
                            value={profile.address}
                            onChange={(e) => updateProfile({ address: e.target.value })}
                            placeholder="Açık adres (Google Maps'ten alınacak)"
                            rows={3}
                            className={clsx(inputClass, "resize-none")}
                        />
                    </div>
                </div>
            </GlassCard>

            {/* ============================================ */}
            {/* SOCIAL MEDIA SECTION - PRE-DEFINED FORMS */}
            {/* ============================================ */}
            <GlassCard isDark={isDark} className="mb-6">
                <div className={sectionHeaderClass}>
                    <h2 className={clsx("font-semibold flex items-center gap-2", textPrimary)}>
                        🔗 Sosyal Medya & Linkler
                    </h2>
                    <p className={clsx("text-sm mt-1", textSecondary)}>
                        Hesaplarınızı doldurun, boş alanlar profilden otomatik gizlenir
                    </p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SOCIAL_FIELDS.map((field) => {
                            const Icon = field.icon;
                            const isGoogleField = field.id === "google";

                            // Google Yorum alanı için özel render
                            if (isGoogleField) {
                                return (
                                    <div key={field.id} className="space-y-1.5">
                                        <label className={clsx(
                                            "flex items-center gap-2 text-sm font-medium",
                                            isDark ? "text-white/70" : "text-gray-700"
                                        )}>
                                            <Icon className={clsx("h-4 w-4", field.color)} />
                                            {field.label}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={profile.socialLinks.google}
                                                onChange={(e) => updateSocialLink("google", e.target.value)}
                                                placeholder={field.placeholder}
                                                className={clsx(inputClass, "flex-1")}
                                            />
                                            <button
                                                onClick={async () => {
                                                    if (!profile.name) {
                                                        toast.error("İşletme adı gerekli");
                                                        return;
                                                    }
                                                    setIsFindingGoogle(true);
                                                    try {
                                                        const res = await fetch("/api/google-places", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({
                                                                businessName: profile.name,
                                                                address: profile.address,
                                                                phone: profile.phone,
                                                            }),
                                                        });
                                                        const data = await res.json();
                                                        if (data.ok && data.reviewsUrl) {
                                                            updateSocialLink("google", data.reviewsUrl);
                                                            toast.success(`Google yorum linki bulundu!`);
                                                        } else {
                                                            toast.error(data.message || "Google'da işletme bulunamadı");
                                                        }
                                                    } catch (error) {
                                                        console.error("Google search error:", error);
                                                        toast.error("Arama sırasında hata oluştu");
                                                    }
                                                    setIsFindingGoogle(false);
                                                }}
                                                disabled={isFindingGoogle || !profile.name}
                                                className={clsx(
                                                    "px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2",
                                                    isDark
                                                        ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
                                                        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
                                                )}
                                            >
                                                {isFindingGoogle ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                                Bul
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={field.id} className="space-y-1.5">
                                    <label className={clsx(
                                        "flex items-center gap-2 text-sm font-medium",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        <Icon className={clsx("h-4 w-4", field.color)} />
                                        {field.label}
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.socialLinks[field.id as keyof SocialLinks]}
                                        onChange={(e) => updateSocialLink(field.id as keyof SocialLinks, e.target.value)}
                                        placeholder={field.placeholder}
                                        className={inputClass}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </GlassCard>

            {/* ============================================ */}
            {/* WORKING HOURS SECTION */}
            {/* ============================================ */}
            <GlassCard isDark={isDark}>
                <div className={sectionHeaderClass}>
                    <div className="flex items-center justify-between">
                        <h2 className={clsx("font-semibold flex items-center gap-2", textPrimary)}>
                            <Clock className={isDark ? "h-5 w-5 text-white/50" : "h-5 w-5 text-gray-400"} />
                            Çalışma Saatleri
                        </h2>
                        <button
                            onClick={() => updateProfile({ showHours: !profile.showHours })}
                            className={clsx(
                                "relative w-14 h-8 rounded-full transition-all duration-300",
                                profile.showHours
                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-emerald-500/30"
                                    : isDark ? "bg-white/10" : "bg-gray-200"
                            )}
                        >
                            <span
                                className={clsx(
                                    "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-300",
                                    profile.showHours && "translate-x-6"
                                )}
                            />
                        </button>
                    </div>
                    <p className={clsx("text-sm mt-1", textSecondary)}>
                        {profile.showHours ? "Çalışma saatleri profilinde görünür" : "Çalışma saatleri gizli"}
                    </p>
                </div>

                <AnimatePresence>
                    {profile.showHours && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="p-6 space-y-4">
                                <div className="flex justify-end">
                                    <button
                                        onClick={applyToAllWeekdays}
                                        className="flex items-center gap-2 text-sm font-medium text-emerald-500 hover:text-blue-400"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Hafta İçine Uygula
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {profile.workingHours.map((day) => (
                                        <div
                                            key={day.day}
                                            className={clsx(
                                                "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
                                                isDark
                                                    ? day.isOpen ? "bg-white/5" : "bg-white/[0.02]"
                                                    : day.isOpen ? "bg-black/[0.02]" : "bg-transparent"
                                            )}
                                        >
                                            <button
                                                onClick={() => updateWorkingDay(day.day, "isOpen", !day.isOpen)}
                                                className={clsx(
                                                    "relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0",
                                                    day.isOpen
                                                        ? "bg-green-500 shadow-lg shadow-green-500/30"
                                                        : isDark ? "bg-white/10" : "bg-gray-300"
                                                )}
                                            >
                                                <span
                                                    className={clsx(
                                                        "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-300",
                                                        day.isOpen && "translate-x-5"
                                                    )}
                                                />
                                            </button>
                                            <span className={clsx(
                                                "w-24 font-medium",
                                                day.isOpen
                                                    ? textPrimary
                                                    : textSecondary
                                            )}>
                                                {day.dayLabel}
                                            </span>
                                            {day.isOpen ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="time"
                                                        value={day.openTime}
                                                        onChange={(e) => updateWorkingDay(day.day, "openTime", e.target.value)}
                                                        className={clsx(
                                                            "px-3 py-2 rounded-lg border text-sm transition-all",
                                                            isDark
                                                                ? "bg-white/5 border-white/10 text-white"
                                                                : "bg-white border-gray-200 text-gray-900"
                                                        )}
                                                    />
                                                    <span className={textSecondary}>-</span>
                                                    <input
                                                        type="time"
                                                        value={day.closeTime}
                                                        onChange={(e) => updateWorkingDay(day.day, "closeTime", e.target.value)}
                                                        className={clsx(
                                                            "px-3 py-2 rounded-lg border text-sm transition-all",
                                                            isDark
                                                                ? "bg-white/5 border-white/10 text-white"
                                                                : "bg-white border-gray-200 text-gray-900"
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <span className={clsx("text-sm", textSecondary)}>Kapalı</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </GlassCard>

            <div className="h-8" />

            {/* Profile Wizard Modal */}
            <ProfileWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                isDark={isDark}
                profile={{
                    name: profile.name,
                    slogan: profile.slogan,
                    about: profile.about,
                    phone: profile.phone,
                    address: profile.address,
                    mapsUrl: profile.mapsUrl,
                    logo: profile.logo || "",
                    cover: profile.cover || "",
                    socialLinks: profile.socialLinks as unknown as Record<string, string>,
                    workingHours: profile.workingHours.reduce((acc, day) => {
                        acc[day.day] = { open: day.openTime, close: day.closeTime, closed: !day.isOpen };
                        return acc;
                    }, {} as Record<string, { open: string; close: string; closed: boolean }>)
                }}
                onUpdateProfile={(field, value) => {
                    setProfile(prev => ({ ...prev, [field]: value }));
                    setHasChanges(true);
                }}
                onUpdateSocialLink={(field, value) => {
                    setProfile(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, [field]: value }
                    }));
                    setHasChanges(true);
                }}
                onUpdateWorkingHours={(day, field, value) => {
                    setProfile(prev => ({
                        ...prev,
                        workingHours: prev.workingHours.map(d => {
                            if (d.day === day) {
                                if (field === 'closed') return { ...d, isOpen: !value };
                                if (field === 'open') return { ...d, openTime: value as string };
                                if (field === 'close') return { ...d, closeTime: value as string };
                            }
                            return d;
                        })
                    }));
                    setHasChanges(true);
                }}
                onUploadLogo={() => logoInputRef.current?.click()}
                onUploadCover={() => coverInputRef.current?.click()}
            />
        </div>
    );
}
