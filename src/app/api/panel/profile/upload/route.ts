import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { uploadToR2, deleteFromR2 } from '@/lib/r2Storage';
import { getSessionSecretBytes } from '@/lib/env';

const getJwtSecret = () => getSessionSecretBytes();

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

export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const kind = formData.get('kind') as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        if (kind !== 'logo' && kind !== 'cover') {
            return NextResponse.json({ success: false, error: 'Invalid kind' }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
        }

        const maxSize = kind === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({ success: false, error: 'File too large' }, { status: 400 });
        }

        const moduleName = kind === 'logo' ? 'logos' : 'covers';
        const imageUrl = await uploadToR2(file, file.name, moduleName, businessId);

        return NextResponse.json({ success: true, imageUrl });
    } catch (error) {
        console.error('[Profile Upload] POST error:', error);
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ success: false, error: 'Missing key' }, { status: 400 });
        }

        const allowedPrefixes = [`logos/${businessId}/`, `covers/${businessId}/`];
        if (!allowedPrefixes.some(prefix => key.startsWith(prefix))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        await deleteFromR2(key);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Profile Upload] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
    }
}

