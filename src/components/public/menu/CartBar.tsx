"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ChevronRight, Plus, Sparkles } from "lucide-react";

interface CartBarProps {
    itemCount: number;
    total: number;
    onOpen: () => void;
    theme?: "modern" | "classic";
    onBrowseMenu?: () => void;
}

export function CartBar({ itemCount, total, onOpen, theme = "modern", onBrowseMenu }: CartBarProps) {
    const isDark = theme === "modern";

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 z-50 p-4 backdrop-blur-xl border-t ${isDark
                    ? "bg-[#0d0d0d]/90 border-white/5"
                    : "bg-white/90 border-gray-100"
                }`}
        >
            <div className="max-w-2xl mx-auto space-y-2">
                {itemCount > 0 ? (
                    <motion.button
                        key="cart"
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={onOpen}
                        className={`w-full flex items-center justify-between p-4 text-white rounded-2xl shadow-2xl transition-all duration-300 ${isDark
                                ? "bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                                : "bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingCart className="w-6 h-6" />
                                <motion.span
                                    key={itemCount}
                                    initial={{ scale: 0.5 }}
                                    animate={{ scale: 1 }}
                                    className={`absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${isDark ? "text-blue-600" : "text-orange-500"
                                        }`}
                                >
                                    {itemCount}
                                </motion.span>
                            </div>
                            <div className="text-left">
                                <div className="font-bold">Siparişi Tamamla</div>
                                <div className="text-xs text-white/80 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {itemCount} ürün seçtiniz
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                                ₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </span>
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </motion.button>
                ) : (
                    <motion.button
                        key="browse"
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={onBrowseMenu}
                        className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl shadow-lg transition-all duration-300 ${isDark
                                ? "bg-gradient-to-r from-[#1c1c1e] to-[#0d0d0d] border border-white/5 hover:border-white/10 hover:-translate-y-0.5"
                                : "bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:border-gray-300 hover:-translate-y-0.5"
                            }`}
                    >
                        <Plus className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-orange-500"}`} />
                        <span className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            Menüye Göz At
                        </span>
                    </motion.button>
                )}

                {/* Progress Bar */}
                {itemCount > 0 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 0.3 }}
                        className={`h-1 rounded-full ${isDark ? "bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2]" : "bg-gradient-to-r from-orange-500 to-red-500"}`}
                    />
                )}
            </div>
        </motion.div>
    );
}

