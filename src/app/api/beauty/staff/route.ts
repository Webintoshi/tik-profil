// Beauty Staff API - CRUD Operations
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
import { staffSchema } from '@/types/beauty';

const COLLECTION = 'beauty_staff';

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

// GET - List staff
// Supports both:
// 1. Public access with ?businessId=xxx (for booking wizard)
// 2. Authenticated access (for panel management)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const queryBusinessId = searchParams.get('businessId');

        // If businessId is provided, allow public access (for booking wizard)
        if (queryBusinessId) {
            const allStaff = await getCollectionREST(COLLECTION);
            const staff = allStaff
                .filter((s) => s.businessId === queryBusinessId && s.isActive === true)
                .map(s => ({
                    id: s.id,
                    name: s.name,
                    title: s.title,
                    photoUrl: s.photoUrl,
                    specialties: s.specialties
                })); // Return limited fields for public access

            return NextResponse.json({ success: true, staff });
        }

        // Otherwise, require authentication (for panel management)
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const allStaff = await getCollectionREST(COLLECTION);
        const staff = allStaff.filter((s) => s.businessId === businessId);

        return NextResponse.json({ success: true, staff });
    } catch (error) {
        console.error('[Beauty Staff] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create staff
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Server-side validation
        const validation = staffSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
            return NextResponse.json({
                success: false,
                error: 'Doğrulama hatası',
                details: errors
            }, { status: 400 });
        }

        const data = validation.data;

        const staffId = await createDocumentREST(COLLECTION, {
            businessId,
            name: data.name,
            title: data.title || 'Uzman',
            specialties: data.specialties || [],
            phone: data.phone,
            photoUrl: data.photoUrl || '',
            isActive: data.isActive !== false,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, staffId });
    } catch (error) {
        console.error('[Beauty Staff] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update staff
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
        const allStaff = await getCollectionREST(COLLECTION);
        const staffMember = allStaff.find((s) => s.id === id);
        if (!staffMember || staffMember.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Personel bulunamadı' }, { status: 404 });
        }

        await updateDocumentREST(COLLECTION, id, updateData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Beauty Staff] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete staff
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
        const allStaff = await getCollectionREST(COLLECTION);
        const staffMember = allStaff.find((s) => s.id === id);
        if (!staffMember || staffMember.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Personel bulunamadı' }, { status: 404 });
        }

        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Beauty Staff] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
