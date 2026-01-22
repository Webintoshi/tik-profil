// Emlak Image Upload API
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { uploadToR2 } from '@/lib/r2Storage';
import { getSessionSecretBytes } from '@/lib/env';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Get business ID from session
async function getBusinessId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_owner_session")?.value;
        if (!token) return null;

        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload.businessId as string || null;
    } catch {
        return null;
    }
}

// POST - Upload image
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({
                success: false,
                error: 'Geçersiz dosya türü. JPG, PNG, WEBP veya GIF olmalı'
            }, { status: 400 });
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({
                success: false,
                error: 'Dosya boyutu çok büyük. Max 10MB'
            }, { status: 400 });
        }

        // Upload to R2 Storage
        const imageUrl = await uploadToR2(
            file,
            file.name,
            'emlak',
            businessId
        );

        return NextResponse.json({
            success: true,
            url: imageUrl,
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('[Emlak Upload] POST error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Yükleme başarısız';
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}


