"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Plus,
    ArrowLeft,
    Image as ImageIcon,
    Loader2,
    X,
    Check,
    Upload,
    Sparkles,
    Coffee,
    Tag,
    DollarSign,
    FolderOpen
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { uploadImageWithFallback } from "@/lib/clientUpload";

interface Category {
    id: string;
    name: string;
    icon: string;
}

interface Size {
    id: string;
    name: string;
    price_modifier: number;
}

interface ExtraGroup {
    id: string;
    name: string;
}

export default function NewCoffeeProductPage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { session, loading: sessionLoading } = useBusinessSession();
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [sizes, setSizes] = useState<Size[]>([]);
    const [extraGroups, setExtraGroups] = useState<ExtraGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [generatingImage, setGeneratingImage] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        base_price: "",
        category_id: "",
        image_url: "",
        is_available: true,
        is_featured: false,
        // Size prices
        size_prices: {} as Record<string, string>,
        // Selected extras
        extra_group_ids: [] as string[],
    });

    // Theme Variables
    const pageBg = isDark ? "bg-[#0a0a0a]" : "bg-gray-50";
    const cardBg = isDark ? "bg-gray-800" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const inputBg = isDark ? "bg-white/5" : "bg-gray-50";
    const borderColor = isDark ? "border-white/10" : "border-gray-200";

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push("/giris-yap");
            return;
        }
        if (session?.businessId) {
            loadData();
        }
    }, [session, sessionLoading]);

    const loadData = async () => {
        try {
            const [catRes, sizesRes, extrasRes] = await Promise.all([
                fetch(`/api/coffee/categories?business_id=${session?.businessId}`),
                fetch(`/api/coffee/sizes?business_id=${session?.businessId}`),
                fetch(`/api/coffee/extra-groups?business_id=${session?.businessId}`)
            ]);

            const catData = await catRes.json();
            const sizesData = await sizesRes.json();
            const extrasData = await extrasRes.json();

            if (catData.data) {
                setCategories(catData.data);
                if (catData.data.length > 0) {
                    setFormData(prev => ({ ...prev, category_id: catData.data[0].id }));
                }
            }
            if (sizesData.data) {
                setSizes(sizesData.data);
            }
            if (extrasData.data) {
                setExtraGroups(extrasData.data);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Veriler yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Dosya boyutu 5MB'dan küçük olmalı");
            return;
        }

        setUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setFormData(prev => ({ ...prev, image_url: e.target!.result as string }));
            }
        };
        reader.readAsDataURL(file);

        try {
            const { url } = await uploadImageWithFallback({
                file,
                moduleName: "coffee",
                fallbackEndpoint: "/api/coffee/upload",
            });

            if (url) {
                setFormData(prev => ({ ...prev, image_url: url }));
                toast.success("Fotoğraf yüklendi");
            } else {
                toast.error("Fotoğraf yüklenemedi");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Fotoğraf yükleme hatası");
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!formData.name.trim()) {
            toast.error("Lütfen önce ürün adını girin");
            return;
        }

        setGeneratingImage(true);
        try {
            const categoryName = categories.find(c => c.id === formData.category_id)?.name || 'Coffee';

            const res = await fetch('/api/coffee/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessType: 'Coffee Shop',
                    productTitle: formData.name.trim(),
                    productDescription: formData.description.trim() || formData.name.trim(),
                    category: categoryName,
                }),
            });

            const data = await res.json();

            if (data.success && data.imageUrl) {
                setFormData(prev => ({ ...prev, image_url: data.imageUrl }));
                toast.success("✨ Görsel başarıyla oluşturuldu!");
            } else {
                toast.error(data.error || "Görsel oluşturulamadı");
            }
        } catch (error) {
            console.error("Generate image error:", error);
            toast.error("Görsel oluşturma hatası");
        } finally {
            setGeneratingImage(false);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.name.trim() || !formData.base_price || !formData.category_id) {
            toast.error("Ürün adı, fiyat ve kategori zorunludur");
            return;
        }

        if (uploading) {
            toast.error("Fotoğraf yükleniyor, lütfen bekleyin");
            return;
        }

        if (formData.image_url?.startsWith("data:image/")) {
            toast.error("Görsel yükleme tamamlanmadan kaydedilemez");
            return;
        }

        setSaving(true);
        try {
            const sizePrices = Object.entries(formData.size_prices)
                .filter(([_, price]) => price)
                .map(([size_id, price]) => ({
                    size_id,
                    price: parseFloat(price)
                }));

            const res = await fetch("/api/coffee/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    business_id: session?.businessId,
                    name: formData.name,
                    description: formData.description,
                    base_price: parseFloat(formData.base_price),
                    category_id: formData.category_id,
                    image_url: formData.image_url,
                    is_available: formData.is_available,
                    is_featured: formData.is_featured,
                    size_prices: sizePrices.length > 0 ? sizePrices : undefined,
                    extra_group_ids: formData.extra_group_ids.length > 0 ? formData.extra_group_ids : undefined,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Ürün başarıyla eklendi!");
                router.push("/panel/coffee/products");
            } else {
                toast.error(data.error || "Ürün eklenemedi");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setSaving(false);
        }
    };

    const toggleExtraGroup = (groupId: string) => {
        setFormData(prev => ({
            ...prev,
            extra_group_ids: prev.extra_group_ids.includes(groupId)
                ? prev.extra_group_ids.filter(id => id !== groupId)
                : [...prev.extra_group_ids, groupId]
        }));
    };

    if (sessionLoading || loading) {
        return (
            <div className={clsx("min-h-screen flex items-center justify-center", pageBg)}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#fe1e50]" />
                    <p className={textSecondary}>Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={clsx("min-h-screen pb-20", pageBg)}>
            {/* Header */}
            <div className={clsx("sticky top-0 z-40 border-b", cardBg, borderColor)}>
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/panel/coffee/products")}
                            className={clsx(
                                "p-2.5 rounded-xl transition-colors",
                                isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                            )}
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className={clsx("text-2xl font-bold", textPrimary)}>Yeni Ürün</h1>
                            <p className={clsx("text-sm", textSecondary)}>Kahve menünüze ürün ekleyin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl font-semibold shadow-lg shadow-[#fe1e50]/20 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Check className="w-5 h-5" />
                        )}
                        Kaydet
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Image */}
                    <div className="lg:col-span-1">
                        <div className={clsx("rounded-3xl p-6 border", cardBg, borderColor)}>
                            <h3 className={clsx("font-semibold mb-4 flex items-center gap-2", textPrimary)}>
                                <ImageIcon className="w-5 h-5" />
                                Ürün Görseli
                            </h3>
                            
                            <label className={clsx(
                                "relative aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 border-dashed overflow-hidden group",
                                inputBg, borderColor,
                                "hover:border-[#fe1e50] hover:scale-[1.02]"
                            )}>
                                {formData.image_url ? (
                                    <img 
                                        src={formData.image_url.startsWith("http") ? toR2ProxyUrl(formData.image_url) : formData.image_url} 
                                        className="w-full h-full object-cover" 
                                        alt="" 
                                    />
                                ) : (
                                    <>
                                        <div className="p-4 rounded-full bg-[#fe1e50]/10 mb-3 group-hover:bg-[#fe1e50]/20 transition-colors">
                                            <Upload className="w-8 h-8 text-[#fe1e50]" />
                                        </div>
                                        <span className={clsx("text-sm font-medium", textSecondary)}>Fotoğraf Yükle</span>
                                        <span className={clsx("text-xs mt-1", textSecondary)}>veya sürükle bırak</span>
                                    </>
                                )}

                                {formData.image_url && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="w-8 h-8 text-white" />
                                    </div>
                                )}

                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                                    </div>
                                )}
                                {generatingImage && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/80 to-pink-500/80 flex flex-col items-center justify-center">
                                        <Loader2 className="w-10 h-10 animate-spin text-white mb-2" />
                                        <span className="text-white text-sm font-medium">AI Oluşturuyor...</span>
                                    </div>
                                )}
                            </label>

                            {/* AI Generate Button */}
                            <button
                                type="button"
                                onClick={handleGenerateImage}
                                disabled={generatingImage || !formData.name.trim()}
                                className={clsx(
                                    "w-full mt-4 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                                    "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
                                    "hover:from-purple-700 hover:to-pink-700 hover:shadow-lg hover:shadow-purple-500/25",
                                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                )}
                            >
                                {generatingImage ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Oluşturuyor...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        AI ile Görsel Oluştur
                                    </>
                                )}
                            </button>

                            {/* Remove Image */}
                            {formData.image_url && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                                    className={clsx(
                                        "w-full mt-2 py-2 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all",
                                        isDark ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    )}
                                >
                                    <X className="w-4 h-4" />
                                    Görseli Kaldır
                                </button>
                            )}
                        </div>

                        {/* Quick Tips */}
                        <div className={clsx("mt-6 rounded-2xl p-5 border", cardBg, borderColor)}>
                            <h4 className={clsx("font-semibold text-sm mb-3", textPrimary)}>💡 İpuçları</h4>
                            <ul className={clsx("text-sm space-y-2", textSecondary)}>
                                <li>• Ürün adı kısa ve açıklayıcı olsun</li>
                                <li>• Güzel bir görsel satışları artırır</li>
                                <li>• Fiyatı piyasa koşullarına göre belirleyin</li>
                                <li>• Boyut farkları ekleyebilirsiniz</li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <div className={clsx("rounded-3xl p-6 border", cardBg, borderColor)}>
                            <h3 className={clsx("font-semibold mb-6 flex items-center gap-2", textPrimary)}>
                                <Coffee className="w-5 h-5" />
                                Temel Bilgiler
                            </h3>

                            <div className="space-y-5">
                                {/* Product Name */}
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textPrimary)}>
                                        Ürün Adı <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Örn: Caramel Macchiato"
                                        className={clsx(
                                            "w-full px-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all",
                                            inputBg, borderColor, textPrimary,
                                            isDark ? "placeholder:text-gray-600" : "placeholder:text-gray-400"
                                        )}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-2", textPrimary)}>
                                        Açıklama
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Ürün hakkında kısa bir açıklama..."
                                        rows={3}
                                        className={clsx(
                                            "w-full px-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all resize-none",
                                            inputBg, borderColor, textPrimary,
                                            isDark ? "placeholder:text-gray-600" : "placeholder:text-gray-400"
                                        )}
                                    />
                                </div>

                                {/* Category & Price Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-2", textPrimary)}>
                                            Kategori <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <FolderOpen className={clsx("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", textSecondary)} />
                                            <select
                                                value={formData.category_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                                                className={clsx(
                                                    "w-full pl-12 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all appearance-none",
                                                    inputBg, borderColor, textPrimary
                                                )}
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-2", textPrimary)}>
                                            Fiyat (₺) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <DollarSign className={clsx("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", textSecondary)} />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.base_price}
                                                onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                                                placeholder="0.00"
                                                className={clsx(
                                                    "w-full pl-12 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all",
                                                    inputBg, borderColor, textPrimary,
                                                    isDark ? "placeholder:text-gray-600" : "placeholder:text-gray-400"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Status Toggles */}
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={clsx(
                                            "relative w-14 h-7 rounded-full transition-colors",
                                            formData.is_available ? "bg-[#fe1e50]" : isDark ? "bg-gray-700" : "bg-gray-300"
                                        )}>
                                            <input
                                                type="checkbox"
                                                checked={formData.is_available}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                                                className="sr-only"
                                            />
                                            <span className={clsx(
                                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
                                                formData.is_available ? "translate-x-7" : "translate-x-1"
                                            )} />
                                        </div>
                                        <span className={clsx("text-sm font-medium", textPrimary)}>Satışta</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={clsx(
                                            "relative w-14 h-7 rounded-full transition-colors",
                                            formData.is_featured ? "bg-amber-500" : isDark ? "bg-gray-700" : "bg-gray-300"
                                        )}>
                                            <input
                                                type="checkbox"
                                                checked={formData.is_featured}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                                                className="sr-only"
                                            />
                                            <span className={clsx(
                                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
                                                formData.is_featured ? "translate-x-7" : "translate-x-1"
                                            )} />
                                        </div>
                                        <span className={clsx("text-sm font-medium", textPrimary)}>Öne Çıkan</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Size Prices */}
                        {sizes.length > 0 && (
                            <div className={clsx("rounded-3xl p-6 border", cardBg, borderColor)}>
                                <h3 className={clsx("font-semibold mb-6 flex items-center gap-2", textPrimary)}>
                                    <Tag className="w-5 h-5" />
                                    Boyut Fiyatları
                                </h3>
                                <p className={clsx("text-sm mb-4", textSecondary)}>
                                    Her boyut için farklı fiyat belirleyebilirsiniz (boş bırakılırsa temel fiyat kullanılır)
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {sizes.map(size => (
                                        <div key={size.id}>
                                            <label className={clsx("block text-sm font-medium mb-2", textPrimary)}>
                                                {size.name} {size.volume_ml > 0 && `(${size.volume_ml}ml)`}
                                            </label>
                                            <div className="relative">
                                                <span className={clsx("absolute left-4 top-1/2 -translate-y-1/2 text-sm", textSecondary)}>₺</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.size_prices[size.id] || ""}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        size_prices: { ...prev.size_prices, [size.id]: e.target.value }
                                                    }))}
                                                    placeholder={formData.base_price || "0.00"}
                                                    className={clsx(
                                                        "w-full pl-8 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all",
                                                        inputBg, borderColor, textPrimary,
                                                        isDark ? "placeholder:text-gray-600" : "placeholder:text-gray-400"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extra Groups */}
                        {extraGroups.length > 0 && (
                            <div className={clsx("rounded-3xl p-6 border", cardBg, borderColor)}>
                                <h3 className={clsx("font-semibold mb-4 flex items-center gap-2", textPrimary)}>
                                    <Plus className="w-5 h-5" />
                                    Ekstra Seçenekleri
                                </h3>
                                <p className={clsx("text-sm mb-4", textSecondary)}>
                                    Bu ürün için hangi ekstra seçenek gruplarının aktif olacağını seçin
                                </p>

                                <div className="flex flex-wrap gap-3">
                                    {extraGroups.map(group => (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => toggleExtraGroup(group.id)}
                                            className={clsx(
                                                "px-4 py-2.5 rounded-xl font-medium text-sm transition-all border",
                                                formData.extra_group_ids.includes(group.id)
                                                    ? "bg-[#fe1e50] text-white border-[#fe1e50]"
                                                    : clsx(inputBg, borderColor, textPrimary, "hover:border-[#fe1e50]/50")
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {formData.extra_group_ids.includes(group.id) && (
                                                    <Check className="w-4 h-4" />
                                                )}
                                                {group.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
