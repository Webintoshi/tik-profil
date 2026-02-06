"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, Minus, Plus, X, CreditCard } from "lucide-react";
import type { CartItem } from "./CoffeeBuilder";

interface CoffeeCartProps {
    items: CartItem[];
    onUpdateQuantity: (index: number, delta: number) => void;
    onRemove: (index: number) => void;
    onCheckout: () => void;
    onClear: () => void;
}

export default function CoffeeCart({ items, onUpdateQuantity, onRemove, onCheckout, onClear }: CoffeeCartProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tipPercent, setTipPercent] = useState(0);
    const [tipAmount, setTipAmount] = useState(0);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const tip = tipPercent > 0 ? (subtotal * tipPercent) / 100 : tipAmount;
    const total = subtotal + tip;

    useEffect(() => {
        if (items.length === 0 && isOpen) {
            setIsOpen(false);
        }
    }, [items.length, isOpen]);

    const handleCheckout = () => {
        onCheckout();
        setIsOpen(false);
    };

    return (
        <>
            {/* Cart Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsOpen(true)}
                disabled={items.length === 0}
                className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all ${
                    items.length > 0 
                        ? "bg-[#fe1e50] text-white hover:bg-[#fe1e50]/90 shadow-[#fe1e50]/30" 
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                }`}
            >
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                        {totalItems}
                    </span>
                )}
            </motion.button>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#0f0f1a] border-l border-white/[0.1] flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/[0.1] flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Sepetim</h2>
                                    <p className="text-white/40 text-sm">{totalItems} ürün</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {items.length > 0 && (
                                        <button
                                            onClick={() => { if (confirm("Sepeti temizlemek istediğinize emin misiniz?")) { onClear(); setIsOpen(false); } }}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-lg transition"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-white/40">
                                        <ShoppingCart className="w-16 h-16 mb-4 text-white/10" />
                                        <p>Sepetiniz boş</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {items.map((item, index) => (
                                            <div key={index} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05]">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-white">{item.product_name}</h4>
                                                        {item.size_name && (
                                                            <span className="text-sm text-[#fe1e50]">{item.size_name}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => onRemove(index)}
                                                        className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition ml-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => onUpdateQuantity(index, -1)}
                                                            disabled={item.quantity <= 1}
                                                            className="w-8 h-8 rounded-full border border-white/[0.1] flex items-center justify-center hover:bg-white/[0.05] disabled:opacity-30 transition"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="w-8 text-center font-semibold text-white">{item.quantity}</span>
                                                        <button
                                                            onClick={() => onUpdateQuantity(index, 1)}
                                                            className="w-8 h-8 rounded-full border border-white/[0.1] flex items-center justify-center hover:bg-white/[0.05] transition"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <span className="font-bold text-white">₺{item.line_total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {items.length > 0 && (
                                <div className="border-t border-white/[0.1] bg-white/[0.02] p-6">
                                    {/* Tip */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CreditCard className="w-4 h-4 text-white/40" />
                                            <span className="text-sm font-medium text-white/60">Bahşiş</span>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            {[0, 5, 10, 15, 20].map(percent => (
                                                <button
                                                    key={percent}
                                                    onClick={() => { setTipPercent(percent); setTipAmount(0); }}
                                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                                                        tipPercent === percent && tipAmount === 0
                                                            ? "bg-[#fe1e50] text-white"
                                                            : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"
                                                    }`}
                                                >
                                                    {percent === 0 ? "Yok" : `%${percent}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Totals */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/40">Ara Toplam</span>
                                            <span className="font-medium text-white">₺{subtotal.toFixed(2)}</span>
                                        </div>
                                        {tip > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-white/40">Bahşiş</span>
                                                <span className="font-medium text-emerald-400">+₺{tip.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/[0.1]">
                                            <span className="text-white">Toplam</span>
                                            <span className="text-[#fe1e50]">₺{total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCheckout}
                                        className="w-full py-4 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        Siparişi Tamamla
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

export type { CartItem };
