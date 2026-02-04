"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { uploadImageWithFallback } from "@/lib/clientUpload";

interface PlaceImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
}

export function PlaceImageUploader({ value, onChange }: PlaceImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 15, 90));
            }, 150);

            const result = await uploadImageWithFallback({
                file,
                moduleName: "cities",
            });

            clearInterval(progressInterval);
            setUploadProgress(100);
            onChange(result.url);

            setTimeout(() => setUploadProgress(0), 800);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Yükleme başarısız");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setError(null);
    };

    return (
        <div className="space-y-2">
            <div
                onClick={() => !value && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative aspect-video w-full rounded-xl overflow-hidden cursor-pointer
                    transition-all duration-300
                    ${isDragging 
                        ? 'border-2 border-[#fe1e50] bg-[#fe1e50]/10' 
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
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-3"
                        >
                            <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center mb-1
                                ${isDragging ? 'bg-[#fe1e50] text-white' : 'bg-white/[0.05] text-white/30'}
                            `}>
                                <Upload className="w-4 h-4" />
                            </div>
                            <p className="text-white/40 text-xs">
                                {isDragging ? "Bırak!" : "Sürükle veya tıkla"}
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
                            <Loader2 className="w-6 h-6 text-[#fe1e50] animate-spin mb-1" />
                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#fe1e50] rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                />
                            </div>
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
                                alt="Place preview"
                                fill
                                className="object-cover"
                            />
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-400 text-center"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
