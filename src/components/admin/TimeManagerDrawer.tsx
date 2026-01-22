"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Calendar, ChevronRight, Sparkles } from "lucide-react";
import {
    getSubscriptionInfo,
    calculateNewEndDate,
    extendSubscription,
    formatDateTR,
    EXTENSION_PRESETS,
    ExtensionType
} from "@/lib/services/subscriptionService";
import { toast } from "sonner";

interface TimeManagerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    business: {
        id: string;
        name: string;
        subscriptionEndDate?: Date | null;
        subscriptionStatus: string;
    };
    onUpdate?: () => void;
}

export function TimeManagerDrawer({ isOpen, onClose, business, onUpdate }: TimeManagerDrawerProps) {
    const [selectedExtension, setSelectedExtension] = useState<ExtensionType | null>(null);
    const [customDate, setCustomDate] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [hoveredPreset, setHoveredPreset] = useState<number | null>(null);

    // Calculate current subscription info
    const subscriptionInfo = useMemo(() => {
        return getSubscriptionInfo(business.subscriptionEndDate, business.subscriptionStatus);
    }, [business.subscriptionEndDate, business.subscriptionStatus]);

    // Calculate preview for hovered preset
    const previewDate = useMemo(() => {
        if (hoveredPreset !== null) {
            const preset = EXTENSION_PRESETS[hoveredPreset];
            return calculateNewEndDate(business.subscriptionEndDate, preset.extension);
        }
        if (selectedExtension) {
            return calculateNewEndDate(business.subscriptionEndDate, selectedExtension);
        }
        return null;
    }, [hoveredPreset, selectedExtension, business.subscriptionEndDate]);

    // Handle preset selection
    const handlePresetClick = (extension: ExtensionType) => {
        setSelectedExtension(extension);
        setCustomDate("");
    };

    // Handle custom date change
    const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        setCustomDate(dateValue);
        if (dateValue) {
            setSelectedExtension({ type: "custom", date: new Date(dateValue) });
        } else {
            setSelectedExtension(null);
        }
    };

    // Handle confirm
    const handleConfirm = async () => {
        if (!selectedExtension) {
            toast.error("Lütfen bir süre seçin");
            return;
        }

        setIsLoading(true);
        try {
            const result = await extendSubscription(
                business.id,
                business.name,
                selectedExtension,
                "Admin" // TODO: Get actual admin name
            );

            if (result.success) {
                toast.success(`Süre güncellendi: ${formatDateTR(result.newEndDate)}`);
                onUpdate?.();
                onClose();
            } else {
                toast.error(result.error || "Bir hata oluştu");
            }
        } catch (error) {
            toast.error("Süre güncellenirken hata oluştu");
        } finally {
            setIsLoading(false);
        }
    };

    // Status badge color
    const statusColors = {
        green: "bg-emerald-100 text-emerald-700 border-emerald-200",
        orange: "bg-amber-100 text-amber-700 border-amber-200",
        red: "bg-red-100 text-red-700 border-red-200",
        gray: "bg-gray-100 text-gray-600 border-gray-200"
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Süre Yöneticisi</h2>
                                    <p className="text-sm text-gray-500">{business.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Current Status */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-gray-500">Mevcut Durum</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[subscriptionInfo.statusColor]}`}>
                                        {subscriptionInfo.statusLabel}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium">Bitiş Tarihi:</span>
                                    <span className="font-bold">{formatDateTR(subscriptionInfo.endDate)}</span>
                                </div>
                            </div>

                            {/* Quick Presets */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                    Hızlı Ekleme
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {EXTENSION_PRESETS.map((preset, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handlePresetClick(preset.extension)}
                                            onMouseEnter={() => setHoveredPreset(index)}
                                            onMouseLeave={() => setHoveredPreset(null)}
                                            className={`
                                                relative p-4 rounded-xl border-2 transition-all text-left
                                                ${selectedExtension?.type === preset.extension.type &&
                                                    (selectedExtension.type === "custom" ||
                                                        (selectedExtension as any).amount === (preset.extension as any).amount)
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                                    : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                }
                                            `}
                                        >
                                            <div className="font-bold text-gray-900 dark:text-white">{preset.label}</div>
                                            <div className="text-xs text-gray-500">{preset.subtitle}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Date */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                    Özel Tarih
                                </h3>
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={handleCustomDateChange}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                />
                            </div>

                            {/* Live Preview */}
                            {(previewDate || selectedExtension) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Önizleme</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                                        <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Eski</div>
                                            <div className="font-medium text-sm">
                                                {formatDateTR(subscriptionInfo.endDate) || "Yok"}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-emerald-500" />
                                        <div className="text-center">
                                            <div className="text-xs text-emerald-600 mb-1">Yeni</div>
                                            <div className="font-bold text-emerald-700 dark:text-emerald-400">
                                                {previewDate ? formatDateTR(previewDate) : "—"}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Confirm Button */}
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedExtension || isLoading}
                                className={`
                                    w-full py-4 rounded-xl font-semibold text-white transition-all
                                    ${selectedExtension && !isLoading
                                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25"
                                        : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                                    }
                                `}
                            >
                                {isLoading ? "Güncelleniyor..." : "Süreyi Güncelle"}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
