"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, ChevronLeft, ChevronRight, Check,
    Building2, Image, Phone, Share2, Clock,
    Sparkles
} from "lucide-react";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";

// Step configuration
const STEPS = [
    { id: 1, title: "Temel Bilgiler", icon: Building2, fields: ["name", "slogan", "about"] },
    { id: 2, title: "Görseller", icon: Image, fields: ["logo", "cover"] },
    { id: 3, title: "İletişim", icon: Phone, fields: ["phone", "address", "mapsUrl"] },
    { id: 4, title: "Sosyal Medya", icon: Share2, fields: ["instagram", "facebook", "google", "website"] },
    { id: 5, title: "Çalışma Saatleri", icon: Clock, fields: ["workingHours"] },
];

interface ProfileWizardProps {
    isOpen: boolean;
    onClose: () => void;
    isDark: boolean;
    // Profile data
    profile: {
        name: string;
        slogan: string;
        about: string;
        phone: string;
        address: string;
        mapsUrl: string;
        logo: string;
        cover: string;
        socialLinks: Record<string, string>;
        workingHours: Record<string, { open: string; close: string; closed: boolean }>;
    };
    // Update handlers
    onUpdateProfile: (field: string, value: string) => void;
    onUpdateSocialLink: (field: string, value: string) => void;
    onUpdateWorkingHours: (day: string, field: string, value: string | boolean) => void;
    onUploadLogo: () => void;
    onUploadCover: () => void;
}

export function ProfileWizard({
    isOpen,
    onClose,
    isDark,
    profile,
    onUpdateProfile,
    onUpdateSocialLink,
    onUpdateWorkingHours,
    onUploadLogo,
    onUploadCover,
}: ProfileWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);

    // Calculate step completion
    const getStepCompletion = (stepId: number) => {
        const step = STEPS.find(s => s.id === stepId);
        if (!step) return false;

        return step.fields.every(field => {
            if (field === "workingHours") return Object.keys(profile.workingHours).length > 0;
            if (["instagram", "facebook", "google", "website"].includes(field)) {
                return !!profile.socialLinks[field];
            }
            return !!(profile as Record<string, unknown>)[field];
        });
    };

    const isCurrentStepComplete = getStepCompletion(currentStep);

    const handleNext = () => {
        if (currentStep < STEPS.length) {
            if (isCurrentStepComplete) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 2000);
            }
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // Input styles
    const inputClass = clsx(
        "w-full px-4 py-3 rounded-xl border transition-all text-base",
        isDark
            ? "bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-purple-500"
            : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500"
    );

    const labelClass = clsx(
        "block text-sm font-medium mb-2",
        isDark ? "text-white/70" : "text-gray-700"
    );

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>İşletme Adı</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => onUpdateProfile("name", e.target.value)}
                                placeholder="Örn: Cafe Istanbul"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Slogan</label>
                            <input
                                type="text"
                                value={profile.slogan}
                                onChange={(e) => onUpdateProfile("slogan", e.target.value)}
                                placeholder="Kısa ve akılda kalıcı (Max 60)"
                                maxLength={60}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Açıklama</label>
                            <textarea
                                value={profile.about}
                                onChange={(e) => onUpdateProfile("about", e.target.value)}
                                placeholder="İşletmenizi tanıtın (Max 155)"
                                maxLength={155}
                                rows={3}
                                className={clsx(inputClass, "resize-none")}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <label className={labelClass}>Logo</label>
                            <button
                                onClick={onUploadLogo}
                                className={clsx(
                                    "mx-auto w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all",
                                    isDark ? "border-white/20 hover:border-purple-500" : "border-gray-300 hover:border-purple-500"
                                )}
                            >
                                {profile.logo ? (
                                    <img src={toR2ProxyUrl(profile.logo)} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Image className={clsx("w-8 h-8", isDark ? "text-white/40" : "text-gray-400")} />
                                )}
                            </button>
                        </div>
                        <div className="text-center">
                            <label className={labelClass}>Kapak Fotoğrafı</label>
                            <button
                                onClick={onUploadCover}
                                className={clsx(
                                    "w-full h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all",
                                    isDark ? "border-white/20 hover:border-purple-500" : "border-gray-300 hover:border-purple-500"
                                )}
                            >
                                {profile.cover ? (
                                    <img src={toR2ProxyUrl(profile.cover)} alt="Cover" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Image className={clsx("w-8 h-8", isDark ? "text-white/40" : "text-gray-400")} />
                                        <span className={clsx("text-sm", isDark ? "text-white/40" : "text-gray-400")}>
                                            Yüklemek için tıkla
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Telefon</label>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => onUpdateProfile("phone", e.target.value)}
                                placeholder="0532 123 45 67"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Adres</label>
                            <textarea
                                value={profile.address}
                                onChange={(e) => onUpdateProfile("address", e.target.value)}
                                placeholder="Tam adres"
                                rows={2}
                                className={clsx(inputClass, "resize-none")}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Google Maps Linki</label>
                            <input
                                type="url"
                                value={profile.mapsUrl}
                                onChange={(e) => onUpdateProfile("mapsUrl", e.target.value)}
                                placeholder="https://maps.google.com/..."
                                className={inputClass}
                            />
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Instagram</label>
                            <input
                                type="text"
                                value={profile.socialLinks.instagram || ""}
                                onChange={(e) => onUpdateSocialLink("instagram", e.target.value)}
                                placeholder="@kullanici_adi"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Facebook</label>
                            <input
                                type="text"
                                value={profile.socialLinks.facebook || ""}
                                onChange={(e) => onUpdateSocialLink("facebook", e.target.value)}
                                placeholder="facebook.com/sayfa-adi"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Google Yorumlar</label>
                            <input
                                type="text"
                                value={profile.socialLinks.google || ""}
                                onChange={(e) => onUpdateSocialLink("google", e.target.value)}
                                placeholder="Google yorum linki"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Website</label>
                            <input
                                type="url"
                                value={profile.socialLinks.website || ""}
                                onChange={(e) => onUpdateSocialLink("website", e.target.value)}
                                placeholder="https://www.siteniz.com"
                                className={inputClass}
                            />
                        </div>
                    </div>
                );
            case 5:
                const days = [
                    { key: "monday", label: "Pazartesi" },
                    { key: "tuesday", label: "Salı" },
                    { key: "wednesday", label: "Çarşamba" },
                    { key: "thursday", label: "Perşembe" },
                    { key: "friday", label: "Cuma" },
                    { key: "saturday", label: "Cumartesi" },
                    { key: "sunday", label: "Pazar" },
                ];
                return (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {days.map(day => {
                            const hours = profile.workingHours[day.key] || { open: "09:00", close: "22:00", closed: false };
                            return (
                                <div key={day.key} className={clsx(
                                    "flex items-center gap-3 p-3 rounded-xl",
                                    isDark ? "bg-white/5" : "bg-gray-50"
                                )}>
                                    <span className={clsx("w-24 text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                        {day.label}
                                    </span>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!hours.closed}
                                            onChange={(e) => onUpdateWorkingHours(day.key, "closed", !e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className={clsx("text-xs", isDark ? "text-white/60" : "text-gray-500")}>Açık</span>
                                    </label>
                                    {!hours.closed && (
                                        <>
                                            <input
                                                type="time"
                                                value={hours.open}
                                                onChange={(e) => onUpdateWorkingHours(day.key, "open", e.target.value)}
                                                className={clsx(
                                                    "px-2 py-1 rounded-lg text-sm border",
                                                    isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200"
                                                )}
                                            />
                                            <span className={isDark ? "text-white/40" : "text-gray-400"}>-</span>
                                            <input
                                                type="time"
                                                value={hours.close}
                                                onChange={(e) => onUpdateWorkingHours(day.key, "close", e.target.value)}
                                                className={clsx(
                                                    "px-2 py-1 rounded-lg text-sm border",
                                                    isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200"
                                                )}
                                            />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className={clsx(
                        "relative w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden",
                        "max-h-[90vh] md:max-h-[85vh] flex flex-col",
                        isDark ? "bg-gray-900" : "bg-white"
                    )}
                >
                    {/* Confetti Effect */}
                    {showConfetti && (
                        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                            {[...Array(50)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{
                                        y: -20,
                                        x: Math.random() * 400,
                                        rotate: 0,
                                        scale: 1
                                    }}
                                    animate={{
                                        y: 600,
                                        rotate: Math.random() * 360,
                                        scale: 0
                                    }}
                                    transition={{
                                        duration: 2 + Math.random(),
                                        ease: "easeOut"
                                    }}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                        backgroundColor: ["#8B5CF6", "#EC4899", "#F97316", "#10B981", "#3B82F6"][i % 5],
                                        left: `${Math.random() * 100}%`
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Header */}
                    <div className={clsx(
                        "flex-shrink-0 px-6 pt-6 pb-4 border-b",
                        isDark ? "border-white/10" : "border-gray-100"
                    )}>
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={onClose}
                                className={clsx(
                                    "p-2 -ml-2 rounded-full transition-colors",
                                    isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                )}
                            >
                                <X className={clsx("w-5 h-5", isDark ? "text-white/60" : "text-gray-500")} />
                            </button>
                            <div className="flex items-center gap-1">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                                <span className={clsx("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                    Profil Sihirbazı
                                </span>
                            </div>
                            <div className="w-9" />
                        </div>

                        {/* Step indicators */}
                        <div className="flex items-center justify-center gap-2">
                            {STEPS.map((step) => {
                                const StepIcon = step.icon;
                                const isComplete = getStepCompletion(step.id);
                                const isCurrent = step.id === currentStep;

                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => setCurrentStep(step.id)}
                                        className={clsx(
                                            "relative w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                            isCurrent
                                                ? "bg-emerald-500 text-white scale-110"
                                                : isComplete
                                                    ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"
                                                    : isDark ? "bg-white/10 text-white/40" : "bg-gray-100 text-gray-400"
                                        )}
                                    >
                                        {isComplete && !isCurrent ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <StepIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Current step title */}
                        <h2 className={clsx(
                            "text-center text-lg font-semibold mt-4",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            {STEPS[currentStep - 1].title}
                        </h2>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderStepContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className={clsx(
                        "flex-shrink-0 px-6 py-4 border-t flex gap-3",
                        isDark ? "border-white/10" : "border-gray-100"
                    )}>
                        {currentStep > 1 && (
                            <button
                                onClick={handlePrev}
                                className={clsx(
                                    "flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors",
                                    isDark
                                        ? "bg-white/10 text-white hover:bg-white/20"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                )}
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Geri
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 rounded-xl font-medium bg-emerald-500 text-white flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                        >
                            {currentStep === STEPS.length ? "Tamamla" : "İleri"}
                            {currentStep < STEPS.length && <ChevronRight className="w-5 h-5" />}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
