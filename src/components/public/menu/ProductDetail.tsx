"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Clock, Flame, Heart, Check } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface Size {
    id: string;
    name: string;
    priceModifier: number;
}

interface Extra {
    id: string;
    name: string;
    price: number;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    sizes?: Size[];
    extras?: Extra[];
    rating?: number;
    preparationTime?: number;
    isPopular?: boolean;
    ingredients?: string[];
    allergens?: string[];
    nutritionalInfo?: {
        calories?: number;
        protein?: string;
        carbs?: string;
        fat?: string;
    };
}

interface ProductDetailProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ProductDetail({ product, isOpen, onClose }: ProductDetailProps) {
    const [isFavorited, setIsFavorited] = useState(false);
    const [selectedSize, setSelectedSize] = useState<Size | null>(null);

    useEffect(() => {
        if (product) {
            setSelectedSize(product.sizes?.[0] || null);
            setIsFavorited(false);
        }
    }, [product]);

    if (!product) return null;

    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 rounded-full transition-colors hover:bg-[#fe1e50]/5"
                            >
                                <X className="w-6 h-6 text-gray-700" />
                            </button>
                            <h2 className="text-lg font-semibold text-gray-900 truncate flex-1">
                                Ürün Detayı
                            </h2>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsFavorited(!isFavorited)}
                                className="p-2 -mr-2 rounded-full transition-colors hover:bg-[#fe1e50]/5"
                            >
                                <Heart className={`w-6 h-6 ${isFavorited ? "fill-[#fe1e50] text-[#fe1e50]" : "text-gray-400"}`} />
                            </motion.button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Product Image */}
                            <div className="relative h-64 bg-gradient-to-br from-rose-50 to-red-50">
                                {product.imageUrl ? (
                                    <Image
                                        src={toR2ProxyUrl(product.imageUrl)}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-red-100">
                                        <span className="text-8xl">🍔</span>
                                    </div>
                                )}

                                {/* Badges */}
                                <div className="absolute top-3 left-3 flex gap-1.5">
                                    {product.isPopular && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#fe1e50] to-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-lg"
                                        >
                                            <Flame className="w-3 h-3" />
                                            <span>Popüler</span>
                                        </motion.div>
                                    )}
                                    {hasDiscount && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold shadow-lg"
                                        >
                                            -%{discountPercent}
                                        </motion.div>
                                    )}
                                </div>

                                {/* Rating & Time */}
                                <div className="absolute bottom-3 right-3 flex gap-2">
                                    {product.rating && (
                                        <div className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-white/95 backdrop-blur-md text-yellow-600 border border-gray-100 shadow-lg">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            <span>{product.rating}</span>
                                        </div>
                                    )}
                                    {product.preparationTime && (
                                        <div className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-white/95 backdrop-blur-md text-gray-700 border border-gray-100 shadow-lg">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{product.preparationTime} dk</span>
                                        </div>
                                    )}
                                </div>

                                {/* Gradient Fade at Bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
                            </div>

                            <div className="p-5 space-y-6">
                                {/* Name & Price */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
                                        {product.description && (
                                            <p className="mt-2 text-sm text-gray-500 leading-relaxed">{product.description}</p>
                                        )}
                                    </div>
                                    <div className="ml-4 text-right">
                                        {hasDiscount && (
                                            <span className="text-sm text-gray-400 line-through block mb-1">
                                                ₺{product.originalPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                        <span className="text-2xl font-bold text-[#fe1e50]">
                                            ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Size Selection */}
                                {product.sizes && product.sizes.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            📏 Boyut Seçimi
                                        </h4>
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {product.sizes.map((size) => (
                                                <button
                                                    key={size.id}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={clsx(
                                                        "flex-shrink-0 px-5 py-3 rounded-xl border-2 transition-all",
                                                        selectedSize?.id === size.id
                                                            ? "border-[#fe1e50] bg-[#fe1e50]/5 text-[#fe1e50]"
                                                            : "border-gray-200 bg-white text-gray-700 hover:border-[#fe1e50]/30"
                                                    )}
                                                >
                                                    <div className="font-medium">{size.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {size.priceModifier > 0 ? `+₺${size.priceModifier}` : "Standart"}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Ingredients */}
                                {product.ingredients && product.ingredients.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">� İçindekiler</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {product.ingredients.map((ingredient, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-full"
                                                >
                                                    {ingredient}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Allergens */}
                                {product.allergens && product.allergens.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">⚠️ Alerjenler</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {product.allergens.map((allergen, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-full"
                                                >
                                                    {allergen}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Nutritional Info */}
                                {product.nutritionalInfo && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">🔥 Besin Değerleri</h4>
                                        <div className="grid grid-cols-4 gap-2">
                                            {product.nutritionalInfo.calories && (
                                                <div className="bg-[#fe1e50]/5 p-3 rounded-xl text-center">
                                                    <div className="text-xs text-gray-500 mb-1">Kalori</div>
                                                    <div className="font-bold text-[#fe1e50]">{product.nutritionalInfo.calories}</div>
                                                </div>
                                            )}
                                            {product.nutritionalInfo.protein && (
                                                <div className="bg-blue-50 p-3 rounded-xl text-center">
                                                    <div className="text-xs text-gray-500 mb-1">Protein</div>
                                                    <div className="font-bold text-blue-600">{product.nutritionalInfo.protein}</div>
                                                </div>
                                            )}
                                            {product.nutritionalInfo.carbs && (
                                                <div className="bg-yellow-50 p-3 rounded-xl text-center">
                                                    <div className="text-xs text-gray-500 mb-1">Karbonhidrat</div>
                                                    <div className="font-bold text-yellow-600">{product.nutritionalInfo.carbs}</div>
                                                </div>
                                            )}
                                            {product.nutritionalInfo.fat && (
                                                <div className="bg-red-50 p-3 rounded-xl text-center">
                                                    <div className="text-xs text-gray-500 mb-1">Yağ</div>
                                                    <div className="font-bold text-red-600">{product.nutritionalInfo.fat}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Extras Display */}
                                {product.extras && product.extras.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">🧀 Ekstra Malzemeler</h4>
                                        <div className="space-y-2">
                                            {product.extras.map((extra) => (
                                                <div
                                                    key={extra.id}
                                                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50"
                                                >
                                                    <span className="font-medium text-gray-700">{extra.name}</span>
                                                    <span className="font-semibold text-[#fe1e50]">
                                                        +₺{extra.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}