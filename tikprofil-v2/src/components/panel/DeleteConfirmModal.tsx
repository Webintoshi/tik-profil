"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "@/components/panel/ThemeProvider";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isDeleting?: boolean;
}

export function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    isDeleting = false
}: DeleteConfirmModalProps) {
    const { isDark } = useTheme();

    // Theme styles
    const cardBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const overlayBg = "bg-black/50";

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={clsx("fixed inset-0 backdrop-blur-sm", overlayBg)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={clsx(
                            "relative w-full max-w-sm rounded-2xl p-6 shadow-2xl",
                            cardBg
                        )}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className={clsx(
                                "absolute top-4 right-4 p-2 rounded-lg transition-colors",
                                isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>

                            <h3 className={clsx("text-xl font-bold mb-2", textPrimary)}>
                                {title}
                            </h3>
                            <p className={clsx("text-sm mb-6 leading-relaxed", textSecondary)}>
                                {description}
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    disabled={isDeleting}
                                    className={clsx(
                                        "flex-1 py-3 rounded-xl font-medium transition-colors",
                                        isDark
                                            ? "bg-white/5 hover:bg-white/10 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                    )}
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-5 h-5" />
                                    )}
                                    Sil
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
