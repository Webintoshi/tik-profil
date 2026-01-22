// Beauty Categories API - CRUD Operations
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
    getCollectionREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { getSessionSecretBytes } from '@/lib/env';
import { serviceCategorySchema } from '@/types/beauty';

const COLLECTION = 'beauty_categories';

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

// GET - List categories
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const allCategories = await getCollectionREST(COLLECTION);
        const categories = allCategories
            .filter((c) => c.businessId === businessId)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        return NextResponse.json({ success: true, categories });
    } catch (error) {
        console.error('[Beauty Categories] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create category
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Server-side validation
        const validation = serviceCategorySchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
            return NextResponse.json({
                success: false,
                error: 'Doğrulama hatası',
                details: errors
            }, { status: 400 });
        }

        const data = validation.data;

        const categoryId = await createDocumentREST(COLLECTION, {
            businessId,
            name: data.name,
            icon: data.icon || '',
            order: data.order || 0,
            isActive: data.isActive !== false,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, categoryId });
    } catch (error) {
        console.error('[Beauty Categories] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update category
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        // Verify ownership
        const allCategories = await getCollectionREST(COLLECTION);
        const category = allCategories.find((c) => c.id === id);
        if (!category || category.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Kategori bulunamadı' }, { status: 404 });
        }

        await updateDocumentREST(COLLECTION, id, updateData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Beauty Categories] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete category
export async function DELETE(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        // Verify ownership
        const allCategories = await getCollectionREST(COLLECTION);
        const category = allCategories.find((c) => c.id === id);
        if (!category || category.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Kategori bulunamadı' }, { status: 404 });
        }

        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Beauty Categories] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
