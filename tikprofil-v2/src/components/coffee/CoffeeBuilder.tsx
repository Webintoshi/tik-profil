"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Plus, Minus, X } from "lucide-react";
import Image from "next/image";

type ExtraGroup = {
    id: string;
    name: string;
    selection_type: "single" | "multiple";
    min_selection: number;
    max_selection: number;
    is_required: boolean;
    extras: Array<{
        id: string;
        name: string;
        price_modifier: number;
    }>;
};

type Size = {
    id: string;
    name: string;
    volume_ml: number;
    price_modifier: number;
};

type Product = {
    id: string;
    name: string;
    description: string;
    image_url: string;
    base_price: number;
    extra_groups: ExtraGroup[];
};

type CartItem = {
    product_id: string;
    product_name: string;
    size_id?: string;
    size_name?: string;
    size_price_modifier: number;
    quantity: number;
    selected_extras: Array<{ extra_group_id: string; extra_ids: string[] }>;
    extras_total: number;
    unit_price: number;
    line_total: number;
};

interface CoffeeBuilderProps {
    product: Product;
    sizes: Size[];
    onAddToCart: (item: CartItem) => void;
    onClose: () => void;
}

export default function CoffeeBuilder({ product, sizes, onAddToCart, onClose }: CoffeeBuilderProps) {
    const [selectedSize, setSelectedSize] = useState<Size | null>(sizes[0] || null);
    const [quantity, setQuantity] = useState(1);
    const [selectedExtras, setSelectedExtras] = useState<Record<string, string[]>>({});

    const calculatePrice = () => {
        let price = product.base_price + (selectedSize?.price_modifier || 0);
        
        Object.values(selectedExtras).flat().forEach(extraId => {
            product.extra_groups.forEach(group => {
                const extra = group.extras.find(e => e.id === extraId);
                if (extra) price += extra.price_modifier;
            });
        });
        
        return price;
    };

    const handleExtraToggle = (groupId: string, extraId: string) => {
        const group = product.extra_groups.find(g => g.id === groupId);
        if (!group) return;

        setSelectedExtras(prev => {
            const current = prev[groupId] || [];
            
            if (group.selection_type === "single") {
                return { ...prev, [groupId]: [extraId] };
            } else {
                const exists = current.includes(extraId);
                if (exists) {
                    return { ...prev, [groupId]: current.filter(id => id !== extraId) };
                } else {
                    if (group.max_selection && current.length >= group.max_selection) {
                        return prev;
                    }
                    return { ...prev, [groupId]: [...current, extraId] };
                }
            }
        });
    };

    const handleAddToCart = () => {
        const missingRequired = product.extra_groups
            .filter(g => g.is_required && (!selectedExtras[g.id] || selectedExtras[g.id].length === 0))
            .map(g => g.name);
        
        if (missingRequired.length > 0) {
            alert(`Lütfen seçiniz: ${missingRequired.join(", ")}`);
            return;
        }

        const unitPrice = calculatePrice();
        const extrasTotal = unitPrice - product.base_price - (selectedSize?.price_modifier || 0);
        
        onAddToCart({
            product_id: product.id,
            product_name: product.name,
            size_id: selectedSize?.id,
            size_name: selectedSize?.name,
            size_price_modifier: selectedSize?.price_modifier || 0,
            quantity,
            selected_extras: Object.entries(selectedExtras).map(([groupId, extraIds]) => ({
                extra_group_id: groupId,
                extra_ids: extraIds
            })),
            extras_total: extrasTotal,
            unit_price: unitPrice,
            line_total: unitPrice * quantity
        });
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-lg bg-[#0f0f1a] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto border border-white/[0.1]"
                onClick={e => e.stopPropagation()}
            >
                {/* Product Image */}
                <div className="relative aspect-video">
                    {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-t-3xl" />
                    ) : (
                        <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                            <Coffee className="w-20 h-20 text-white/20" />
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white">{product.name}</h2>
                    <p className="text-white/60 mt-2">{product.description}</p>

                    {/* Sizes */}
                    {sizes.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-medium text-white mb-3">Boyut</h3>
                            <div className="flex gap-2">
                                {sizes.map(size => (
                                    <button
                                        key={size.id}
                                        onClick={() => setSelectedSize(size)}
                                        className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                                            selectedSize?.id === size.id
                                                ? "border-[#fe1e50] bg-[#fe1e50]/10 text-white"
                                                : "border-white/[0.1] bg-white/[0.03] text-white/60 hover:border-white/[0.2]"
                                        }`}
                                    >
                                        <div className="font-semibold">{size.name}</div>
                                        <div className="text-sm text-white/50">{size.volume_ml}ml</div>
                                        {size.price_modifier !== 0 && (
                                            <div className="text-xs mt-1">
                                                {size.price_modifier > 0 ? "+" : ""}₺{size.price_modifier}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extras */}
                    {product.extra_groups.map(group => (
                        <div key={group.id} className="mt-6">
                            <h3 className="font-medium text-white mb-3">
                                {group.name}
                                {group.is_required && <span className="text-[#fe1e50] ml-1">*</span>}
                            </h3>
                            <div className="space-y-2">
                                {group.extras.map(extra => (
                                    <button
                                        key={extra.id}
                                        onClick={() => handleExtraToggle(group.id, extra.id)}
                                        className={`w-full p-3 rounded-xl border text-left flex justify-between transition-all ${
                                            selectedExtras[group.id]?.includes(extra.id)
                                                ? "border-[#fe1e50] bg-[#fe1e50]/10 text-white"
                                                : "border-white/[0.1] bg-white/[0.03] text-white/60 hover:border-white/[0.2]"
                                        }`}
                                    >
                                        <span>{extra.name}</span>
                                        {extra.price_modifier !== 0 && (
                                            <span className="text-sm text-white/50">
                                                {extra.price_modifier > 0 ? "+" : ""}₺{extra.price_modifier}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Quantity */}
                    <div className="mt-6">
                        <h3 className="font-medium text-white mb-3">Adet</h3>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-12 h-12 bg-white/[0.05] rounded-xl flex items-center justify-center text-white hover:bg-white/[0.1]"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <span className="text-2xl font-bold text-white w-12 text-center">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-12 h-12 bg-white/[0.05] rounded-xl flex items-center justify-center text-white hover:bg-white/[0.1]"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Add to Cart */}
                    <div className="mt-8 pt-6 border-t border-white/[0.1]">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-white/60">Toplam</span>
                            <span className="text-2xl font-bold text-white">₺{(calculatePrice() * quantity).toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleAddToCart}
                            className="w-full py-4 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Coffee className="w-5 h-5" />
                            Sepete Ekle
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export type { CartItem };
