"use client";

import { motion } from "framer-motion";
import { useWizard } from "../WizardProvider";
import { industryModules } from "@/lib/data";
import {
    Building, UtensilsCrossed, Pizza, Cat, Home, Dumbbell, Scissors, Stethoscope, Check
} from "lucide-react";
import clsx from "clsx";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Building,
    UtensilsCrossed,
    Pizza,
    Cat,
    Home,
    Dumbbell,
    Scissors,
    Stethoscope,
};

export function Step3Capabilities() {
    const { formData, updateFormData } = useWizard();

    const toggleModule = (moduleId: string) => {
        const isSelected = formData.modules.includes(moduleId);
        const newModules = isSelected
            ? formData.modules.filter((m) => m !== moduleId)
            : [...formData.modules, moduleId];
        updateFormData({ modules: newModules });
    };

    // Group modules by category
    const groupedModules = industryModules.reduce((acc, module) => {
        if (!acc[module.category]) {
            acc[module.category] = [];
        }
        acc[module.category].push(module);
        return acc;
    }, {} as Record<string, typeof industryModules>);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
        >
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-dark-100">Sektör Yetenekleri</h2>
                <p className="text-dark-400 mt-2">İşletmeniz için gereken modülleri seçin</p>
            </div>

            <div className="space-y-8">
                {Object.entries(groupedModules).map(([category, modules]) => (
                    <div key={category}>
                        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4">
                            {category}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {modules.map((module, index) => {
                                const isSelected = formData.modules.includes(module.id);
                                const Icon = iconMap[module.icon] || Building;

                                return (
                                    <motion.button
                                        key={module.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05, duration: 0.2 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleModule(module.id)}
                                        className={clsx(
                                            "relative flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-200",
                                            "border-2",
                                            isSelected
                                                ? "border-accent-blue bg-accent-blue/10"
                                                : "border-dark-700 bg-dark-850 hover:border-dark-600"
                                        )}
                                    >
                                        {/* Selection Checkmark */}
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute top-2 right-2 h-5 w-5 rounded-full bg-accent-blue flex items-center justify-center"
                                            >
                                                <Check className="h-3 w-3 text-white" />
                                            </motion.div>
                                        )}

                                        {/* Icon */}
                                        <div className={clsx(
                                            "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                                            isSelected
                                                ? "bg-accent-blue/20"
                                                : "bg-dark-700"
                                        )}>
                                            <Icon className={clsx(
                                                "h-6 w-6",
                                                isSelected ? "text-accent-blue" : "text-dark-300"
                                            )} />
                                        </div>

                                        {/* Name */}
                                        <span className={clsx(
                                            "font-medium text-sm",
                                            isSelected ? "text-accent-blue" : "text-dark-200"
                                        )}>
                                            {module.name}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Selection Count */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 text-center"
            >
                <span className="text-sm text-dark-400">
                    {formData.modules.length} modül seçildi
                </span>
            </motion.div>
        </motion.div>
    );
}
