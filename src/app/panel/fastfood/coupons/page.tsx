"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus, Edit3, Trash2, Loader2, Check, X, Tag, Ticket, Calendar,
    Percent, DollarSign, Truck, Copy, Users, ShoppingBag, ToggleLeft, ToggleRight
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";

interface Coupon {
    id: string;
    code: string;
    title: string;
    description: string;
    emoji: string;
    discountType: 'fixed' | 'percentage' | 'free_delivery' | 'bogo';
    discountValue: number;
    maxDiscountAmount: number | null;
    minOrderAmount: number;
    maxUsageCount: number;
    usagePerUser: number;
    currentUsageCount: number;
    validFrom: string;
    validUntil: string | null;
    isActive: boolean;
    isPublic: boolean;
    isFirstOrderOnly: boolean;
    applicableTo: 'all' | 'categories' | 'products';
    createdAt: string;
}

const EMOJI_OPTIONS = ['🎉', '🔥', '⭐', '💰', '🎁', '💥', '🍔', '🍕', '❤️', '✨', '🆓', '🏷️'];
const DISCOUNT_TYPES = [
    { value: 'fixed', label: 'Sabit Tutar (₺)', icon: DollarSign },
    { value: 'percentage', label: 'Yüzde (%)', icon: Percent },
    { value: 'free_delivery', label: 'Ücretsiz Teslimat', icon: Truck },
];

export default function FastFoodCouponsPage() {
    const { isDark } = useTheme();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        description: '',
        emoji: '🎉',
        discountType: 'fixed' as 'fixed' | 'percentage' | 'free_delivery' | 'bogo',
        discountValue: '',
        maxDiscountAmount: '',
        minOrderAmount: '',
        maxUsageCount: '',
        usagePerUser: '',
        validFrom: '',
        validUntil: '',
        isActive: true,
        isPublic: true,
        isFirstOrderOnly: false,
        applicableTo: 'all' as 'all' | 'categories' | 'products',
    });

    // Theme styles
    const cardBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const inputBg = isDark ? "bg-[#2C2C2E] text-white" : "bg-gray-50 text-gray-900";
    const borderColor = isDark ? "border-[#3A3A3C]" : "border-gray-200";

    const loadCoupons = useCallback(async () => {
        try {
            const res = await fetch('/api/fastfood/coupons');
            const data = await res.json();
            if (data.success) setCoupons(data.coupons || []);
        } catch (error) {
            console.error('Failed to load coupons:', error);
            toast.error('Kuponlar yüklenemedi');
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadCoupons(); }, [loadCoupons]);

    const openModal = (coupon?: Coupon) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                title: coupon.title,
                description: coupon.description,
                emoji: coupon.emoji,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue.toString(),
                maxDiscountAmount: coupon.maxDiscountAmount?.toString() || '',
                minOrderAmount: coupon.minOrderAmount?.toString() || '',
                maxUsageCount: coupon.maxUsageCount?.toString() || '',
                usagePerUser: coupon.usagePerUser?.toString() || '',
                validFrom: coupon.validFrom?.split('T')[0] || '',
                validUntil: coupon.validUntil?.split('T')[0] || '',
                isActive: coupon.isActive,
                isPublic: coupon.isPublic,
                isFirstOrderOnly: coupon.isFirstOrderOnly,
                applicableTo: coupon.applicableTo,
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                title: '',
                description: '',
                emoji: '🎉',
                discountType: 'fixed',
                discountValue: '',
                maxDiscountAmount: '',
                minOrderAmount: '',
                maxUsageCount: '',
                usagePerUser: '',
                validFrom: new Date().toISOString().split('T')[0],
                validUntil: '',
                isActive: true,
                isPublic: true,
                isFirstOrderOnly: false,
                applicableTo: 'all',
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.code.trim() || !formData.title.trim()) {
            toast.error('Kupon kodu ve başlık gereklidir');
            return;
        }
        if (formData.discountType !== 'free_delivery' && !formData.discountValue) {
            toast.error('İndirim değeri gereklidir');
            return;
        }

        setSaving(true);
        try {
            const method = editingCoupon ? 'PUT' : 'POST';
            const body = {
                ...(editingCoupon && { id: editingCoupon.id }),
                code: formData.code.toUpperCase().replace(/\s/g, ''),
                title: formData.title,
                description: formData.description,
                emoji: formData.emoji,
                discountType: formData.discountType,
                discountValue: formData.discountType === 'free_delivery' ? 0 : Number(formData.discountValue),
                maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
                minOrderAmount: Number(formData.minOrderAmount) || 0,
                maxUsageCount: Number(formData.maxUsageCount) || 0,
                usagePerUser: Number(formData.usagePerUser) || 0,
                validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
                validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
                isActive: formData.isActive,
                isPublic: formData.isPublic,
                isFirstOrderOnly: formData.isFirstOrderOnly,
                applicableTo: formData.applicableTo,
            };

            const res = await fetch('/api/fastfood/coupons', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (data.success) {
                toast.success(editingCoupon ? 'Kupon güncellendi' : 'Kupon oluşturuldu');
                setShowModal(false);
                loadCoupons();
            } else {
                toast.error(data.error || 'Bir hata oluştu');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Kupon kaydedilemedi');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`/api/fastfood/coupons?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Kupon silindi');
                loadCoupons();
            } else {
                toast.error(data.error || 'Silinemedi');
            }
        } catch (error) {
            toast.error('Bir hata oluştu');
        }
    };

    const toggleActive = async (coupon: Coupon) => {
        try {
            const res = await fetch('/api/fastfood/coupons', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(coupon.isActive ? 'Kupon pasif yapıldı' : 'Kupon aktif yapıldı');
                loadCoupons();
            }
        } catch (error) {
            toast.error('Durum değiştirilemedi');
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Kod kopyalandı: ' + code);
    };

    const getDiscountLabel = (coupon: Coupon) => {
        if (coupon.discountType === 'fixed') return `${coupon.discountValue} TL`;
        if (coupon.discountType === 'percentage') return `%${coupon.discountValue}`;
        if (coupon.discountType === 'free_delivery') return 'Ücretsiz Teslimat';
        return '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={clsx("text-2xl font-bold", textPrimary)}>Kupon Kodları</h1>
                    <p className={clsx("text-sm mt-1", textSecondary)}>İndirim kuponları oluşturun ve yönetin</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Kupon
                </button>
            </div>

            {/* Coupons Grid */}
            {coupons.length === 0 ? (
                <div className={clsx("rounded-2xl p-12 text-center", cardBg)}>
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Ticket className="w-8 h-8 text-purple-500" />
                    </div>
                    <h3 className={clsx("text-lg font-semibold mb-2", textPrimary)}>Henüz Kupon Yok</h3>
                    <p className={clsx("text-sm mb-6", textSecondary)}>İlk kuponunuzu oluşturarak başlayın</p>
                    <button
                        onClick={() => openModal()}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
                    >
                        Kupon Oluştur
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {coupons.map(coupon => (
                        <div key={coupon.id} className={clsx("rounded-2xl p-5 relative group", cardBg, !coupon.isActive && "opacity-60")}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{coupon.emoji}</span>
                                    <div>
                                        <h3 className={clsx("font-bold", textPrimary)}>{coupon.title}</h3>
                                        <span className="text-sm text-purple-500 font-semibold">{getDiscountLabel(coupon)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleActive(coupon)}
                                    className={clsx(
                                        "w-12 h-6 rounded-full relative transition-colors",
                                        coupon.isActive ? "bg-green-500" : "bg-gray-400"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow",
                                        coupon.isActive ? "right-0.5" : "left-0.5"
                                    )} />
                                </button>
                            </div>

                            {/* Code */}
                            <button
                                onClick={() => copyCode(coupon.code)}
                                className={clsx(
                                    "w-full py-2.5 px-4 rounded-xl border-2 border-dashed flex items-center justify-between group/code hover:border-purple-500 transition-colors",
                                    borderColor
                                )}
                            >
                                <span className={clsx("font-mono font-bold tracking-wider", textPrimary)}>{coupon.code}</span>
                                <Copy className="w-4 h-4 text-gray-400 group-hover/code:text-purple-500" />
                            </button>

                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-3 text-xs">
                                {coupon.minOrderAmount > 0 && (
                                    <span className={textSecondary}>Min. {coupon.minOrderAmount} TL</span>
                                )}
                                {coupon.maxUsageCount > 0 && (
                                    <span className={textSecondary}>
                                        <Users className="w-3 h-3 inline mr-1" />
                                        {coupon.currentUsageCount}/{coupon.maxUsageCount}
                                    </span>
                                )}
                                {coupon.isFirstOrderOnly && (
                                    <span className="text-orange-500">İlk Sipariş</span>
                                )}
                                {coupon.isPublic && (
                                    <span className="text-green-500">Menüde Görünür</span>
                                )}
                            </div>

                            {/* Validity */}
                            {coupon.validUntil && (
                                <div className={clsx("flex items-center gap-1 mt-2 text-xs", textSecondary)}>
                                    <Calendar className="w-3 h-3" />
                                    <span>Son: {new Date(coupon.validUntil).toLocaleDateString('tr-TR')}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openModal(coupon)}
                                    className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-500 transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(coupon.id)}
                                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
                    <div className={clsx("relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6", cardBg)}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={clsx("text-xl font-bold", textPrimary)}>
                                {editingCoupon ? 'Kuponu Düzenle' : 'Yeni Kupon'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className={clsx("p-2 rounded-lg hover:bg-gray-100", isDark && "hover:bg-white/10")}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Emoji & Code Row */}
                        <div className="flex gap-3 mb-4">
                            <div>
                                <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Emoji</label>
                                <div className="flex gap-1 flex-wrap">
                                    {EMOJI_OPTIONS.map(e => (
                                        <button
                                            key={e}
                                            onClick={() => setFormData(p => ({ ...p, emoji: e }))}
                                            className={clsx(
                                                "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                                                formData.emoji === e ? "bg-purple-500/20 ring-2 ring-purple-500" : "hover:bg-gray-100 dark:hover:bg-white/10"
                                            )}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Code */}
                        <div className="mb-4">
                            <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Kupon Kodu *</label>
                            <input
                                type="text"
                                placeholder="YENIUYE50"
                                value={formData.code}
                                onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                className={clsx("w-full px-4 py-3 rounded-xl font-mono font-bold tracking-wider uppercase", inputBg)}
                            />
                        </div>

                        {/* Title */}
                        <div className="mb-4">
                            <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Başlık *</label>
                            <input
                                type="text"
                                placeholder="50 TL İndirim"
                                value={formData.title}
                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                            <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Açıklama</label>
                            <textarea
                                placeholder="İlk siparişe özel indirim"
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                className={clsx("w-full px-4 py-3 rounded-xl resize-none", inputBg)}
                                rows={2}
                            />
                        </div>

                        {/* Discount Type */}
                        <div className="mb-4">
                            <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>İndirim Tipi</label>
                            <div className="grid grid-cols-3 gap-2">
                                {DISCOUNT_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => setFormData(p => ({ ...p, discountType: type.value as typeof p.discountType }))}
                                        className={clsx(
                                            "p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                                            formData.discountType === type.value
                                                ? "border-purple-500 bg-purple-500/10"
                                                : borderColor
                                        )}
                                    >
                                        <type.icon className={clsx("w-5 h-5", formData.discountType === type.value ? "text-purple-500" : textSecondary)} />
                                        <span className={clsx("text-xs font-medium", formData.discountType === type.value ? "text-purple-500" : textSecondary)}>
                                            {type.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Discount Value */}
                        {formData.discountType !== 'free_delivery' && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>
                                        {formData.discountType === 'percentage' ? 'Yüzde (%)' : 'Tutar (₺)'}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder={formData.discountType === 'percentage' ? '15' : '50'}
                                        value={formData.discountValue}
                                        onChange={e => setFormData(p => ({ ...p, discountValue: e.target.value }))}
                                        className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                                    />
                                </div>
                                {formData.discountType === 'percentage' && (
                                    <div>
                                        <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Max İndirim (₺)</label>
                                        <input
                                            type="number"
                                            placeholder="100"
                                            value={formData.maxDiscountAmount}
                                            onChange={e => setFormData(p => ({ ...p, maxDiscountAmount: e.target.value }))}
                                            className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Minimum Order */}
                        <div className="mb-4">
                            <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Minimum Sipariş (₺)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.minOrderAmount}
                                onChange={e => setFormData(p => ({ ...p, minOrderAmount: e.target.value }))}
                                className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                            />
                        </div>

                        {/* Usage Limits */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Toplam Kullanım Limiti</label>
                                <input
                                    type="number"
                                    placeholder="0 = Sınırsız"
                                    value={formData.maxUsageCount}
                                    onChange={e => setFormData(p => ({ ...p, maxUsageCount: e.target.value }))}
                                    className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                                />
                            </div>
                            <div>
                                <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Kişi Başı Limit</label>
                                <input
                                    type="number"
                                    placeholder="0 = Sınırsız"
                                    value={formData.usagePerUser}
                                    onChange={e => setFormData(p => ({ ...p, usagePerUser: e.target.value }))}
                                    className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                                />
                            </div>
                        </div>

                        {/* Validity Dates */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    value={formData.validFrom}
                                    onChange={e => setFormData(p => ({ ...p, validFrom: e.target.value }))}
                                    className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                                />
                            </div>
                            <div>
                                <label className={clsx("block text-xs font-medium mb-1.5", textSecondary)}>Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    value={formData.validUntil}
                                    onChange={e => setFormData(p => ({ ...p, validUntil: e.target.value }))}
                                    className={clsx("w-full px-4 py-3 rounded-xl", inputBg)}
                                />
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-3 mb-6">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className={textPrimary}>Aktif</span>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
                                    className={clsx("w-12 h-6 rounded-full relative transition-colors", formData.isActive ? "bg-green-500" : "bg-gray-400")}
                                >
                                    <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow", formData.isActive ? "right-0.5" : "left-0.5")} />
                                </button>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className={textPrimary}>Menüde Göster</span>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, isPublic: !p.isPublic }))}
                                    className={clsx("w-12 h-6 rounded-full relative transition-colors", formData.isPublic ? "bg-green-500" : "bg-gray-400")}
                                >
                                    <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow", formData.isPublic ? "right-0.5" : "left-0.5")} />
                                </button>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className={textPrimary}>Sadece İlk Sipariş</span>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, isFirstOrderOnly: !p.isFirstOrderOnly }))}
                                    className={clsx("w-12 h-6 rounded-full relative transition-colors", formData.isFirstOrderOnly ? "bg-orange-500" : "bg-gray-400")}
                                >
                                    <div className={clsx("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow", formData.isFirstOrderOnly ? "right-0.5" : "left-0.5")} />
                                </button>
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            {editingCoupon ? 'Değişiklikleri Kaydet' : 'Kupon Oluştur'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
