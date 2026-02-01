"use client";

import { useState, useRef, useCallback } from "react";
import { motion, Reorder, useDragControls } from "framer-motion";
import {
    Upload,
    X,
    Star,
    GripVertical,
    Loader2,
    Image as ImageIcon,
    Plus
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { uploadImageWithFallback } from "@/lib/clientUpload";
import { getUploadLimit, type UploadModule } from "@/lib/uploadConfig";

export interface GalleryImage {
    id: string;
    url: string;
    order: number;
    isMain: boolean;
    preview?: string;
}

interface ImageGalleryUploaderProps {
    images: GalleryImage[];
    onChange: (images: GalleryImage[]) => void;
    maxImages?: number;
    isDark?: boolean;
    uploadEndpoint?: string;
    uploadModule?: UploadModule;
}

export function ImageGalleryUploader({
    images,
    onChange,
    maxImages = 10,
    isDark = false,
    uploadEndpoint = "/api/emlak/upload",
    uploadModule = "emlak"
}: ImageGalleryUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const maxFileSize = getUploadLimit(uploadModule);

    // Generate unique ID
    const generateId = () => Math.random().toString(36).substring(2, 9);

    // Handle file upload
    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const remaining = maxImages - images.length;
        if (remaining <= 0) {
            toast.error(`Maksimum ${maxImages} fotoğraf yükleyebilirsiniz`);
            return;
        }

        const filesToUpload = Array.from(files).slice(0, remaining);
        setUploading(true);

        for (const file of filesToUpload) {
            if (!file.type.startsWith("image/")) {
                toast.error("Sadece resim dosyaları yüklenebilir");
                continue;
            }

            if (maxFileSize > 0 && file.size > maxFileSize) {
                toast.error("Dosya boyutu 5MB'dan küçük olmalı");
                continue;
            }

            try {
                // Create preview
                const preview = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(file);
                });

                const { url: uploadedUrl } = await uploadImageWithFallback({
                    file,
                    moduleName: uploadModule,
                    fallbackEndpoint: uploadEndpoint,
                });

                if (uploadedUrl) {
                    const newImage: GalleryImage = {
                        id: generateId(),
                        url: uploadedUrl,
                        order: images.length,
                        isMain: images.length === 0,
                        preview,
                    };

                    onChange([...images, newImage]);
                    toast.success("Fotoğraf yüklendi");
                } else {
                    toast.error("Yükleme başarısız");
                }
            } catch {
                toast.error("Yükleme hatası");
            }
        }

        setUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [images, maxFileSize, maxImages, onChange, uploadEndpoint, uploadModule]);

    // Handle drag events
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    // Handle reorder
    const handleReorder = (newOrder: GalleryImage[]) => {
        const reorderedImages = newOrder.map((img, index) => ({
            ...img,
            order: index,
        }));
        onChange(reorderedImages);
    };

    // Set main image
    const setMainImage = (id: string) => {
        const updated = images.map(img => ({
            ...img,
            isMain: img.id === id,
        }));
        onChange(updated);
    };

    // Remove image
    const removeImage = (id: string) => {
        const filtered = images.filter(img => img.id !== id);
        // If removed main image, set first as main
        if (filtered.length > 0 && !filtered.some(img => img.isMain)) {
            filtered[0].isMain = true;
        }
        const reordered = filtered.map((img, index) => ({ ...img, order: index }));
        onChange(reordered);
    };

    return (
        <div className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={clsx(
                    "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                    dragActive
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : isDark
                            ? "border-gray-700 hover:border-gray-600"
                            : "border-gray-300 hover:border-gray-400"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                />

                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                        <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                            Yükleniyor...
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className={clsx(
                            "w-16 h-16 rounded-full flex items-center justify-center",
                            isDark ? "bg-gray-800" : "bg-gray-100"
                        )}>
                            <ImageIcon className={clsx(
                                "w-8 h-8",
                                isDark ? "text-gray-500" : "text-gray-400"
                            )} />
                        </div>
                        <div>
                            <p className={clsx(
                                "font-medium",
                                isDark ? "text-white" : "text-gray-900"
                            )}>
                                Fotoğraf Yükle
                            </p>
                            <p className={clsx(
                                "text-sm",
                                isDark ? "text-gray-400" : "text-gray-500"
                            )}>
                                Sürükle bırak veya{" "}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-purple-500 hover:underline"
                                >
                                    dosya seç
                                </button>
                            </p>
                            <p className={clsx(
                                "text-xs mt-1",
                                isDark ? "text-gray-500" : "text-gray-400"
                            )}>
                                Max {maxImages} fotoğraf, her biri max 5MB
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Grid with Reorder */}
            {images.length > 0 && (
                <div>
                    <p className={clsx(
                        "text-sm mb-2",
                        isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                        💡 Sıralamak için sürükle, yıldıza tıklayarak ana fotoğraf seç
                    </p>

                    <Reorder.Group
                        axis="x"
                        values={images}
                        onReorder={handleReorder}
                        className="flex flex-wrap gap-3"
                    >
                        {images.map((image) => (
                            <Reorder.Item
                                key={image.id}
                                value={image}
                                className="touch-none"
                            >
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className={clsx(
                                        "relative w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing group",
                                        image.isMain
                                            ? "border-purple-500 ring-2 ring-purple-500/30"
                                            : isDark
                                                ? "border-gray-700"
                                                : "border-gray-200"
                                    )}
                                >
                                    <Image
                                        src={image.preview || toR2ProxyUrl(image.url)}
                                        alt="Listing photo"
                                        fill
                                        className="object-cover"

                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                                    {/* Drag Handle */}
                                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <GripVertical className="w-5 h-5 text-white drop-shadow-lg" />
                                    </div>

                                    {/* Actions */}
                                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => setMainImage(image.id)}
                                            className={clsx(
                                                "p-1 rounded-md transition-colors",
                                                image.isMain
                                                    ? "bg-yellow-500 text-white"
                                                    : "bg-white/90 text-gray-700 hover:bg-yellow-500 hover:text-white"
                                            )}
                                            title="Ana fotoğraf yap"
                                        >
                                            <Star className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeImage(image.id)}
                                            className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                                            title="Sil"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Main Badge */}
                                    {image.isMain && (
                                        <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-md">
                                            Ana
                                        </div>
                                    )}
                                </motion.div>
                            </Reorder.Item>
                        ))}

                        {/* Add More Button */}
                        {images.length < maxImages && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={clsx(
                                    "w-24 h-24 md:w-28 md:h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors",
                                    isDark
                                        ? "border-gray-700 hover:border-purple-500 text-gray-500"
                                        : "border-gray-300 hover:border-purple-500 text-gray-400"
                                )}
                            >
                                <Plus className="w-6 h-6" />
                                <span className="text-xs">Ekle</span>
                            </button>
                        )}
                    </Reorder.Group>
                </div>
            )}
        </div>
    );
}
