"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, X, Palette, Maximize2, Monitor, Smartphone, Info, Share2, MessageCircle, Mail, Check } from "lucide-react";
import clsx from "clsx";
import type { ColorPreset, SizePreset, ErrorCorrectionLevel } from "@/components/business/QRStudio";

interface MobileQRControlsProps {
    colors: typeof import("@/components/business/QRStudio").COLOR_PRESETS;
    selectedColor: ColorPreset;
    onColorChange: (color: ColorPreset) => void;
    customFgColor: string;
    customBgColor: string;
    onCustomFgChange: (color: string) => void;
    onCustomBgChange: (color: string) => void;
    sizes: typeof import("@/components/business/QRStudio").SIZE_PRESETS;
    selectedSize: SizePreset;
    onSizeChange: (size: SizePreset) => void;
    errorLevels: typeof import("@/components/business/QRStudio").ERROR_LEVELS;
    errorLevel: ErrorCorrectionLevel;
    onErrorLevelChange: (level: ErrorCorrectionLevel) => void;
    showLogo: boolean;
    onLogoToggle: () => void;
    useDeepLink: boolean;
    onDeepLinkToggle: () => void;
    onShare: (platform: 'whatsapp' | 'email' | 'twitter') => void;
    handleDownloadSVG: () => void;
    handleDownloadPNG: () => void;
    handleDownloadPDF: () => void;
    isDownloading: { [key: string]: boolean };
    hasGoodContrast: boolean;
    contrastRatio: number;
    isDark: boolean;
    textPrimary: string;
    textSecondary: string;
}

export function MobileQRControls({
    colors,
    selectedColor,
    onColorChange,
    customFgColor,
    customBgColor,
    onCustomFgChange,
    onCustomBgChange,
    sizes,
    selectedSize,
    onSizeChange,
    errorLevels,
    errorLevel,
    onErrorLevelChange,
    showLogo,
    onLogoToggle,
    useDeepLink,
    onDeepLinkToggle,
    onShare,
    handleDownloadSVG,
    handleDownloadPNG,
    handleDownloadPDF,
    isDownloading,
    hasGoodContrast,
    contrastRatio,
    isDark,
    textPrimary,
    textSecondary,
}: MobileQRControlsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    return (
        <motion.div
            className="fixed bottom-0 left-0 right-0 z-50"
            initial={{ y: "100%" }}
            animate={{ y: isOpen ? 0 : "calc(100% - 60px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
            {/* Handle bar */}
            <div
                className="w-full h-16 flex items-center justify-center bg-white/95 dark:bg-black/95 border-t border-gray-200 dark:border-white/10"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                ) : (
                    <>
                        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-1" />
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Ayarlar</span>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto bg-white dark:bg-black p-4 space-y-4">
                {/* Renk Seçimi - Basit ve Büyük */}
                <div>
                    <label className="text-sm font-semibold mb-3 block text-gray-900 dark:text-white">
                        Renk Seç
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                        {colors.slice(0, 6).map((color) => (
                            <motion.button
                                key={color.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onColorChange(color)}
                                className={clsx(
                                    "w-16 h-16 rounded-2xl border-3 transition-all",
                                    selectedColor.id === color.id
                                        ? "scale-110 ring-4 ring-blue-500 border-transparent"
                                        : "border-gray-200 dark:border-gray-700"
                                )}
                                style={{ backgroundColor: color.id === 'custom' ? '#666' : color.fg }}
                            >
                                {selectedColor.id === color.id && (
                                    <Check className="w-6 h-6 text-white mix-blend-difference mx-auto" />
                                )}
                            </motion.button>
                        ))}

                        {/* Custom renk butonu */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onColorChange(colors.find(c => c.id === 'custom')!)}
                            className={clsx(
                                "w-16 h-16 rounded-2xl border-3 border-dashed flex items-center justify-center transition-all",
                                selectedColor.id === 'custom'
                                    ? "ring-4 ring-blue-500 border-blue-500"
                                    : "border-gray-300 dark:border-gray-600"
                            )}
                        >
                            <span className="text-2xl text-gray-400">+</span>
                        </motion.button>
                    </div>

                    {/* Custom Color Picker */}
                    {selectedColor.id === 'custom' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="mt-4 p-4 rounded-xl border bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium mb-2 block text-gray-600 dark:text-gray-400">
                                        Ön Plan
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={customFgColor}
                                            onChange={(e) => onCustomFgChange(e.target.value)}
                                            className="w-10 h-10 min-h-[44px] rounded-lg border-0 cursor-pointer"
                                        />
                                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                                            {customFgColor}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-2 block text-gray-600 dark:text-gray-400">
                                        Arka Plan
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={customBgColor}
                                            onChange={(e) => onCustomBgChange(e.target.value)}
                                            className="w-10 h-10 min-h-[44px] rounded-lg border-0 cursor-pointer"
                                        />
                                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                                            {customBgColor}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contrast Warning */}
                            <div className={clsx(
                                "mt-3 flex items-center gap-2 text-xs",
                                hasGoodContrast ? "text-green-500" : "text-amber-500"
                            )}>
                                <Info className="w-3.5 h-3.5" />
                                {hasGoodContrast
                                    ? `Kontrast oranı: ${contrastRatio.toFixed(1)}:1 ✓`
                                    : `Düşük kontrast (${contrastRatio.toFixed(1)}:1) - Okunabilirlik için 4.5:1 önerilir`
                                }
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Boyut Seçimi - Segmented Control */}
                <div>
                    <label className="text-sm font-semibold mb-3 block text-gray-900 dark:text-white">
                        Boyut
                    </label>
                    <div className="flex bg-gray-100 dark:bg-white/5 rounded-2xl p-1">
                        {sizes.slice(0, 3).map((size) => (
                            <motion.button
                                key={size.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSizeChange(size)}
                                className={clsx(
                                    "flex-1 py-3 px-3 min-h-[44px] rounded-xl text-xs font-medium transition-all",
                                    selectedSize.id === size.id
                                        ? "bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white"
                                        : "text-gray-600 dark:text-gray-400"
                                )}
                            >
                                {size.label}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* İndirme Butonları - Mobil için daha büyük */}
                <div>
                    <label className="text-sm font-semibold mb-3 block text-gray-900 dark:text-white">
                        İndir
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleDownloadSVG}
                            disabled={isDownloading.svg}
                            className="min-h-[48px] rounded-[14px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                            {isDownloading.svg ? (
                                <div className="animate-spin text-lg">◌</div>
                            ) : (
                                <>
                                    <MessageCircle className="w-4 h-4" />
                                    <span>SVG</span>
                                </>
                            )}
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleDownloadPNG}
                            disabled={isDownloading.png}
                            className="min-h-[48px] rounded-[14px] bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                            {isDownloading.png ? (
                                <div className="animate-spin text-lg">◌</div>
                            ) : (
                                <>
                                    <MessageCircle className="w-4 h-4" />
                                    <span>PNG</span>
                                </>
                            )}
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleDownloadPDF}
                            disabled={isDownloading.pdf}
                            className="min-h-[48px] rounded-[14px] bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                            {isDownloading.pdf ? (
                                <div className="animate-spin text-lg">◌</div>
                            ) : (
                                <>
                                    <MessageCircle className="w-4 h-4" />
                                    <span>PDF</span>
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* Diğer Ayarlar - Accordion */}
                <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveSection(activeSection === 'advanced' ? null : 'advanced')}
                        className="w-full flex items-center justify-between py-2 min-h-[44px]"
                    >
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Diğer Ayarlar</span>
                        <motion.div
                            animate={{ rotate: activeSection === 'advanced' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </motion.div>
                    </motion.button>

                    <AnimatePresence>
                        {activeSection === 'advanced' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-4 pt-4"
                            >
                                {/* Logo Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Monitor className="w-5 h-5 text-purple-500" />
                                        <span className="text-sm text-gray-900 dark:text-white">Logo Göster</span>
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onLogoToggle}
                                        className="w-12 h-7 min-h-[44px] rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        style={{ backgroundColor: showLogo ? '#3B82F6' : isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}
                                    >
                                        <motion.span
                                            animate={{ x: showLogo ? 20 : 0 }}
                                            className="absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm"
                                        />
                                    </motion.button>
                                </div>

                                {/* Mobil Uygulama Linki Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-green-500" />
                                        <span className="text-sm text-gray-900 dark:text-white">Uygulama Linki</span>
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onDeepLinkToggle}
                                        className="w-12 h-7 min-h-[44px] rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        style={{ backgroundColor: useDeepLink ? '#22C55E' : isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}
                                    >
                                        <motion.span
                                            animate={{ x: useDeepLink ? 20 : 0 }}
                                            className="absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm"
                                        />
                                    </motion.button>
                                </div>

                                {/* Dayanıklılık Seviyesi - Basitleştirilmiş */}
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                                        Dayanıklılık
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {errorLevels.map((level) => (
                                            <motion.button
                                                key={level.value}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onErrorLevelChange(level.value)}
                                                className={clsx(
                                                    "min-h-[44px] py-2 rounded-lg text-xs font-medium transition-all border",
                                                    errorLevel === level.value
                                                        ? "bg-blue-500 text-white border-blue-500"
                                                        : isDark
                                                            ? "bg-white/5 border-white/10 text-white/70"
                                                            : "bg-white border-gray-200 text-gray-700"
                                                )}
                                                title={level.description}
                                            >
                                                <div className="font-bold">{level.value}</div>
                                                <div className="text-[10px] opacity-80">{level.correction}</div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Paylaşım Butonları */}
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                                        Paylaş
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => onShare('whatsapp')}
                                            className="min-h-[44px] flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all bg-green-500 hover:bg-green-600 text-white"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span>WA</span>
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => onShare('email')}
                                            className={clsx(
                                                "min-h-[44px] flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all",
                                                isDark
                                                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                                            )}
                                        >
                                            <Mail className="w-4 h-4" />
                                            <span>E-posta</span>
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => onShare('twitter')}
                                            className="min-h-[44px] flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all bg-sky-500 hover:bg-sky-600 text-white"
                                        >
                                            <span className="font-bold">𝕏</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
