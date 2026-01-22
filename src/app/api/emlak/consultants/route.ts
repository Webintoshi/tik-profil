// Emlak Consultants API - CRUD Operations
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import {
    getCollectionREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { getSessionSecretBytes } from '@/lib/env';
import { consultantSchema } from '@/types/emlak';

const COLLECTION = 'em_consultants';

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

// GET - List consultants
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const allConsultants = await getCollectionREST(COLLECTION);
        const consultants = allConsultants
            .filter((c) => c.businessId === businessId)
            .sort((a, b) => {
                const getTime = (val: unknown): number => {
                    if (!val) return 0;
                    if (typeof val === 'string') return new Date(val).getTime();
                    if (typeof val === 'object' && val !== null && 'seconds' in val) {
                        return (val as { seconds: number }).seconds * 1000;
                    }
                    return 0;
                };
                return getTime(b.createdAt) - getTime(a.createdAt);
            });

        return NextResponse.json({ success: true, consultants });
    } catch (error) {
        console.error('[Emlak Consultants] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// Generate URL-safe slug from name
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Ensure slug is unique within business
async function ensureUniqueSlug(baseSlug: string, businessId: string, existingId?: string): Promise<string> {
    const allConsultants = await getCollectionREST(COLLECTION);
    const businessConsultants = allConsultants.filter(c =>
        c.businessId === businessId && c.id !== existingId
    );

    let slug = baseSlug;
    let counter = 1;

    while (businessConsultants.some(c => c.slug === slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
}

// POST - Create new consultant
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Server-side validation
        const validation = consultantSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
            return NextResponse.json({
                success: false,
                error: 'Doğrulama hatası',
                details: errors
            }, { status: 400 });
        }

        const data = validation.data;

        // Generate unique slug from name
        const baseSlug = generateSlug(data.name);
        const uniqueSlug = await ensureUniqueSlug(baseSlug, businessId);

        const consultantId = await createDocumentREST(COLLECTION, {
            businessId,
            name: data.name,
            title: data.title || 'Emlak Danışmanı',
            phone: data.phone,
            whatsapp: data.whatsapp || data.phone,
            email: data.email || '',
            photoUrl: data.photoUrl || '',
            slug: uniqueSlug,
            bio: data.bio || '',
            socialLinks: data.socialLinks || {},
            isActive: data.isActive !== false,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, consultantId, slug: uniqueSlug });
    } catch (error) {
        console.error('[Emlak Consultants] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update consultant
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, newPassword, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        // Verify ownership
        const allConsultants = await getCollectionREST(COLLECTION);
        const consultant = allConsultants.find((c) => c.id === id);
        if (!consultant || consultant.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        // Hash password if provided
        if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashedPassword;
        }

        // Generate slug if name changed and no slug exists
        if (updateData.name && !consultant.slug) {
            const slug = generateSlug(updateData.name);
            updateData.slug = await ensureUniqueSlug(slug, businessId, id);
        }

        await updateDocumentREST(COLLECTION, id, updateData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Emlak Consultants] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete consultant
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
        const allConsultants = await getCollectionREST(COLLECTION);
        const consultant = allConsultants.find((c) => c.id === id);
        if (!consultant || consultant.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        // CASCADE DELETE: First delete all listings belonging to this consultant
        const allListings = await getCollectionREST('em_listings');
        const consultantListings = allListings.filter((l) => l.consultantId === id);
        let deletedListingsCount = 0;
        for (const listing of consultantListings) {
            await deleteDocumentREST('em_listings', listing.id as string);
            deletedListingsCount++;
        }

        // Then delete the consultant
        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({
            success: true,
            message: `Danışman ve ${deletedListingsCount} ilanı silindi`
        });
    } catch (error) {
        console.error('[Emlak Consultants] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
