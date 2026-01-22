"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Minus, Plus, Trash2, MessageSquare, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCart, calculateItemTotal, formatWhatsAppOrder } from "@/contexts/CartContext";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface CartSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckout?: () => void;
}

export function CartSheet({ isOpen, onClose, onCheckout }: CartSheetProps) {
    const cart = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCheckout = () => {
        if (cart.items.length === 0) return;

        if (onCheckout) {
            onCheckout();
            return;
        }

        setIsSubmitting(true);

        const message = formatWhatsAppOrder(cart);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${cart.whatsappNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, "_blank");

        // Clear cart after sending
        setTimeout(() => {
            cart.clearCart();
            onClose();
            setIsSubmitting(false);
        }, 1000);
    };

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
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                                </button>
                                <h2 className="text-lg font-semibold text-gray-900">Sepetim</h2>
                            </div>
                            <span className="text-sm text-gray-500">{cart.itemCount} ürün</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <span className="text-4xl">🛒</span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Sepetiniz boş</h3>
                                    <p className="text-gray-500 text-sm">Menüden ürün ekleyerek başlayın</p>
                                </div>
                            ) : (
                                <>
                                    {cart.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex gap-3 p-3 bg-gray-50 rounded-2xl"
                                        >
                                            {/* Image */}
                                            <div className="relative w-16 h-16 flex-shrink-0">
                                                {item.image ? (
                                                    <Image
                                                        src={toR2ProxyUrl(item.image)}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover rounded-xl"

                                                    />
                                                ) : (
                                                    <div className="w-full h-full rounded-xl bg-gray-200 flex items-center justify-center">
                                                        <span className="text-2xl">🍔</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>

                                                {/* Details */}
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {item.selectedSize && (
                                                        <span>{item.selectedSize.name}</span>
                                                    )}
                                                    {item.selectedExtras.length > 0 && (
                                                        <span>{item.selectedSize ? ", " : ""}{item.selectedExtras.map(e => e.name).join(", ")}</span>
                                                    )}
                                                </div>

                                                {/* Price & Quantity */}
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-bold text-violet-600">
                                                        ₺{calculateItemTotal(item).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </span>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                                                            className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Minus className="w-4 h-4 text-gray-600" />
                                                        </button>
                                                        <span className="w-6 text-center font-medium text-gray-900">{item.quantity}</span>
                                                        <button
                                                            onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                                                            className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Plus className="w-4 h-4 text-gray-600" />
                                                        </button>
                                                        <button
                                                            onClick={() => cart.removeItem(item.id)}
                                                            className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Order Note */}
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageSquare className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-700">Sipariş Notu</span>
                                        </div>
                                        <textarea
                                            value={cart.orderNote}
                                            onChange={(e) => cart.setOrderNote(e.target.value)}
                                            placeholder="Kapıda zil çalın, adres tarifi..."
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
                                            rows={2}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        {cart.items.length > 0 && (
                            <div className="border-t border-gray-100 p-4 bg-white space-y-4">
                                {/* Summary */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Ara Toplam</span>
                                        <span>₺{cart.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-gray-900">
                                        <span>Toplam</span>
                                        <span>₺{cart.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Checkout Buttons */}
                                <div className="space-y-2">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleCheckout}
                                        disabled={isSubmitting || cart.items.length === 0}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/25 disabled:opacity-50"
                                    >
                                        <span>Siparişi Tamamla</span>
                                        <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            const message = formatWhatsAppOrder(cart);
                                            const encodedMessage = encodeURIComponent(message);
                                            const whatsappUrl = `https://wa.me/${cart.whatsappNumber}?text=${encodedMessage}`;
                                            window.open(whatsappUrl, "_blank");
                                        }}
                                        disabled={cart.items.length === 0}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-2xl shadow-lg disabled:opacity-50 transition-colors"
                                    >
                                        <span>WhatsApp ile Sipariş Ver</span>
                                        <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

