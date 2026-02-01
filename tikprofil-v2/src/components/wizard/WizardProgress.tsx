"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import clsx from "clsx";
import { useWizard } from "./WizardProvider";

const steps = [
    { id: 1, title: "Kimlik" },
    { id: 2, title: "Paket" },
    { id: 3, title: "Modüller" },
    { id: 4, title: "Özet" },
];

export function WizardProgress() {
    const { step } = useWizard();

    return (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 lg:mb-8">
            {steps.map((s, index) => (
                <div key={s.id} className="flex items-center">
                    <motion.div
                        initial={false}
                        animate={{
                            scale: step === s.id ? 1.1 : 1,
                            backgroundColor:
                                step > s.id
                                    ? "rgb(48, 209, 88)" // accent-green
                                    : step === s.id
                                        ? "rgb(10, 132, 255)" // accent-blue
                                        : "rgb(58, 58, 60)", // dark-700
                        }}
                        transition={{ duration: 0.2 }}
                        className={clsx(
                            "flex h-10 w-10 items-center justify-center rounded-full font-medium text-sm",
                            step >= s.id ? "text-white" : "text-dark-400"
                        )}
                    >
                        {step > s.id ? (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <Check className="h-5 w-5" />
                            </motion.div>
                        ) : (
                            s.id
                        )}
                    </motion.div>

                    <span
                        className={clsx(
                            "ml-2 text-sm font-medium hidden sm:block",
                            step === s.id ? "text-dark-100" : "text-dark-500"
                        )}
                    >
                        {s.title}
                    </span>

                    {index < steps.length - 1 && (
                        <div className="w-6 sm:w-12 mx-2 sm:mx-4 h-[2px] bg-dark-700 relative overflow-hidden">
                            <motion.div
                                initial={false}
                                animate={{ width: step > s.id ? "100%" : "0%" }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-accent-green"
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
