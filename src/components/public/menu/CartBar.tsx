"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ChevronRight } from "lucide-react";

interface CartBarProps {
    itemCount: number;
    total: number;
    onOpen: () => void;
}

export function CartBar({ itemCount, total, onOpen }: CartBarProps) {
    return (
        <AnimatePresence>
            {itemCount > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100/50"
                >
                    <div className="max-w-2xl mx-auto">
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onOpen}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-2xl shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35 transition-shadow"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <ShoppingCart className="w-6 h-6" />
                                    <motion.span
                                        key={itemCount}
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-white text-violet-600 text-xs font-bold rounded-full shadow-sm"
                                    >
                                        {itemCount}
                                    </motion.span>
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Sepeti Gör</div>
                                    <div className="text-sm text-white/80">{itemCount} ürün</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">
                                    ₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

