"use client";

import { motion } from "framer-motion";
import { Star, Flame, Clock, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    inStock?: boolean;
    isPopular?: boolean;
    isNew?: boolean;
    preparationTime?: number;
    rating?: number;
}

interface ProductCardProps {
    product: Product;
    onTap: () => void;
    theme?: "modern" | "classic";
    viewOnly?: boolean;
}

export function ProductCard({ product, onTap, theme = "modern", viewOnly = false }: ProductCardProps) {
    const isOutOfStock = product.inStock === false;
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount && product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            onClick={onTap}
            className="relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-2xl hover:shadow-[#fe1e50]/20 transition-all duration-300 cursor-pointer group border border-gray-100/50"
        >
            {/* Horizontal Card Layout */}
            <div className="flex h-32">
                {/* Left: Image Section - 40% width */}
                <div className="relative w-[120px] flex-shrink-0 bg-gradient-to-br from-[#fe1e50]/10 via-rose-50 to-pink-50">
                    {product.imageUrl ? (
                        <Image
                            src={toR2ProxyUrl(product.imageUrl)}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-5xl drop-shadow-lg">🍔</span>
                        </div>
                    )}

                    {/* Badges Over Image */}
                    <div className="absolute top-2 left-2 flex gap-1">
                        {product.isPopular && !isOutOfStock && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#fe1e50] to-rose-500 text-white text-[10px] font-bold flex items-center gap-0.5 shadow-md"
                            >
                                <Flame className="w-2.5 h-2.5" />
                                <span>Popüler</span>
                            </motion.div>
                        )}
                        {product.isNew && !isOutOfStock && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-md"
                            >
                                Yeni
                            </motion.div>
                        )}
                    </div>

                    {/* Discount Badge */}
                    {hasDiscount && !isOutOfStock && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-red-500 text-white text-xs font-bold shadow-lg">
                            -%{discountPercent}
                        </div>
                    )}

                    {/* Out of Stock Overlay */}
                    {isOutOfStock && (
                        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-lg">Tükendi</span>
                        </div>
                    )}
                </div>

                {/* Right: Content Section - 60% width */}
                <div className="flex-1 flex flex-col justify-between p-3 min-w-0">
                    {/* Top: Title + Rating */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-base text-gray-900 leading-tight line-clamp-2 group-hover:text-[#fe1e50] transition-colors">
                                {product.name}
                            </h3>
                            {product.rating && !isOutOfStock && (
                                <div className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-yellow-50 border border-yellow-200">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-[10px] font-bold text-yellow-700">{product.rating}</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {product.description && (
                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                                {product.description}
                            </p>
                        )}

                        {/* Prep Time */}
                        {product.preparationTime && (
                            <div className="flex items-center gap-1 mt-1.5">
                                <Clock className="w-3 h-3 text-[#fe1e50]" />
                                <span className="text-[11px] text-gray-500">{product.preparationTime} dk</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom: Price + Action */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-baseline gap-1.5">
                            {hasDiscount && (
                                <span className="text-[10px] text-gray-400 line-through">
                                    ₺{product.originalPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                                </span>
                            )}
                            <span className={`font-bold ${hasDiscount ? 'text-[#fe1e50]' : 'text-gray-900'}`}>
                                ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                            </span>
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isOutOfStock) onTap();
                            }}
                            disabled={isOutOfStock}
                            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                                isOutOfStock
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-[#fe1e50] to-rose-500 text-white shadow-lg shadow-[#fe1e50]/30 hover:shadow-xl hover:shadow-[#fe1e50]/40"
                            }`}
                        >
                            <Plus className="w-4 h-4" />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Shine Effect on Hover */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
            />
        </motion.div>
    );
}
