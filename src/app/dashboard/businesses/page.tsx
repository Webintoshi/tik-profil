"use client";

import { PageHeader, Button } from "@/components/ui";
import { BusinessTable } from "@/components/admin";
import { BusinessWizard } from "@/components/dashboard";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import type { Business } from "@/types";
import { subscribeToBusinesses, deleteBusiness } from "@/lib/businessStore";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function BusinessesPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);

    useEffect(() => {
        // Always use Supabase - no demo fallback
        const unsubscribe = subscribeToBusinesses((data) => {
            setBusinesses(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Bu işletmeyi silmek istediğinize emin misiniz?")) return;

        try {
            await deleteBusiness(id);
            toast.success("İşletme silindi");
        } catch (error) {
            console.error("Error deleting business:", error);
            toast.error("Silme hatası");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="İşletme Yönetimi"
                description="Platformdaki tüm kayıtlı işletmeleri yönetin."
                action={
                    <Button
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={() => setShowWizard(true)}
                    >
                        Yeni İşletme Ekle
                    </Button>
                }
            />

            {businesses.length === 0 ? (
                <div className="text-center py-16 border border-border rounded-xl bg-card">
                    <p className="text-muted-foreground">Henüz işletme eklenmemiş</p>
                    <Button className="mt-4" onClick={() => setShowWizard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk İşletmeyi Ekle
                    </Button>
                </div>
            ) : (
                <BusinessTable businesses={businesses} onDelete={handleDelete} />
            )}

            {/* Wizard Modal */}
            <AnimatePresence>
                {showWizard && (
                    <BusinessWizard onClose={() => setShowWizard(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
