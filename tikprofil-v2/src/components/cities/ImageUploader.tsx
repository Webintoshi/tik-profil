"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle } from "lucide-react";
import Image from "next/image";
import { uploadImageWithFallback } from "@/lib/clientUpload";

interface ImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    onKeyChange?: (key: string) => void;
    alt?: string;
    onAltChange?: (alt: string) => void;
    aspectRatio?: "video" | "square" | "portrait";
    label?: string;
    description?: string;
}

export function ImageUploader({
    value,
    onChange,
    onKeyChange,
    alt = "",
    onAltChange,
    aspectRatio = "video",
    label = "Kapak Görseli",
    description = "Drag & drop veya tıklayarak yükle",
}: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const aspectClasses = {
        video: "aspect-video",
        square: "aspect-square",
        portrait: "aspect-[3/4]",
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await uploadFile(files[0]);
        }
    }, []);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await uploadFile(files[0]);
        }
    }, []);

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            // Simulate progress since we don't have real progress from fetch
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const result = await uploadImageWithFallback({
                file,
                moduleName: "cities",
            });

            clearInterval(progressInterval);
            setUploadProgress(100);
            
            onChange(result.url);
            if (onKeyChange && result.key) {
                onKeyChange(result.key);
            }

            // Reset progress after a delay
            setTimeout(() => setUploadProgress(0), 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Yükleme başarısız");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClear = () => {
        onChange("");
        if (onKeyChange) onKeyChange("");
        setError(null);
    };

    return (
        <div className="space-y-3">
            {/* Label */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#fe1e50]/10 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-[#fe1e50]" />
                </div>
                <div>
                    <h4 className="font-semibold text-white">{label}</h4>
                    <p className="text-xs text-white/40">{description}</p>
                </div>
            </div>

            {/* Upload Area */}
            <div
                onClick={() => !value && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative ${aspectClasses[aspectRatio]} w-full rounded-2xl overflow-hidden cursor-pointer
                    transition-all duration-300
                    ${isDragging 
                        ? 'border-2 border-[#fe1e50] bg-[#fe1e50]/10 scale-[1.02]' 
                        : 'border-2 border-dashed border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.05]'
                    }
                    ${value ? 'border-solid border-white/[0.1]' : ''}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <AnimatePresence mode="wait">
                    {/* Empty State */}
                    {!value && !isUploading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
                        >
                            <div className={`
                                w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                                transition-colors duration-300
                                ${isDragging ? 'bg-[#fe1e50] text-white' : 'bg-white/[0.05] text-white/30'}
                            `}>
                                <Upload className="w-8 h-8" />
                            </div>
                            <p className="text-white/60 font-medium">
                                {isDragging ? "Bırakın!" : "Görsel sürükleyin veya tıklayın"}
                            </p>
                            <p className="text-xs text-white/30 mt-2">
                                JPG, PNG, WebP • Max 10MB
                            </p>
                        </motion.div>
                    )}

                    {/* Uploading State */}
                    {isUploading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm"
                        >
                            <Loader2 className="w-10 h-10 text-[#fe1e50] animate-spin mb-4" />
                            <p className="text-white/60 text-sm">Yükleniyor...</p>
                            
                            {/* Progress Bar */}
                            <div className="w-48 h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-[#fe1e50] to-[#ff6b35] rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <p className="text-xs text-white/40 mt-2">%{uploadProgress}</p>
                        </motion.div>
                    )}

                    {/* Preview State */}
                    {value && !isUploading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 group"
                        >
                            <Image
                                src={value}
                                alt={alt || "Uploaded image"}
                                fill
                                className="object-cover"
                            />
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-colors"
                                    title="Değiştir"
                                >
                                    <Upload className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClear();
                                    }}
                                    className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl backdrop-blur-sm transition-colors"
                                    title="Kaldır"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Success Badge */}
                            <div className="absolute top-3 right-3 p-2 bg-emerald-500/90 text-white rounded-lg backdrop-blur-sm">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Alt Text Input */}
            {value && onAltChange && (
                <input
                    type="text"
                    value={alt}
                    onChange={(e) => onAltChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all"
                    placeholder="Görsel açıklaması (SEO için)"
                />
            )}

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                    >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* URL Display (for debugging/admin) */}
            {value && (
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                    <p className="text-xs text-white/30 mb-1">URL</p>
                    <p className="text-xs text-white/50 font-mono truncate">{value}</p>
                </div>
            )}
        </div>
    );
}

// AlertCircle icon component for error display
function AlertCircle({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
