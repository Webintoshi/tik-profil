"use client";

import { motion } from "framer-motion";
import { Star, Flame, Clock, ArrowRight } from "lucide-react";
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
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

    return (
        <motion.div
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -4 }}
            onClick={onTap}
            className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm transition-all duration-300 cursor-pointer group hover:shadow-2xl hover:shadow-[#fe1e50]/15 hover:border-[#fe1e50]/30"
        >
            {/* Top Badges */}
            <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                {product.isPopular && !isOutOfStock && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#fe1e50] to-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-[#fe1e50]/30"
                    >
                        <Flame className="w-3 h-3" />
                        <span>Popüler</span>
                    </motion.div>
                )}
                {product.isNew && !isOutOfStock && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-green-500/30"
                    >
                        <span>Yeni</span>
                    </motion.div>
                )}
                {hasDiscount && !isOutOfStock && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold shadow-lg shadow-red-500/30"
                    >
                        -%{discountPercent}
                    </motion.div>
                )}
            </div>

            {/* Image Section */}
            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-red-50">
                {product.imageUrl ? (
                    <Image
                        src={toR2ProxyUrl(product.imageUrl)}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 via-pink-100 to-red-100">
                        <span className="text-8xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-5 drop-shadow-lg">🍔</span>
                    </div>
                )}

                {/* Rating Badge */}
                {product.rating && !isOutOfStock && (
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold bg-white/95 backdrop-blur-md text-yellow-600 border border-gray-100 shadow-lg"
                    >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{product.rating}</span>
                    </motion.div>
                )}

                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center">
                                <span className="text-3xl">😔</span>
                            </div>
                            <span className="text-sm font-semibold text-white">Tükendi</span>
                        </div>
                    </motion.div>
                )}

                {/* Gradient Fade at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Content Section */}
            <div className="p-5">
                {/* Title */}
                <h3 className="font-bold text-xl text-gray-900 mb-2 transition-colors group-hover:text-[#fe1e50] line-clamp-1">
                    {product.name}
                </h3>

                {/* Description */}
                {product.description && (
                    <p className="text-base text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                        {product.description}
                    </p>
                )}

                {/* Meta Info */}
                <div className="flex items-center gap-3 mb-5">
                    {product.preparationTime && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-[#fe1e50]/5 px-3 py-1.5 rounded-full">
                            <Clock className="w-4 h-4 text-[#fe1e50]" />
                            <span>{product.preparationTime} dk</span>
                        </div>
                    )}
                    {product.rating && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-yellow-50 px-3 py-1.5 rounded-full">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{product.rating}</span>
                        </div>
                    )}
                </div>

                {/* Price and View Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex flex-col">
                        {hasDiscount ? (
                            <>
                                <span className="text-sm text-gray-400 line-through">
                                    ₺{product.originalPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-2xl font-bold text-gray-900">
                                    ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                            </>
                        ) : (
                            <span className="text-2xl font-bold text-gray-900">
                                ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </span>
                        )}
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) onTap();
                        }}
                        disabled={isOutOfStock}
                        className={`px-5 py-3 rounded-xl font-semibold text-base flex items-center gap-2 transition-all duration-200 ${isOutOfStock
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-[#fe1e50] text-white shadow-lg shadow-[#fe1e50]/30 hover:shadow-xl hover:shadow-[#fe1e50]/40"
                            }`}
                    >
                        <span>İncele</span>
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

