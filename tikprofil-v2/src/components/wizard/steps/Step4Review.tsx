"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWizard } from "../WizardProvider";
import { packages, industryModules } from "@/lib/data";
import { Building2, Package, Blocks, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import confetti from "canvas-confetti";

export function Step4Review() {
    const { formData } = useWizard();
    const [isLaunching, setIsLaunching] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const selectedPackage = packages.find((p) => p.id === formData.package);
    const selectedModules = industryModules.filter((m) => formData.modules.includes(m.id));

    const handleLaunch = async () => {
        setIsLaunching(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsSuccess(true);

        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#0a84ff", "#30d158", "#bf5af2"],
        });
    };

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="h-24 w-24 mx-auto mb-6 rounded-full bg-accent-green/20 flex items-center justify-center"
                >
                    <CheckCircle2 className="h-12 w-12 text-accent-green" />
                </motion.div>
                <h2 className="text-3xl font-bold text-dark-100 mb-2">İşletme Başlatıldı! 🚀</h2>
                <p className="text-dark-400 mb-8">
                    <span className="font-medium text-dark-200">{formData.name}</span> artık yayında
                </p>
                <motion.a
                    href={`https://tikprofil.com/${formData.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-blue text-white font-medium shadow-glow"
                >
                    <Sparkles className="h-5 w-5" />
                    Panele Git
                </motion.a>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
        >
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-dark-100">Gözden Geçir ve Başlat</h2>
                <p className="text-dark-400 mt-2">Her şeyin doğru olduğundan emin olun</p>
            </div>

            <div className="space-y-6">
                {/* Identity Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6"
                >
                    <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        İşletme Kimliği
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-dark-500 mb-1">İsim</p>
                            <p className="font-medium text-dark-100">{formData.name || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-dark-500 mb-1">E-posta</p>
                            <p className="font-medium text-dark-100">{formData.email || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-dark-500 mb-1">URL</p>
                            <p className="font-medium text-accent-blue">tikprofil.com/{formData.slug || "—"}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Package Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6"
                >
                    <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Seçilen Paket
                    </h3>
                    {selectedPackage && (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-dark-100 text-lg">{selectedPackage.name}</p>
                                <p className="text-sm text-dark-400">{selectedPackage.description}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-dark-100">₺{selectedPackage.price}</p>
                                <p className="text-xs text-dark-500">aylık</p>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Modules Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6"
                >
                    <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Blocks className="h-4 w-4" />
                        Sektör Modülleri ({selectedModules.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedModules.length > 0 ? (
                            selectedModules.map((module) => (
                                <span
                                    key={module.id}
                                    className="px-3 py-1.5 rounded-lg bg-accent-blue/15 text-accent-blue text-sm font-medium"
                                >
                                    {module.name}
                                </span>
                            ))
                        ) : (
                            <p className="text-dark-500 text-sm">Modül seçilmedi</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Launch Button (Hidden - handled by WizardNavigation) */}
            <AnimatePresence>
                {isLaunching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="text-center"
                        >
                            <div className="h-16 w-16 mx-auto mb-4 border-4 border-accent-blue border-t-transparent rounded-full animate-spin" />
                            <p className="text-dark-200 font-medium">İşletmeniz başlatılıyor...</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
