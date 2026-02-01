"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Ticket,
    Plus,
    Loader2,
    Edit2,
    Trash2,
    X,
    Check,
    Percent,
    DollarSign,
    Calendar,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import type { Coupon } from "@/types/ecommerce";

export default function EcommerceCouponsPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Fetch coupons
    useEffect(() => {
        async function fetchCoupons() {
            if (!session?.businessId) return;

            try {
                const res = await fetch(`/api/ecommerce/coupons?businessId=${session.businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCoupons(data.coupons || []);
                }
            } catch (error) {
                console.error("Coupons fetch error:", error);
                toast.error("Kuponlar yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }

        fetchCoupons();
    }, [session?.businessId]);

    // Handle save
    const handleSave = async (couponData: Partial<Coupon>) => {
        if (!session?.businessId) return;

        try {
            const isEdit = !!editingCoupon;
            const res = await fetch("/api/ecommerce/coupons", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId: session.businessId,
                    id: editingCoupon?.id,
                    ...couponData,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (isEdit) {
                    setCoupons(prev =>
                        prev.map(c => c.id === editingCoupon.id ? { ...c, ...couponData } : c)
                    );
                    toast.success("Kupon güncellendi");
                } else {
                    setCoupons(prev => [data.coupon, ...prev]);
                    toast.success("Kupon oluşturuldu");
                }
                setShowModal(false);
                setEditingCoupon(null);
            } else {
                const error = await res.json();
                toast.error(error.error || "İşlem başarısız");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bağlantı hatası");
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!session?.businessId) return;

        setIsDeleting(id);
        try {
            const res = await fetch(
                `/api/ecommerce/coupons?businessId=${session.businessId}&id=${id}`,
                { method: "DELETE" }
            );

            if (res.ok) {
                setCoupons(prev => prev.filter(c => c.id !== id));
                toast.success("Kupon silindi");
            } else {
                toast.error("Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bağlantı hatası");
        } finally {
            setIsDeleting(null);
        }
    };

    // Toggle status
    const handleToggleStatus = async (coupon: Coupon) => {
        if (!session?.businessId) return;

        const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
        try {
            const res = await fetch("/api/ecommerce/coupons", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId: session.businessId,
                    id: coupon.id,
                    status: newStatus,
                }),
            });

            if (res.ok) {
                setCoupons(prev =>
                    prev.map(c => c.id === coupon.id ? { ...c, status: newStatus } : c)
                );
                toast.success(newStatus === 'active' ? "Kupon aktifleştirildi" : "Kupon devre dışı");
            }
        } catch (error) {
            console.error("Toggle error:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", isDark ? "text-cyan-400" : "text-cyan-500")} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <Ticket className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className={clsx("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Kuponlar</h1>
                        <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>{coupons.length} kupon</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setEditingCoupon(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Yeni Kupon
                </button>
            </div>

            {/* Coupons List */}
            {coupons.length === 0 ? (
                <div className={clsx("text-center py-16 rounded-2xl", isDark ? "bg-white/5" : "bg-gray-50")}>
                    <Ticket className={clsx("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <h3 className={clsx("text-lg font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>Henüz kupon yok</h3>
                    <p className={clsx("mb-4", isDark ? "text-white/50" : "text-gray-500")}>Müşterilerinize indirim sunmak için kupon oluşturun</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600"
                    >
                        <Plus className="h-4 w-4" />
                        İlk Kuponu Oluştur
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {coupons.map((coupon, index) => (
                        <motion.div
                            key={coupon.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={clsx(
                                "rounded-2xl border p-4 transition-all",
                                isDark
                                    ? coupon.status === 'active' ? "bg-white/[0.03] border-white/10" : "bg-white/[0.02] border-white/5 opacity-60"
                                    : coupon.status === 'active' ? "bg-white border-gray-100" : "bg-white border-gray-200 opacity-60"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className={clsx(
                                    "h-12 w-12 rounded-xl flex items-center justify-center",
                                    coupon.type === 'percentage'
                                        ? "bg-purple-100 text-purple-600"
                                        : "bg-green-100 text-green-600"
                                )}>
                                    {coupon.type === 'percentage' ? (
                                        <Percent className="h-5 w-5" />
                                    ) : (
                                        <DollarSign className="h-5 w-5" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={clsx("font-mono font-bold text-lg", isDark ? "text-white" : "text-gray-900")}>
                                            {coupon.code}
                                        </span>
                                        <span className={clsx(
                                            "px-2 py-0.5 text-xs font-medium rounded-full",
                                            coupon.status === 'active'
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-600"
                                        )}>
                                            {coupon.status === 'active' ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                    <div className={clsx("flex flex-wrap gap-3 text-sm", isDark ? "text-white/50" : "text-gray-500")}>
                                        <span>
                                            {coupon.type === 'percentage'
                                                ? `%${coupon.value} indirim`
                                                : `${coupon.value}₺ indirim`}
                                        </span>
                                        {coupon.minOrderAmount && (
                                            <span>Min: {coupon.minOrderAmount}₺</span>
                                        )}
                                        {coupon.usageLimit && (
                                            <span>{coupon.usageCount}/{coupon.usageLimit} kullanım</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleStatus(coupon)}
                                        className={clsx(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                            coupon.status === 'active' ? "bg-emerald-500" : "bg-gray-300"
                                        )}
                                    >
                                        <span
                                            className={clsx(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                coupon.status === 'active' ? "translate-x-6" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingCoupon(coupon);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(coupon.id)}
                                        disabled={isDeleting === coupon.id}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                    >
                                        {isDeleting === coupon.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Coupon Modal */}
            <AnimatePresence>
                {showModal && (
                    <CouponModal
                        coupon={editingCoupon}
                        onSave={handleSave}
                        onClose={() => {
                            setShowModal(false);
                            setEditingCoupon(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Coupon Modal
function CouponModal({
    coupon,
    onSave,
    onClose,
}: {
    coupon: Coupon | null;
    onSave: (data: Partial<Coupon>) => Promise<void>;
    onClose: () => void;
}) {
    const [code, setCode] = useState(coupon?.code || "");
    const [type, setType] = useState<'percentage' | 'fixed'>(coupon?.type || "percentage");
    const [value, setValue] = useState(String(coupon?.value || ""));
    const [minOrderAmount, setMinOrderAmount] = useState(String(coupon?.minOrderAmount || ""));
    const [maxDiscount, setMaxDiscount] = useState(String(coupon?.maxDiscount || ""));
    const [usageLimit, setUsageLimit] = useState(String(coupon?.usageLimit || ""));
    const [startDate, setStartDate] = useState(
        coupon?.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : ""
    );
    const [endDate, setEndDate] = useState(
        coupon?.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : ""
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || code.length < 3) {
            toast.error("Kupon kodu en az 3 karakter olmalı");
            return;
        }
        if (!value || parseFloat(value) <= 0) {
            toast.error("Geçerli bir değer girin");
            return;
        }

        setIsSaving(true);
        await onSave({
            code: code.trim().toUpperCase(),
            type,
            value: parseFloat(value),
            minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
            maxDiscount: type === 'percentage' && maxDiscount ? parseFloat(maxDiscount) : undefined,
            usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            status: coupon?.status || 'active',
        });
        setIsSaving(false);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md"
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">
                            {coupon ? "Kupon Düzenle" : "Yeni Kupon"}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kupon Kodu *
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="INDIRIM20"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono uppercase"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                İndirim Tipi
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType('percentage')}
                                    className={clsx(
                                        "p-3 rounded-xl border text-sm font-medium transition-colors",
                                        type === 'percentage'
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    <Percent className="h-4 w-4 mx-auto mb-1" />
                                    Yüzde
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('fixed')}
                                    className={clsx(
                                        "p-3 rounded-xl border text-sm font-medium transition-colors",
                                        type === 'fixed'
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    <DollarSign className="h-4 w-4 mx-auto mb-1" />
                                    Sabit Tutar
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {type === 'percentage' ? 'İndirim Oranı (%) *' : 'İndirim Tutarı (₺) *'}
                            </label>
                            <input
                                type="number"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={type === 'percentage' ? "20" : "50"}
                                min="0"
                                max={type === 'percentage' ? "100" : undefined}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Min. Sipariş (₺)
                                </label>
                                <input
                                    type="number"
                                    value={minOrderAmount}
                                    onChange={(e) => setMinOrderAmount(e.target.value)}
                                    placeholder="100"
                                    min="0"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                            {type === 'percentage' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Maks. İndirim (₺)
                                    </label>
                                    <input
                                        type="number"
                                        value={maxDiscount}
                                        onChange={(e) => setMaxDiscount(e.target.value)}
                                        placeholder="50"
                                        min="0"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Kullanım Limiti
                                </label>
                                <input
                                    type="number"
                                    value={usageLimit}
                                    onChange={(e) => setUsageLimit(e.target.value)}
                                    placeholder="100"
                                    min="0"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <Calendar className="h-3.5 w-3.5 inline mr-1" />
                                    Başlangıç Tarihi
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <Calendar className="h-3.5 w-3.5 inline mr-1" />
                                    Bitiş Tarihi
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate || undefined}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !code.trim() || !value}
                                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}

