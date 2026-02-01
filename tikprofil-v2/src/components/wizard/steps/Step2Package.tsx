"use client";

import { motion } from "framer-motion";
import { useWizard } from "../WizardProvider";
import { packages } from "@/lib/data";
import { Check, Sparkles } from "lucide-react";
import clsx from "clsx";

export function Step2Package() {
    const { formData, updateFormData } = useWizard();

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
        >
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-dark-100">Paketinizi Seçin</h2>
                <p className="text-dark-400 mt-2">İşletmenizin ihtiyaçlarına uygun planı seçin</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {packages.map((pkg, index) => {
                    const isSelected = formData.package === pkg.id;
                    const isPopular = pkg.id === "pro";

                    return (
                        <motion.div
                            key={pkg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateFormData({ package: pkg.id })}
                            className={clsx(
                                "relative cursor-pointer rounded-2xl p-6 transition-all duration-300",
                                "border-2",
                                isSelected
                                    ? "border-accent-blue bg-accent-blue/10 shadow-glow"
                                    : "border-dark-700 bg-dark-850 hover:border-dark-600"
                            )}
                        >
                            {/* Popular Badge */}
                            {isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple text-white text-xs font-medium">
                                        <Sparkles className="h-3 w-3" />
                                        Popüler
                                    </div>
                                </div>
                            )}

                            {/* Selection Indicator */}
                            <div className={clsx(
                                "absolute top-4 right-4 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected
                                    ? "border-accent-blue bg-accent-blue"
                                    : "border-dark-600"
                            )}>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    >
                                        <Check className="h-4 w-4 text-white" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Package Content */}
                            <div className="mt-2">
                                <h3 className={clsx(
                                    "text-xl font-semibold",
                                    isSelected ? "text-accent-blue" : "text-dark-100"
                                )}>
                                    {pkg.name}
                                </h3>
                                <p className="text-sm text-dark-400 mt-1">{pkg.description}</p>
                            </div>

                            {/* Price */}
                            <div className="mt-4">
                                <span className="text-3xl font-bold text-dark-100">₺{pkg.price}</span>
                                <span className="text-dark-500">/ay</span>
                            </div>

                            {/* Features */}
                            <ul className="mt-6 space-y-3">
                                {pkg.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-sm text-dark-300">
                                        <div className={clsx(
                                            "h-5 w-5 rounded-full flex items-center justify-center",
                                            isSelected ? "bg-accent-blue/20" : "bg-dark-700"
                                        )}>
                                            <Check className={clsx(
                                                "h-3 w-3",
                                                isSelected ? "text-accent-blue" : "text-dark-400"
                                            )} />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}
