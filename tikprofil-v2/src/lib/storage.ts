/**
 * Profile Image Upload Service
 */

import { uploadImageWithFallback } from "@/lib/clientUpload";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

function validateImage(file: File, maxSize: number): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return 'Sadece JPG, PNG, WebP ve GIF dosyaları yüklenebilir';
    }
    if (file.size > maxSize) {
        const sizeMB = maxSize / (1024 * 1024);
        return `Dosya boyutu en fazla ${sizeMB}MB olabilir`;
    }
    return null;
}

async function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

async function getFileExtension(file: File): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const match = result.match(/^data:image\/(\w+);base64,/);
            resolve(match ? match[1] : 'jpg');
        };
        reader.readAsDataURL(file);
    });
}

async function uploadProfileImage(kind: 'logo' | 'cover', blob: Blob, fileName: string): Promise<string> {
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    const moduleName = kind === 'logo' ? 'logos' : 'covers';

    const { url } = await uploadImageWithFallback({
        file,
        moduleName,
        fallbackEndpoint: '/api/panel/profile/upload',
        fallbackFields: { kind },
    });

    if (!url) {
        throw new Error('Y??kleme ba?Yar??s??z');
    }

    return url;
}

export async function uploadLogo(businessId: string, file: File): Promise<UploadResult> {
    const error = validateImage(file, MAX_LOGO_SIZE);
    if (error) {
        return { success: false, error };
    }

    try {
        const resizedDataUrl = await resizeImage(file, 200, 200, 0.85);
        const resizedBlob = await dataUrlToBlob(resizedDataUrl);
        const extension = await getFileExtension(file);

        const url = await uploadProfileImage('logo', resizedBlob, `logo.${extension}`);
        
        return { success: true, url };
    } catch (err) {
        console.error('Logo upload error:', err);
        return { success: false, error: 'Logo yüklenirken bir hata oluştu' };
    }
}

export async function uploadCover(businessId: string, file: File): Promise<UploadResult> {
    const error = validateImage(file, MAX_COVER_SIZE);
    if (error) {
        return { success: false, error };
    }

    try {
        const resizedDataUrl = await resizeImage(file, 800, 400, 0.8);
        const resizedBlob = await dataUrlToBlob(resizedDataUrl);
        const extension = await getFileExtension(file);

        const url = await uploadProfileImage('cover', resizedBlob, `cover.${extension}`);
        
        return { success: true, url };
    } catch (err) {
        console.error('Cover upload error:', err);
        return { success: false, error: 'Kapak fotoğrafı yüklenirken bir hata oluştu' };
    }
}

export async function deleteImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl) return false;

    const extractKey = (url: string): string | null => {
        if (url.startsWith("/api/r2/")) {
            return decodeURIComponent(url.replace("/api/r2/", ""));
        }

        try {
            const parsed = new URL(url);
            return parsed.pathname.replace(/^\/+/, "");
        } catch {
            return null;
        }
    };

    const key = extractKey(imageUrl);
    if (!key) return false;

    try {
        const response = await fetch(`/api/panel/profile/upload?key=${encodeURIComponent(key)}`, {
            method: "DELETE",
        });
        const data = await response.json().catch(() => null);
        return response.ok && !!data?.success;
    } catch (error) {
        console.error("Delete image error:", error);
        return false;
    }
}
