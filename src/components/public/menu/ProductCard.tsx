"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import Image from "next/image";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    inStock?: boolean;
}

interface ProductCardProps {
    product: Product;
    onTap: () => void;
    onQuickAdd: () => void;
}

export function ProductCard({ product, onTap, onQuickAdd }: ProductCardProps) {
    const isOutOfStock = product.inStock === false;

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={onTap}
            className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
        >
            {/* Product Image */}
            <div className="relative flex-shrink-0">
                {product.imageUrl ? (
                    <Image
                        src={toR2ProxyUrl(product.imageUrl)}
                        alt={product.name}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-xl bg-gray-100"

                    />
                ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-3xl">🍔</span>
                    </div>
                )}

                {isOutOfStock && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Tükendi
                        </span>
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0 flex flex-col">
                <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>

                {product.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-0.5 flex-1">
                        {product.description}
                    </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="font-bold text-gray-900">
                        ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>

                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) onQuickAdd();
                        }}
                        disabled={isOutOfStock}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${isOutOfStock
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40"
                            }`}
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

