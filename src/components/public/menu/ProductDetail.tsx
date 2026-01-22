"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface Extra {
    id: string;
    name: string;
    price: number;
}

interface Size {
    id: string;
    name: string;
    priceModifier: number;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    sizes?: Size[];
    extras?: Extra[];
}

interface ProductDetailProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: {
        productId: string;
        name: string;
        basePrice: number;
        quantity: number;
        selectedExtras: Extra[];
        selectedSize?: Size;
        note: string;
        image?: string;
    }) => void;
}

export function ProductDetail({ product, isOpen, onClose, onAddToCart }: ProductDetailProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState<Size | null>(null);
    const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
    const [note, setNote] = useState("");

    // Reset state when product changes
    useEffect(() => {
        if (product) {
            setQuantity(1);
            setSelectedSize(product.sizes?.[0] || null);
            setSelectedExtras([]);
            setNote("");
        }
    }, [product]);

    // Calculate total price
    const calculateTotal = () => {
        if (!product) return 0;
        const basePrice = product.price;
        const sizeModifier = selectedSize?.priceModifier || 0;
        const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
        return (basePrice + sizeModifier + extrasTotal) * quantity;
    };

    const toggleExtra = (extra: Extra) => {
        setSelectedExtras(prev =>
            prev.find(e => e.id === extra.id)
                ? prev.filter(e => e.id !== extra.id)
                : [...prev, extra]
        );
    };

    const handleAddToCart = () => {
        if (!product) return;

        onAddToCart({
            productId: product.id,
            name: product.name,
            basePrice: product.price,
            quantity,
            selectedExtras,
            selectedSize: selectedSize || undefined,
            note,
            image: product.imageUrl
        });

        onClose();
    };

    if (!product) return null;

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
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
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
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6 text-gray-700" />
                            </button>
                            <h2 className="text-lg font-semibold text-gray-900 truncate flex-1">
                                {product.name}
                            </h2>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Product Image */}
                            <div className="relative h-48 bg-gray-100">
                                {product.imageUrl ? (
                                    <Image
                                        src={toR2ProxyUrl(product.imageUrl)}
                                        alt={product.name}
                                        fill
                                        className="object-cover"

                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                        <span className="text-6xl">🍔</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 space-y-6">
                                {/* Name & Price */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                                        {product.description && (
                                            <p className="text-gray-500 mt-1">{product.description}</p>
                                        )}
                                    </div>
                                    <span className="text-xl font-bold text-violet-600 shrink-0 ml-4">
                                        ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {/* Size Selection */}
                                {product.sizes && product.sizes.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            📏 Boyut Seçin
                                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                Zorunlu
                                            </span>
                                        </h4>
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {product.sizes.map((size) => (
                                                <button
                                                    key={size.id}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={clsx(
                                                        "flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all",
                                                        selectedSize?.id === size.id
                                                            ? "border-violet-500 bg-violet-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <div className="font-medium text-gray-900">{size.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {size.priceModifier > 0 ? `+₺${size.priceModifier}` : "Standart"}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Extras Selection */}
                                {product.extras && product.extras.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            🧀 Ekstra Malzemeler
                                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                Opsiyonel
                                            </span>
                                        </h4>
                                        <div className="space-y-2">
                                            {product.extras.map((extra) => {
                                                const isSelected = selectedExtras.find(e => e.id === extra.id);
                                                return (
                                                    <button
                                                        key={extra.id}
                                                        onClick={() => toggleExtra(extra)}
                                                        className={clsx(
                                                            "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                                                            isSelected
                                                                ? "border-violet-500 bg-violet-50"
                                                                : "border-gray-100 hover:border-gray-200"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={clsx(
                                                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                                isSelected
                                                                    ? "border-violet-500 bg-violet-500"
                                                                    : "border-gray-300"
                                                            )}>
                                                                {isSelected && (
                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span className="font-medium text-gray-900">{extra.name}</span>
                                                        </div>
                                                        <span className="text-violet-600 font-medium">
                                                            +₺{extra.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Order Note */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">📝 Sipariş Notu</h4>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Örn: Az pişmiş olsun, soğan olmasın..."
                                        className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 p-4 bg-white">
                            <div className="flex items-center gap-4">
                                {/* Quantity Selector */}
                                <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-2">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Add to Cart Button */}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAddToCart}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/25"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    <span>Sepete Ekle</span>
                                    <span className="ml-1">
                                        ₺{calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

