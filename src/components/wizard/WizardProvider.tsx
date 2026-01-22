"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { BusinessFormData } from "@/types";

interface WizardContextType {
    step: number;
    totalSteps: number;
    formData: BusinessFormData;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    updateFormData: (data: Partial<BusinessFormData>) => void;
    isFirstStep: boolean;
    isLastStep: boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

const initialFormData: BusinessFormData = {
    name: "",
    email: "",
    slug: "",
    package: "starter",
    modules: [],
};

interface WizardProviderProps {
    children: ReactNode;
    totalSteps?: number;
}

export function WizardProvider({ children, totalSteps = 4 }: WizardProviderProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<BusinessFormData>(initialFormData);

    const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const updateFormData = (data: Partial<BusinessFormData>) => {
        setFormData((prev) => ({ ...prev, ...data }));
    };

    return (
        <WizardContext.Provider
            value={{
                step,
                totalSteps,
                formData,
                setStep,
                nextStep,
                prevStep,
                updateFormData,
                isFirstStep: step === 1,
                isLastStep: step === totalSteps,
            }}
        >
            {children}
        </WizardContext.Provider>
    );
}

export function useWizard() {
    const context = useContext(WizardContext);
    if (!context) {
        throw new Error("useWizard must be used within a WizardProvider");
    }
    return context;
}
