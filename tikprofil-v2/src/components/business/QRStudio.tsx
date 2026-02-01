"use client";

import { useState, useCallback } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import {
    Download,
    Copy,
    Check,
    ExternalLink,
    Palette,
    Monitor,
    Share2 // Placeholder icon for logo toggle
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { logActivity } from "@/lib/services/auditService";
import { useTheme } from "@/components/panel/ThemeProvider";
import { GlassCard } from "@/components/panel/GlassCard";

// ============================================
// TYPES
// ============================================
interface QRStudioProps {
    businessId: string;
    businessName: string;
    profileUrl: string;
    logoUrl?: string;
}

// ============================================
// COLOR PRESETS
// ============================================
const COLOR_PRESETS = [
    { id: "black", label: "Siyah", fg: "#000000", bg: "#FFFFFF" },
    { id: "white", label: "Beyaz", fg: "#FFFFFF", bg: "#000000" },
    { id: "emerald", label: "Yeşil", fg: "#10B981", bg: "#FFFFFF" },
    { id: "blue", label: "Mavi", fg: "#2B62FF", bg: "#FFFFFF" },
    { id: "purple", label: "Mor", fg: "#8B3DFF", bg: "#FFFFFF" },
    { id: "pink", label: "Pembe", fg: "#FF4D8D", bg: "#FFFFFF" },
];

// ============================================
// MAIN COMPONENT
// ============================================
export function QRStudio({ businessId, businessName, profileUrl, logoUrl }: QRStudioProps) {
    const { isDark } = useTheme();

    // Debug Logo
    useState(() => {
    });
    const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
    const [isDownloadingSVG, setIsDownloadingSVG] = useState(false);
    const [isDownloadingPNG, setIsDownloadingPNG] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showLogo, setShowLogo] = useState(true); // Logo toggle state

    // Fixed Size for Stage
    const qrSize = 280;

    // Theme-aware colors
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-white/60" : "text-gray-600";
    const stageBg = isDark
        ? "bg-neutral-900/50 border-white/5"
        : "bg-gray-100/50 border-gray-200/50";

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

    // Download Helpers
    const handleDownload = useCallback(async (format: 'svg' | 'png') => {
        const isSvg = format === 'svg';
        const setDownloading = isSvg ? setIsDownloadingSVG : setIsDownloadingPNG;
        const selector = isSvg ? "#qr-svg svg" : "#qr-canvas canvas";

        setDownloading(true);
        try {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`${format.toUpperCase()} element not found`);

            let url;
            if (isSvg) {
                const svgData = new XMLSerializer().serializeToString(element);
                const blob = new Blob([svgData], { type: "image/svg+xml" });
                url = URL.createObjectURL(blob);
            } else {
                url = (element as HTMLCanvasElement).toDataURL("image/png");
            }

            const link = document.createElement("a");
            link.href = url;
            link.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-qr.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (isSvg) URL.revokeObjectURL(url);

            // Audit
            logActivity({
                actor_id: businessId,
                actor_name: businessName,
                action_type: "QR_DOWNLOAD",
                metadata: { format, color: selectedColor.id },
            }).catch(console.error);

            toast.success(`${format.toUpperCase()} indirildi!`);
        } catch (error) {
            console.error("Download error:", error);
            toast.error("İndirme başarısız");
        } finally {
            setDownloading(false);
        }
    }, [businessId, businessName, selectedColor.id]);

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
                >
                    <div id="qr-svg">
                        <QRCodeSVG
                            value={profileUrl}
                            size={qrSize}
                            fgColor={selectedColor.fg}
                            bgColor={selectedColor.bg}
                            level="H"
                            includeMargin={false}
                            imageSettings={showLogo ? {
                                src: logoUrl || "/logo.svg",
                                height: 48,
                                width: 48,
                                excavate: true,
                            } : undefined}
                        />
                    </div>
                    {/* Hidden Canvas for PNG */}
                    <div id="qr-canvas" className="hidden">
                        <QRCodeCanvas
                            value={profileUrl}
                            size={qrSize * 4} // Higher resolution for PNG
                            fgColor={selectedColor.fg}
                            bgColor={selectedColor.bg}
                            level="H"
                            includeMargin={true}
                            imageSettings={showLogo ? {
                                src: logoUrl || "/logo.svg",
                                height: 48 * 4,
                                width: 48 * 4,
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
                    <div className="space-y-8 flex-1">

                        {/* 1. Colors */}
                        <div>
                            <label className={clsx("flex items-center gap-2 text-sm font-semibold mb-4", textPrimary)}>
                                <Palette className="h-4 w-4 text-blue-500" />
                                Renk Seçimi
                            </label>
                            <div className="flex flex-wrap gap-4">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setSelectedColor(preset)}
                                        className={clsx(
                                            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                                            selectedColor.id === preset.id
                                                ? "ring-2 ring-offset-2 ring-blue-500 scale-110 border-transparent"
                                                : isDark ? "ring-offset-black border-white/10 hover:border-white/30" : "border-gray-200 hover:border-gray-300"
                                        )}
                                        style={{ backgroundColor: preset.fg }}
                                        title={preset.label}
                                    >
                                        {selectedColor.id === preset.id && (
                                            <Check className="h-5 w-5 text-white mix-blend-difference" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Logo Toggle */}
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
                            {/* Apple-style Switch */}
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

                    </div>

                    {/* Actions (Bottom) */}
                    <div className="mt-auto pt-8 border-t border-dashed border-gray-200 dark:border-white/10">
                        <label className={clsx("block text-sm font-semibold mb-4", textPrimary)}>İndirme Seçenekleri</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleDownload('svg')}
                                disabled={isDownloadingSVG}
                                className="flex-1 h-12 rounded-[16px] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {isDownloadingSVG ? <div className="animate-spin text-xl">◌</div> : <Download className="h-5 w-5" />}
                                SVG İndir
                            </button>
                            <button
                                onClick={() => handleDownload('png')}
                                disabled={isDownloadingPNG}
                                className={clsx(
                                    "flex-1 h-12 rounded-[16px] font-semibold border active:scale-95 transition-all flex items-center justify-center gap-2",
                                    isDark
                                        ? "bg-white/10 border-white/10 text-white hover:bg-white/20"
                                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
                                )}
                            >
                                {isDownloadingPNG ? <div className="animate-spin text-xl">◌</div> : <Download className="h-5 w-5" />}
                                PNG İndir
                            </button>
                        </div>
                    </div>

                </GlassCard>
            </div>
        </div>
    );
}
