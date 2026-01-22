"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWizard } from "./WizardProvider";
import { Button } from "@/components/ui";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";

interface WizardNavigationProps {
    onComplete?: () => void;
    canProgress?: boolean;
}

export function WizardNavigation({ onComplete, canProgress = true }: WizardNavigationProps) {
    const { step, isFirstStep, isLastStep, nextStep, prevStep } = useWizard();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mt-8 pt-6 border-t border-dark-700"
        >
            <AnimatePresence mode="wait">
                {!isFirstStep && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            leftIcon={<ArrowLeft className="h-4 w-4" />}
                        >
                            Back
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1" />

            <AnimatePresence mode="wait">
                <motion.div
                    key={isLastStep ? "launch" : "next"}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                >
                    {isLastStep ? (
                        <Button
                            onClick={onComplete}
                            disabled={!canProgress}
                            leftIcon={<Rocket className="h-4 w-4" />}
                        >
                            Launch Business
                        </Button>
                    ) : (
                        <Button
                            onClick={nextStep}
                            disabled={!canProgress}
                            rightIcon={<ArrowRight className="h-4 w-4" />}
                        >
                            Continue
                        </Button>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
