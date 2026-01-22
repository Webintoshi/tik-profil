"use client";

import { motion } from "framer-motion";
import { useWizard } from "../WizardProvider";
import { Building2, Mail, Link2, Check, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";

export function Step1Identity() {
    const { formData, updateFormData } = useWizard();
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

    // Generate slug from business name
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9ğüşıöç]+/g, "-")
            .replace(/(^-|-$)/g, "");
    };

    // Simulated slug availability check
    useEffect(() => {
        if (!formData.slug) {
            setSlugStatus("idle");
            return;
        }

        setSlugStatus("checking");
        const timeout = setTimeout(() => {
            // Simulate API check - mark some slugs as taken
            const takenSlugs = ["test", "admin", "demo"];
            setSlugStatus(takenSlugs.includes(formData.slug) ? "taken" : "available");
        }, 800);

        return () => clearTimeout(timeout);
    }, [formData.slug]);

    const handleNameChange = (name: string) => {
        updateFormData({ name, slug: generateSlug(name) });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-dark-100">İşletme Kimliği</h2>
                <p className="text-dark-400 mt-2">Temel bilgilerle başlayalım</p>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                    <Building2 className="h-4 w-4" />
                    İşletme Adı
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="İşletme adını girin"
                    className="input"
                />
            </div>

            {/* Email */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                    <Mail className="h-4 w-4" />
                    İşletme E-postası
                </label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    placeholder="info@isletme.com"
                    className="input"
                />
            </div>

            {/* Slug */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-dark-300">
                    <Link2 className="h-4 w-4" />
                    URL Adresi
                </label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 text-sm">
                        tikprofil.com/
                    </div>
                    <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => updateFormData({ slug: e.target.value })}
                        placeholder="isletme-adiniz"
                        className="input pl-[120px] pr-12"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {slugStatus === "checking" && (
                            <Loader2 className="h-5 w-5 text-dark-500 animate-spin" />
                        )}
                        {slugStatus === "available" && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-6 w-6 rounded-full bg-accent-green/20 flex items-center justify-center"
                            >
                                <Check className="h-4 w-4 text-accent-green" />
                            </motion.div>
                        )}
                        {slugStatus === "taken" && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-6 w-6 rounded-full bg-accent-red/20 flex items-center justify-center"
                            >
                                <X className="h-4 w-4 text-accent-red" />
                            </motion.div>
                        )}
                    </div>
                </div>
                <p className={clsx(
                    "text-xs",
                    slugStatus === "taken" ? "text-accent-red" : "text-dark-500"
                )}>
                    {slugStatus === "taken"
                        ? "Bu URL adresi zaten kullanılıyor. Lütfen başka bir adres seçin."
                        : "Bu, işletmenizin benzersiz URL adresi olacak"}
                </p>
            </div>
        </motion.div>
    );
}
