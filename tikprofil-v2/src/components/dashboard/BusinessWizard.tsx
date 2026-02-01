"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Loader2, ArrowLeft, ArrowRight, Rocket, AlertCircle } from "lucide-react";
import { createBusiness, isSlugAvailable } from "@/lib/businessStore";
import { subscribeToIndustries, getModulesForIndustryAsync, type IndustryDefinition } from "@/lib/industryService";
import { subscribeToPlans, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import { logBusinessCreation } from "@/lib/systemLogs";
import clsx from "clsx";

// Types
interface WizardFormData {
    name: string;
    email: string;
    slug: string;
    planId: string;
    planName: string;
    industryId: string;
    industryLabel: string;
}

export function BusinessWizard({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

    const [formData, setFormData] = useState<WizardFormData>({
        name: "",
        email: "",
        slug: "",
        planId: "",
        planName: "",
        industryId: "",
        industryLabel: "",
    });

    // Generate slug from name
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[ğ]/g, "g")
            .replace(/[ü]/g, "u")
            .replace(/[ş]/g, "s")
            .replace(/[ı]/g, "i")
            .replace(/[ö]/g, "o")
            .replace(/[ç]/g, "c")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    };

    // Real-time slug validation
    useEffect(() => {
        if (!formData.slug) {
            setSlugStatus("idle");
            return;
        }

        setSlugStatus("checking");
        const timeout = setTimeout(async () => {
            try {
                const available = await isSlugAvailable(formData.slug);
                setSlugStatus(available ? "available" : "taken");
            } catch {
                const takenSlugs = ["test", "admin", "demo"];
                setSlugStatus(takenSlugs.includes(formData.slug) ? "taken" : "available");
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [formData.slug]);

    const handleNameChange = (name: string) => {
        setFormData({ ...formData, name, slug: generateSlug(name) });
    };

    const isStepValid = () => {
        switch (step) {
            case 1:
                return formData.name && formData.email && formData.slug && slugStatus === "available";
            case 2:
                return !!formData.planId;
            case 3:
                return !!formData.industryId;
            case 4:
                return true;
            default:
                return false;
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const industryModules = await getModulesForIndustryAsync(formData.industryId);

            await createBusiness({
                name: formData.name,
                email: formData.email,
                slug: formData.slug,
                status: "active",
                package: "starter",
                plan_id: formData.planId,
                modules: industryModules,
                industry_id: formData.industryId,
                industry_label: formData.industryLabel,
                owner: "webintosh",
            });

            logBusinessCreation(formData.name, "webintosh");
            setShowSuccess(true);

            setTimeout(() => {
                onClose();
                router.push("/dashboard/businesses");
            }, 2000);
        } catch (error) {
            console.error("Error creating business:", error);
            setIsSubmitting(false);
        }
    };

    const progress = (step / 4) * 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Dark Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-10">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors z-10"
            >
                <X className="h-5 w-5 text-gray-400" />
            </button>

            {/* Main content */}
            <div className="relative w-full max-w-2xl mx-4 z-10">
                {showSuccess ? (
                    <SuccessScreen formData={formData} />
                ) : (
                    <div>
                        {step === 1 && (
                            <Step1Identity
                                formData={formData}
                                setFormData={setFormData}
                                handleNameChange={handleNameChange}
                                slugStatus={slugStatus}
                            />
                        )}
                        {step === 2 && (
                            <Step2Package formData={formData} setFormData={setFormData} />
                        )}
                        {step === 3 && (
                            <Step3IndustryType formData={formData} setFormData={setFormData} />
                        )}
                        {step === 4 && (
                            <Step4Review formData={formData} />
                        )}
                    </div>
                )}

                {/* Navigation */}
                {!showSuccess && (
                    <div className="flex items-center justify-between mt-8">
                        <button
                            onClick={() => step > 1 && setStep(step - 1)}
                            disabled={step === 1}
                            className={clsx(
                                "flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all",
                                step === 1
                                    ? "opacity-0 cursor-default"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Geri
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!isStepValid()}
                                className={clsx(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                                    isStepValid()
                                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90"
                                        : "bg-gray-800 text-gray-500 cursor-not-allowed"
                                )}
                            >
                                İleri
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white disabled:opacity-70 hover:opacity-90 transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="h-4 w-4" />
                                        Yayına Al
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Step 1: Identity - Dark Theme
function Step1Identity({
    formData,
    setFormData,
    handleNameChange,
    slugStatus
}: {
    formData: WizardFormData;
    setFormData: (data: WizardFormData) => void;
    handleNameChange: (name: string) => void;
    slugStatus: "idle" | "checking" | "available" | "taken";
}) {
    const [emailError, setEmailError] = useState("");

    const validateEmail = (email: string) => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        setEmailError(isValid ? "" : "Geçerli bir e-posta adresi girin");
    };

    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">İşletme Kimliği</h2>
            <p className="text-gray-400 mb-8">Temel bilgilerle başlayalım</p>

            <div className="space-y-5 max-w-md mx-auto text-left">
                {/* Business Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        İşletme Adı
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Örn: Cafe Istanbul"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Yönetici E-postası
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onBlur={(e) => validateEmail(e.target.value)}
                        placeholder="ornek@isletme.com"
                        className={clsx(
                            "w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-gray-500 focus:outline-none transition-colors",
                            emailError
                                ? "border-red-500/50 focus:border-red-500"
                                : "border-white/10 focus:border-blue-500"
                        )}
                    />
                    {emailError && (
                        <p className="text-sm text-red-400 mt-1">{emailError}</p>
                    )}
                </div>

                {/* Slug */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Profil Adresi
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                            tikprofil.com/
                        </span>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            className={clsx(
                                "w-full pl-28 pr-10 py-3 rounded-xl bg-white/5 border text-white focus:outline-none transition-colors",
                                slugStatus === "taken"
                                    ? "border-red-500/50 focus:border-red-500"
                                    : slugStatus === "available"
                                        ? "border-emerald-500/50 focus:border-emerald-500"
                                        : "border-white/10 focus:border-blue-500"
                            )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {slugStatus === "checking" && (
                                <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                            )}
                            {slugStatus === "available" && (
                                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-emerald-400" />
                                </div>
                            )}
                            {slugStatus === "taken" && (
                                <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <X className="h-3 w-3 text-red-400" />
                                </div>
                            )}
                        </div>
                    </div>
                    <p className={clsx(
                        "text-sm mt-2",
                        slugStatus === "taken" ? "text-red-400" : "text-gray-500"
                    )}>
                        {slugStatus === "taken"
                            ? "Bu adres zaten kullanılıyor"
                            : `Profil adresiniz: tikprofil.com/${formData.slug || "..."}`}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Step 2: Package Selection - Dark Theme
function Step2Package({ formData, setFormData }: { formData: WizardFormData; setFormData: (data: WizardFormData) => void }) {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToPlans((allPlans) => {
            const activePlans = allPlans
                .filter(p => p.status === "active")
                .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.monthlyPrice || 0) - (b.monthlyPrice || 0));
            setPlans(activePlans);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const selectPlan = (plan: SubscriptionPlan) => {
        setFormData({
            ...formData,
            planId: plan.id,
            planName: plan.name
        });
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                <p className="text-gray-500 mt-4">Paketler yükleniyor...</p>
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Paket Bulunamadı</h3>
                <p className="text-gray-400">Henüz aktif paket tanımlanmamış.</p>
            </div>
        );
    }

    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Paket Seçin</h2>
            <p className="text-gray-400 mb-8">İhtiyaçlarınıza uygun planı seçin</p>

            <div className={clsx(
                "grid gap-4",
                plans.length <= 2 ? "grid-cols-1 md:grid-cols-2 max-w-xl mx-auto" : "grid-cols-1 md:grid-cols-3"
            )}>
                {plans.map((plan) => {
                    const isSelected = formData.planId === plan.id;

                    return (
                        <button
                            key={plan.id}
                            onClick={() => selectPlan(plan)}
                            className={clsx(
                                "relative p-5 rounded-xl text-left transition-all border",
                                isSelected
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                            )}
                        >
                            {plan.isBestSeller && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium">
                                        Önerilen
                                    </span>
                                </div>
                            )}

                            {isSelected && (
                                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                </div>
                            )}

                            <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                            <div className="mb-3">
                                <span className="text-2xl font-bold text-white">₺{plan.monthlyPrice}</span>
                                <span className="text-gray-400 text-sm">/ay</span>
                            </div>
                            {plan.description && (
                                <p className="text-sm text-gray-400 mb-3">{plan.description}</p>
                            )}
                            <ul className="space-y-1.5">
                                {plan.features?.slice(0, 3).map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                                        <Check className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                        <span className="truncate">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Step 3: Industry Type - Dark Theme
function Step3IndustryType({ formData, setFormData }: { formData: WizardFormData; setFormData: (data: WizardFormData) => void }) {
    const [industries, setIndustries] = useState<IndustryDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToIndustries((data) => {
            setIndustries(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const selectIndustry = (industry: IndustryDefinition) => {
        setFormData({
            ...formData,
            industryId: industry.id,
            industryLabel: industry.label
        });
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                <p className="text-gray-500 mt-4">İşletme türleri yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">İşletme Türü</h2>
            <p className="text-gray-400 mb-8">Sektörünüzü seçin</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2">
                {industries.map((industry) => {
                    const isSelected = formData.industryId === industry.id;

                    return (
                        <button
                            key={industry.id}
                            onClick={() => selectIndustry(industry)}
                            className={clsx(
                                "relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all border",
                                isSelected
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                </div>
                            )}

                            <div
                                className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                                style={{ backgroundColor: `${industry.color || '#3B82F6'}20` }}
                            >
                                {industry.icon || '🏢'}
                            </div>

                            <span className="text-sm font-medium text-gray-300 text-center">
                                {industry.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {formData.industryId && (
                <p className="text-sm text-blue-400 mt-4 font-medium">
                    ✓ {formData.industryLabel} seçildi
                </p>
            )}
        </div>
    );
}

// Step 4: Review - Dark Theme
function Step4Review({ formData }: { formData: WizardFormData }) {
    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Bilgileri Onaylayın</h2>
            <p className="text-gray-400 mb-8">Her şey doğru görünüyor mu?</p>

            <div className="max-w-md mx-auto">
                <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                    <div className="space-y-4 text-left">
                        <div>
                            <span className="text-sm text-gray-500">İşletme Adı</span>
                            <p className="text-lg font-medium text-white">{formData.name}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500">Profil Adresi</span>
                            <p className="text-lg font-medium text-blue-400">tikprofil.com/{formData.slug}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500">E-posta</span>
                            <p className="text-lg font-medium text-white">{formData.email}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500">Paket</span>
                            <p className="text-lg font-medium text-white">{formData.planName}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500">İşletme Türü</span>
                            <p className="text-lg font-medium text-white">{formData.industryLabel}</p>
                        </div>
                        <div className="pt-3 border-t border-white/10">
                            <span className="text-sm text-gray-500">Durum</span>
                            <p className="text-lg font-medium text-emerald-400">✓ Aktif olarak yayınlanacak</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Success Screen - Dark Theme
function SuccessScreen({ formData }: { formData: WizardFormData }) {
    return (
        <div className="text-center py-12">
            <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
                İşletme Oluşturuldu! 🎉
            </h2>
            <p className="text-gray-400">
                <span className="font-medium text-white">{formData.name}</span> artık yayında
            </p>
        </div>
    );
}
