"use client";

import { useState, useCallback, useMemo } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import {
    Download,
    Copy,
    Check,
    ExternalLink,
    Palette,
    Monitor,
    Share2,
    Maximize2,
    Info,
    Smartphone,
    Mail,
    MessageCircle,
    FileText,
    Image,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { logActivity } from "@/lib/services/auditService";
import { useTheme } from "@/components/panel/ThemeProvider";
import { GlassCard } from "@/components/panel/GlassCard";
import jsPDF from "jspdf";

// ============================================
// TYPES
// ============================================
interface QRStudioProps {
    businessId: string;
    businessName: string;
    profileUrl: string;
    logoUrl?: string;
    businessSlug?: string;
}

interface ColorPreset {
    id: string;
    label: string;
    fg: string;
    bg: string;
    isCustom?: boolean;
}

interface SizePreset {
    id: string;
    label: string;
    size: number;
    dpi: number;
    description: string;
}

// ============================================
// CONSTANTS
// ============================================
const COLOR_PRESETS: ColorPreset[] = [
    { id: "black", label: "Siyah", fg: "#000000", bg: "#FFFFFF" },
    { id: "white", label: "Beyaz", fg: "#FFFFFF", bg: "#000000" },
    { id: "emerald", label: "Yeşil", fg: "#10B981", bg: "#FFFFFF" },
    { id: "blue", label: "Mavi", fg: "#2B62FF", bg: "#FFFFFF" },
    { id: "purple", label: "Mor", fg: "#8B3DFF", bg: "#FFFFFF" },
    { id: "pink", label: "Pembe", fg: "#FF4D8D", bg: "#FFFFFF" },
    { id: "custom", label: "Özel", fg: "#000000", bg: "#FFFFFF", isCustom: true },
];

const SIZE_PRESETS: SizePreset[] = [
    { id: "small", label: "Küçük", size: 128, dpi: 72, description: "Kartvizit için" },
    { id: "medium", label: "Orta", size: 280, dpi: 72, description: "Web için" },
    { id: "large", label: "Büyük", size: 512, dpi: 150, description: "Poster için" },
    { id: "xl", label: "XL", size: 1024, dpi: 300, description: "Afiş için" },
    { id: "print-5cm", label: "5cm Baskı", size: 189, dpi: 300, description: "Kartvizit baskı" },
    { id: "print-10cm", label: "10cm Baskı", size: 378, dpi: 300, description: "Standart baskı" },
    { id: "print-15cm", label: "15cm Baskı", size: 567, dpi: 300, description: "Büyük baskı" },
];

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

const ERROR_LEVELS: { value: ErrorCorrectionLevel; label: string; description: string; correction: string }[] = [
    { value: 'L', label: 'Low', description: 'Minimum koruma', correction: '%7' },
    { value: 'M', label: 'Medium', description: 'Orta koruma', correction: '%15' },
    { value: 'Q', label: 'Quartile', description: 'Yüksek koruma', correction: '%25' },
    { value: 'H', label: 'High', description: 'Maksimum koruma (Önerilen)', correction: '%30' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Calculate contrast ratio between two colors
function getContrastRatio(color1: string, color2: string): number {
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    };

    const luminance = (r: number, g: number, b: number) => {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
}

// ============================================
// MAIN COMPONENT
// ============================================
export function QRStudio({ businessId, businessName, profileUrl, logoUrl, businessSlug }: QRStudioProps) {
    const { isDark } = useTheme();

    // State
    const [selectedColor, setSelectedColor] = useState<ColorPreset>(COLOR_PRESETS[0]);
    const [customFgColor, setCustomFgColor] = useState("#000000");
    const [customBgColor, setCustomBgColor] = useState("#FFFFFF");
    const [selectedSize, setSelectedSize] = useState<SizePreset>(SIZE_PRESETS[1]); // Default: Medium
    const [errorLevel, setErrorLevel] = useState<ErrorCorrectionLevel>('H');
    const [showLogo, setShowLogo] = useState(true);
    const [useDeepLink, setUseDeepLink] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});

    // Theme-aware colors
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-white/60" : "text-gray-600";
    const stageBg = isDark
        ? "bg-neutral-900/50 border-white/5"
        : "bg-gray-100/50 border-gray-200/50";

    // Get effective colors (handle custom colors)
    const effectiveColors = useMemo(() => {
        if (selectedColor.id === 'custom') {
            return { fg: customFgColor, bg: customBgColor };
        }
        return { fg: selectedColor.fg, bg: selectedColor.bg };
    }, [selectedColor, customFgColor, customBgColor]);

    // Calculate contrast ratio
    const contrastRatio = useMemo(() => {
        return getContrastRatio(effectiveColors.fg, effectiveColors.bg);
    }, [effectiveColors]);

    const hasGoodContrast = contrastRatio >= 4.5;

    // Get QR value (with deep link support)
    const getQRValue = useCallback(() => {
        if (useDeepLink && businessSlug) {
            return `tikprofil://business/${businessSlug}?fallback=${encodeURIComponent(profileUrl)}`;
        }
        return profileUrl;
    }, [useDeepLink, businessSlug, profileUrl]);

    // Copy URL
    const handleCopyUrl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            setCopied(true);
            toast.success("Link kopyalandı!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Kopyalama başarısız");
        }
    }, [profileUrl]);

    // Download SVG
    const handleDownloadSVG = useCallback(async () => {
        setIsDownloading(prev => ({ ...prev, svg: true }));
        try {
            const element = document.querySelector("#qr-svg svg");
            if (!element) throw new Error("SVG element not found");

            const svgData = new XMLSerializer().serializeToString(element);
            const blob = new Blob([svgData], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-qr.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            await logActivity({
                actor_id: businessId,
                actor_name: businessName,
                action_type: "QR_DOWNLOAD",
                metadata: { format: 'svg', color: selectedColor.id, size: selectedSize.id, errorLevel },
            });

            toast.success("SVG indirildi!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("İndirme başarısız");
        } finally {
            setIsDownloading(prev => ({ ...prev, svg: false }));
        }
    }, [businessId, businessName, selectedColor.id, selectedSize.id, errorLevel]);

    // Download PNG
    const handleDownloadPNG = useCallback(async () => {
        setIsDownloading(prev => ({ ...prev, png: true }));
        try {
            const element = document.querySelector("#qr-canvas canvas") as HTMLCanvasElement;
            if (!element) throw new Error("Canvas element not found");

            const url = element.toDataURL("image/png");

            const link = document.createElement("a");
            link.href = url;
            link.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-qr-${selectedSize.size}px.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            await logActivity({
                actor_id: businessId,
                actor_name: businessName,
                action_type: "QR_DOWNLOAD",
                metadata: { format: 'png', color: selectedColor.id, size: selectedSize.id, errorLevel },
            });

            toast.success("PNG indirildi!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("İndirme başarısız");
        } finally {
            setIsDownloading(prev => ({ ...prev, png: false }));
        }
    }, [businessId, businessName, selectedColor.id, selectedSize.id, errorLevel]);

    // Download PDF
    const handleDownloadPDF = useCallback(async () => {
        setIsDownloading(prev => ({ ...prev, pdf: true }));
        try {
            const canvas = document.querySelector("#qr-canvas canvas") as HTMLCanvasElement;
            if (!canvas) throw new Error("Canvas element not found");

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Add crop marks
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.2);
            const cropMarkSize = 5;
            const bleed = 3; // 3mm bleed
            const qrSize = 100; // mm
            const x = (pageWidth - qrSize) / 2;
            const y = (pageHeight - qrSize) / 2;

            // Top-left crop marks
            pdf.line(x - bleed - cropMarkSize, y - bleed, x - bleed, y - bleed);
            pdf.line(x - bleed, y - bleed - cropMarkSize, x - bleed, y - bleed);

            // Top-right crop marks
            pdf.line(x + qrSize + bleed + cropMarkSize, y - bleed, x + qrSize + bleed, y - bleed);
            pdf.line(x + qrSize + bleed, y - bleed - cropMarkSize, x + qrSize + bleed, y - bleed);

            // Bottom-left crop marks
            pdf.line(x - bleed - cropMarkSize, y + qrSize + bleed, x - bleed, y + qrSize + bleed);
            pdf.line(x - bleed, y + qrSize + bleed + cropMarkSize, x - bleed, y + qrSize + bleed);

            // Bottom-right crop marks
            pdf.line(x + qrSize + bleed + cropMarkSize, y + qrSize + bleed, x + qrSize + bleed, y + qrSize + bleed);
            pdf.line(x + qrSize + bleed, y + qrSize + bleed + cropMarkSize, x + qrSize + bleed, y + qrSize + bleed);

            // Add QR image
            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize);

            // Add guide text
            pdf.setFontSize(10);
            pdf.setTextColor(100);
            pdf.text(`Profil: ${businessName}`, pageWidth / 2, 20, { align: 'center' });
            pdf.text(`Boyut: ${selectedSize.label} (${selectedSize.size}px @ ${selectedSize.dpi} DPI)`, pageWidth / 2, 28, { align: 'center' });
            
            pdf.setFontSize(8);
            pdf.text('Baskı Talimatları: Kesim çizgilerinden kırpın, kaliteli kağıt kullanın', pageWidth / 2, pageHeight - 15, { align: 'center' });
            pdf.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

            pdf.save(`${businessName.replace(/\s+/g, "-").toLowerCase()}-qr-print-ready.pdf`);

            await logActivity({
                actor_id: businessId,
                actor_name: businessName,
                action_type: "QR_DOWNLOAD",
                metadata: { format: 'pdf', color: selectedColor.id, size: selectedSize.id, errorLevel },
            });

            toast.success("PDF indirildi!");
        } catch (error) {
            console.error("PDF error:", error);
            toast.error("PDF oluşturma başarısız");
        } finally {
            setIsDownloading(prev => ({ ...prev, pdf: false }));
        }
    }, [businessId, businessName, selectedColor.id, selectedSize, errorLevel]);

    // Share functions
    const handleShare = useCallback((platform: 'whatsapp' | 'email' | 'twitter') => {
        const url = profileUrl;
        const text = `${businessName} profilimi ziyaret edin:`;

        switch (platform) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                break;
            case 'email':
                window.open(`mailto:?subject=${encodeURIComponent(businessName)}&body=${encodeURIComponent(text + '\n\n' + url)}`, '_blank');
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                break;
        }

        toast.success(`${platform === 'twitter' ? 'Twitter' : platform === 'whatsapp' ? 'WhatsApp' : 'E-posta'}'a paylaşıldı`);
    }, [businessName, profileUrl]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-full">
            {/* LEFT COLUMN: THE STAGE (Span 7) */}
            <div className={clsx(
                "lg:col-span-7 rounded-[24px] border relative flex flex-col items-center justify-center p-6 lg:p-8 overflow-hidden min-h-[400px] lg:min-h-0",
                stageBg
            )}>
                {/* Dot Pattern Background */}
                <div className={clsx(
                    "absolute inset-0 opacity-40 pointer-events-none",
                    isDark
                        ? "bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:20px_20px]"
                        : "bg-[radial-gradient(#0000001a_1px,transparent_1px)] [background-size:20px_20px]"
                )} />

                {/* QR Card */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="relative bg-white p-8 rounded-3xl shadow-2xl shadow-black/10 z-10"
                    style={{ 
                        boxShadow: `0 25px 50px -12px ${effectiveColors.fg}20`,
                        backgroundColor: effectiveColors.bg
                    }}
                >
                    <div id="qr-svg">
                        <QRCodeSVG
                            value={getQRValue()}
                            size={280}
                            fgColor={effectiveColors.fg}
                            bgColor={effectiveColors.bg}
                            level={errorLevel}
                            includeMargin={false}
                            imageSettings={showLogo ? {
                                src: logoUrl || "/logo.svg",
                                height: 48,
                                width: 48,
                                excavate: true,
                            } : undefined}
                        />
                    </div>
                    {/* Hidden Canvas for PNG/PDF */}
                    <div id="qr-canvas" className="hidden">
                        <QRCodeCanvas
                            value={getQRValue()}
                            size={selectedSize.size}
                            fgColor={effectiveColors.fg}
                            bgColor={effectiveColors.bg}
                            level={errorLevel}
                            includeMargin={true}
                            imageSettings={showLogo ? {
                                src: logoUrl || "/logo.svg",
                                height: Math.floor(selectedSize.size * 0.15),
                                width: Math.floor(selectedSize.size * 0.15),
                                excavate: true,
                            } : undefined}
                        />
                    </div>
                </motion.div>

                {/* URL Pill */}
                <div className="mt-8 z-10 w-full max-w-sm">
                    <div className={clsx(
                        "flex items-center gap-3 px-4 py-3 rounded-full border shadow-sm backdrop-blur-md transition-all",
                        isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700"
                    )}>
                        <div className="bg-blue-500/10 p-1.5 rounded-full">
                            <ExternalLink className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="flex-1 text-sm font-medium truncate opacity-90">
                            {profileUrl.replace('https://', '')}
                        </span>
                        <button
                            onClick={handleCopyUrl}
                            className={clsx(
                                "p-2 rounded-full transition-colors",
                                isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                            )}
                        >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: CONTROLS (Span 5) */}
            <div className="lg:col-span-5 lg:h-full flex flex-col">
                <GlassCard isDark={isDark} className="lg:h-full p-6 lg:p-8 flex flex-col justify-between rounded-[24px]">

                    {/* Panel Header */}
                    <div className="mb-8">
                        <h2 className={clsx("text-xl font-bold mb-2", textPrimary)}>QR Tasarımı</h2>
                        <p className={clsx("text-sm", textSecondary)}>QR kodunuzu marka kimliğinize göre özelleştirin.</p>
                    </div>

                    {/* Tools */}
                    <div className="space-y-6 flex-1 overflow-y-auto">

                        {/* 1. Colors */}
                        <div>
                            <label className={clsx("flex items-center gap-2 text-sm font-semibold mb-4", textPrimary)}>
                                <Palette className="h-4 w-4 text-blue-500" />
                                Renk Seçimi
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setSelectedColor(preset)}
                                        className={clsx(
                                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                                            selectedColor.id === preset.id
                                                ? "ring-2 ring-offset-2 ring-blue-500 scale-110 border-transparent"
                                                : isDark ? "ring-offset-black border-white/10 hover:border-white/30" : "border-gray-200 hover:border-gray-300"
                                        )}
                                        style={{ backgroundColor: preset.id === 'custom' ? '#666' : preset.fg }}
                                        title={preset.label}
                                    >
                                        {preset.id === 'custom' ? (
                                            <span className="text-white text-xs">+</span>
                                        ) : selectedColor.id === preset.id && (
                                            <Check className="h-4 w-4 text-white mix-blend-difference" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Custom Color Picker */}
                            {selectedColor.id === 'custom' && (
                                <div className={clsx("mt-4 p-4 rounded-xl border", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={clsx("text-xs font-medium mb-2 block", textSecondary)}>Ön Plan</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={customFgColor}
                                                    onChange={(e) => setCustomFgColor(e.target.value)}
                                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                />
                                                <span className={clsx("text-sm font-mono", textPrimary)}>{customFgColor}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={clsx("text-xs font-medium mb-2 block", textSecondary)}>Arka Plan</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={customBgColor}
                                                    onChange={(e) => setCustomBgColor(e.target.value)}
                                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                />
                                                <span className={clsx("text-sm font-mono", textPrimary)}>{customBgColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Contrast Warning */}
                                    <div className={clsx("mt-3 flex items-center gap-2 text-xs", 
                                        hasGoodContrast ? "text-green-500" : "text-amber-500"
                                    )}>
                                        <Info className="w-3.5 h-3.5" />
                                        {hasGoodContrast 
                                            ? `Kontrast oranı: ${contrastRatio.toFixed(1)}:1 ✓` 
                                            : `Düşük kontrast (${contrastRatio.toFixed(1)}:1) - Okunabilirlik için 4.5:1 önerilir`
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Size Selector */}
                        <div>
                            <label className={clsx("flex items-center gap-2 text-sm font-semibold mb-3", textPrimary)}>
                                <Maximize2 className="h-4 w-4 text-purple-500" />
                                Boyut
                            </label>
                            <select
                                value={selectedSize.id}
                                onChange={(e) => {
                                    const preset = SIZE_PRESETS.find(s => s.id === e.target.value);
                                    if (preset) setSelectedSize(preset);
                                }}
                                className={clsx(
                                    "w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500",
                                    isDark 
                                        ? "bg-white/5 border-white/10 text-white" 
                                        : "bg-white border-gray-200 text-gray-900"
                                )}
                            >
                                {SIZE_PRESETS.map((preset) => (
                                    <option key={preset.id} value={preset.id}>
                                        {preset.label} - {preset.description}
                                    </option>
                                ))}
                            </select>
                            <div className={clsx("mt-2 flex items-center gap-4 text-xs", textSecondary)}>
                                <span>{selectedSize.size}×{selectedSize.size}px</span>
                                <span>{selectedSize.dpi} DPI</span>
                            </div>
                        </div>

                        {/* 3. Error Correction Level */}
                        <div>
                            <label className={clsx("flex items-center gap-2 text-sm font-semibold mb-3", textPrimary)}>
                                <Info className="h-4 w-4 text-amber-500" />
                                Error Correction
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {ERROR_LEVELS.map((level) => (
                                    <button
                                        key={level.value}
                                        onClick={() => setErrorLevel(level.value)}
                                        className={clsx(
                                            "px-2 py-2 rounded-lg text-xs font-medium transition-all border",
                                            errorLevel === level.value
                                                ? "bg-blue-500 text-white border-blue-500"
                                                : isDark 
                                                    ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10" 
                                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                        )}
                                        title={level.description}
                                    >
                                        <div className="font-bold">{level.value}</div>
                                        <div className="text-[10px] opacity-80">{level.correction}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Logo Toggle */}
                        <div className={clsx("p-4 rounded-[18px] border flex items-center justify-between", isDark ? "bg-white/5 border-white/5" : "bg-gray-50/50 border-gray-100")}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                                    <Monitor className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className={clsx("font-medium text-sm", textPrimary)}>Logo Göster</h4>
                                    <p className={clsx("text-xs", textSecondary)}>QR kodun ortasına logo ekle</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLogo(!showLogo)}
                                className={clsx(
                                    "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                                    showLogo ? "bg-blue-500" : (isDark ? "bg-white/20" : "bg-gray-200")
                                )}
                            >
                                <span className={clsx(
                                    "absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm",
                                    showLogo ? "translate-x-5" : "translate-x-0"
                                )} />
                            </button>
                        </div>

                        {/* 5. Deep Link Toggle */}
                        <div className={clsx("p-4 rounded-[18px] border flex items-center justify-between", isDark ? "bg-white/5 border-white/5" : "bg-gray-50/50 border-gray-100")}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className={clsx("font-medium text-sm", textPrimary)}>Mobil Uygulama Linki</h4>
                                    <p className={clsx("text-xs", textSecondary)}>Mobil uygulama açılsın</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setUseDeepLink(!useDeepLink)}
                                className={clsx(
                                    "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",
                                    useDeepLink ? "bg-green-500" : (isDark ? "bg-white/20" : "bg-gray-200")
                                )}
                            >
                                <span className={clsx(
                                    "absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm",
                                    useDeepLink ? "translate-x-5" : "translate-x-0"
                                )} />
                            </button>
                        </div>

                        {/* 6. Social Share */}
                        <div>
                            <label className={clsx("flex items-center gap-2 text-sm font-semibold mb-3", textPrimary)}>
                                <Share2 className="h-4 w-4 text-pink-500" />
                                Paylaş
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleShare('whatsapp')}
                                    className={clsx(
                                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        "bg-green-500 hover:bg-green-600 text-white"
                                    )}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                </button>
                                <button
                                    onClick={() => handleShare('email')}
                                    className={clsx(
                                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        isDark 
                                            ? "bg-white/10 hover:bg-white/20 text-white border border-white/10" 
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                                    )}
                                >
                                    <Mail className="w-4 h-4" />
                                    E-posta
                                </button>
                                <button
                                    onClick={() => handleShare('twitter')}
                                    className={clsx(
                                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        "bg-sky-500 hover:bg-sky-600 text-white"
                                    )}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    X
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Actions (Bottom) */}
                    <div className="mt-auto pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                        <label className={clsx("block text-sm font-semibold mb-4", textPrimary)}>İndirme Seçenekleri</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={handleDownloadSVG}
                                disabled={isDownloading.svg}
                                className="h-11 rounded-[14px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {isDownloading.svg ? (
                                    <div className="animate-spin text-lg">◌</div>
                                ) : (
                                    <Image className="h-4 w-4" />
                                )}
                                SVG
                            </button>
                            <button
                                onClick={handleDownloadPNG}
                                disabled={isDownloading.png}
                                className={clsx(
                                    "h-11 rounded-[14px] font-semibold border active:scale-95 transition-all flex items-center justify-center gap-2 text-sm",
                                    isDark
                                        ? "bg-white/10 border-white/10 text-white hover:bg-white/20"
                                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
                                )}
                            >
                                {isDownloading.png ? (
                                    <div className="animate-spin text-lg">◌</div>
                                ) : (
                                    <Image className="h-4 w-4" />
                                )}
                                PNG
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isDownloading.pdf}
                                className="h-11 rounded-[14px] bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {isDownloading.pdf ? (
                                    <div className="animate-spin text-lg">◌</div>
                                ) : (
                                    <FileText className="h-4 w-4" />
                                )}
                                PDF
                            </button>
                        </div>
                    </div>

                </GlassCard>
            </div>
        </div>
    );
}
