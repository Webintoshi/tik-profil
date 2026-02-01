"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GlassCard, PageHeader } from "@/components/ui";
import {
    WizardProvider,
    WizardProgress,
    WizardNavigation,
    useWizard,
    Step1Identity,
    Step2Package,
    Step3Capabilities,
    Step4Review,
} from "@/components/wizard";
import { useRouter } from "next/navigation";
import { createBusiness } from "@/lib/businessStore";
import { useState } from "react";

function WizardContent() {
    const { step, formData } = useWizard();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canProgress = (): boolean => {
        switch (step) {
            case 1:
                return !!(formData.name && formData.email && formData.slug);
            case 2:
                return !!formData.package;
            case 3:
                return formData.modules.length > 0;
            case 4:
                return !isSubmitting;
            default:
                return false;
        }
    };

    const handleComplete = async () => {
        setIsSubmitting(true);
        try {
            await createBusiness({
                name: formData.name,
                email: formData.email,
                slug: formData.slug,
                status: "pending",
                package: formData.package as "starter" | "pro" | "ultimate",
                modules: formData.modules,
                owner: "webintosh",
            });

            router.push("/dashboard/businesses");
        } catch (error) {
            console.error("Error creating business:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <GlassCard className="max-w-4xl mx-auto" padding="lg">
            <WizardProgress />

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {step === 1 && <Step1Identity />}
                    {step === 2 && <Step2Package />}
                    {step === 3 && <Step3Capabilities />}
                    {step === 4 && <Step4Review />}
                </motion.div>
            </AnimatePresence>

            <WizardNavigation
                onComplete={handleComplete}
                canProgress={canProgress()}
            />
        </GlassCard>
    );
}

export default function NewBusinessPage() {
    return (
        <div>
            <PageHeader
                title="Yeni İşletme Ekle"
                description="Birkaç adımda yeni bir işletme profili oluşturun."
            />

            <WizardProvider>
                <WizardContent />
            </WizardProvider>
        </div>
    );
}
