"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, Button } from "@/components/ui";
import {
    Plus, Edit2, Trash2, X, Check, Loader2, Star,
    ToggleLeft, ToggleRight, Sparkles
} from "lucide-react";
import {
    type SubscriptionPlan,
    subscribeToPlans,
    createPlan,
    updatePlan,
    deletePlan
} from "@/lib/subscriptionPlans";
import { MODULE_REGISTRY } from "@/lib/ModuleRegistry";
import clsx from "clsx";

export default function PackagesPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<SubscriptionPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubscribe = subscribeToPlans((data) => {
                setPlans(data);
            });
            return () => unsubscribe();
        }
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Bu paketi silmek istediğinize emin misiniz?")) return;
        try {
            await deletePlan(id);
            setPlans(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Paket Yönetimi"
                description={`${plans.length} abonelik paketi`}
                action={
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
                        Yeni Paket Ekle
                    </Button>
                }
            />

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {plans.map((plan) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <GlassCard
                                className={clsx(
                                    "relative overflow-hidden",
                                    plan.isBestSeller && "ring-2 ring-accent-blue"
                                )}
                            >
                                {/* Best Seller Badge */}
                                {plan.isBestSeller && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-accent-blue text-white text-xs font-medium">
                                        <Star className="h-3 w-3" />
                                        En Popüler
                                    </div>
                                )}

                                {/* Status Badge */}
                                <div className={clsx(
                                    "absolute top-4 left-4 px-2 py-1 rounded-full text-xs font-medium",
                                    plan.status === "active"
                                        ? "bg-accent-green/15 text-accent-green"
                                        : "bg-dark-700 text-dark-400"
                                )}>
                                    {plan.status === "active" ? "Aktif" : "Pasif"}
                                </div>

                                <div className="pt-8">
                                    <h3 className="text-xl font-bold text-dark-100 mb-2">{plan.name}</h3>
                                    <p className="text-sm text-dark-400 mb-4">{plan.description}</p>

                                    {/* Pricing */}
                                    <div className="mb-4">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold text-dark-100">
                                                {formatPrice(plan.monthlyPrice)}
                                            </span>
                                            <span className="text-dark-500">/ay</span>
                                        </div>
                                        <p className="text-xs text-dark-500 mt-1">
                                            veya {formatPrice(plan.yearlyPrice)}/yıl
                                        </p>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-2 mb-6">
                                        {plan.features.slice(0, 4).map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                                                <Check className="h-4 w-4 text-accent-green flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Module Count */}
                                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-dark-800/50">
                                        <Sparkles className="h-4 w-4 text-accent-purple" />
                                        <span className="text-sm text-dark-300">
                                            {plan.modules.length} modül dahil
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingItem(plan)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-dark-700 text-dark-200 hover:bg-dark-600 transition-colors text-sm font-medium"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleDelete(plan.id)}
                                            className="p-2.5 rounded-xl hover:bg-red-500/10 text-dark-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {(showAddModal || editingItem) && (
                    <PackageModal
                        item={editingItem}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingItem(null);
                        }}
                        onSave={async (data) => {
                            setIsLoading(true);
                            try {
                                if (editingItem) {
                                    await updatePlan(editingItem.id, data);
                                    setPlans(prev => prev.map(p =>
                                        p.id === editingItem.id ? { ...p, ...data } : p
                                    ));
                                } else {
                                    const id = await createPlan({
                                        ...data,
                                        order: plans.length,
                                    });
                                    setPlans(prev => [...prev, { ...data, id, createdAt: new Date(), order: prev.length }]);
                                }
                                setShowAddModal(false);
                                setEditingItem(null);
                            } catch (error) {
                                console.error("Save error:", error);
                            }
                            setIsLoading(false);
                        }}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Package Modal
function PackageModal({
    item,
    onClose,
    onSave,
    isLoading
}: {
    item: SubscriptionPlan | null;
    onClose: () => void;
    onSave: (data: Omit<SubscriptionPlan, "id" | "createdAt">) => void;
    isLoading: boolean;
}) {
    const [name, setName] = useState(item?.name || "");
    const [slug, setSlug] = useState(item?.slug || "");
    const [description, setDescription] = useState(item?.description || "");
    const [monthlyPrice, setMonthlyPrice] = useState(item?.monthlyPrice || 0);
    const [yearlyPrice, setYearlyPrice] = useState(item?.yearlyPrice || 0);
    const [features, setFeatures] = useState(item?.features.join("\n") || "");
    const [modules, setModules] = useState<string[]>(item?.modules || []);
    const [maxProducts, setMaxProducts] = useState(item?.maxProducts || 10);
    const [isBestSeller, setIsBestSeller] = useState(item?.isBestSeller || false);
    const [status, setStatus] = useState<"active" | "passive">(item?.status || "active");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
            description,
            monthlyPrice,
            yearlyPrice,
            features: features.split("\n").filter(f => f.trim()),
            modules,
            maxProducts,
            isBestSeller,
            status,
            order: item?.order || 0,
        });
    };

    const toggleModule = (moduleId: string) => {
        setModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(m => m !== moduleId)
                : [...prev, moduleId]
        );
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl rounded-2xl border border-dark-700/50 max-h-[90vh] overflow-y-auto pointer-events-auto"
                    style={{ background: "rgba(28, 28, 30, 0.95)", backdropFilter: "blur(40px)" }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-dark-700/50 bg-dark-900/90 backdrop-blur">
                        <h2 className="text-lg font-semibold text-dark-100">
                            {item ? "Paketi Düzenle" : "Yeni Paket Ekle"}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-700">
                            <X className="h-5 w-5 text-dark-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Paket Adı</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Örn: Pro"
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Slug</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="pro"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Açıklama</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Kısa açıklama"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Aylık Fiyat (₺)</label>
                                <input
                                    type="number"
                                    value={monthlyPrice}
                                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Yıllık Fiyat (₺)</label>
                                <input
                                    type="number"
                                    value={yearlyPrice}
                                    onChange={(e) => setYearlyPrice(Number(e.target.value))}
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Maks Ürün</label>
                                <input
                                    type="number"
                                    value={maxProducts}
                                    onChange={(e) => setMaxProducts(Number(e.target.value))}
                                    min="-1"
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Özellikler (her satır bir özellik)</label>
                            <textarea
                                value={features}
                                onChange={(e) => setFeatures(e.target.value)}
                                rows={4}
                                placeholder="Temel profil sayfası&#10;QR kod&#10;10 ürün/hizmet"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Dahil Modüller ({modules.length} seçili)</label>
                            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-dark-800 border border-dark-700">
                                {MODULE_REGISTRY.slice(0, 20).map((mod) => (
                                    <button
                                        key={mod.id}
                                        type="button"
                                        onClick={() => toggleModule(mod.id)}
                                        className={clsx(
                                            "px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left truncate",
                                            modules.includes(mod.id)
                                                ? "bg-accent-blue text-white"
                                                : "bg-dark-700 text-dark-400 hover:text-dark-200"
                                        )}
                                    >
                                        {mod.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsBestSeller(!isBestSeller)}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                                        isBestSeller
                                            ? "bg-accent-blue text-white"
                                            : "bg-dark-700 text-dark-400"
                                    )}
                                >
                                    <Star className="h-4 w-4" />
                                    En Popüler
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus(s => s === "active" ? "passive" : "active")}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                                        status === "active"
                                            ? "bg-accent-green/15 text-accent-green"
                                            : "bg-dark-700 text-dark-400"
                                    )}
                                >
                                    {status === "active" ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                    {status === "active" ? "Aktif" : "Pasif"}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl bg-dark-700 text-dark-200 hover:bg-dark-600 font-medium transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !name}
                                className="flex-1 px-4 py-3 rounded-xl bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                {item ? "Güncelle" : "Kaydet"}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}
