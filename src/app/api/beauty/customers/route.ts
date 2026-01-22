// Beauty Customers API - CRUD Operations
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
import { customerSchema, Customer } from '@/types/beauty';

const COLLECTION = 'beauty_customers';

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

// GET - List customers with optional search
export async function GET(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.toLowerCase();
        const tag = searchParams.get('tag');

        const allCustomers = await getCollectionREST(COLLECTION) as unknown as Customer[];
        let customers = allCustomers.filter((c) => c.businessId === businessId);

        // Apply search filter
        if (search) {
            customers = customers.filter((c) =>
                c.name.toLowerCase().includes(search) ||
                c.phone.includes(search) ||
                c.email?.toLowerCase().includes(search)
            );
        }

        // Apply tag filter
        if (tag) {
            customers = customers.filter((c) =>
                c.tags?.includes(tag)
            );
        }

        // Sort by last visit (most recent first), then by name
        customers.sort((a, b) => {
            if (a.lastVisit && b.lastVisit) {
                return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
            }
            if (a.lastVisit) return -1;
            if (b.lastVisit) return 1;
            return a.name.localeCompare(b.name, 'tr');
        });

        return NextResponse.json({ success: true, customers });
    } catch (error) {
        console.error('[Beauty Customers] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create customer
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Server-side validation
        const validation = customerSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
            return NextResponse.json({
                success: false,
                error: 'Doğrulama hatası',
                details: errors
            }, { status: 400 });
        }

        const data = validation.data;

        // Check if customer with same phone already exists
        const allCustomers = await getCollectionREST(COLLECTION) as unknown as Customer[];
        const existing = allCustomers.find((c) =>
            c.businessId === businessId && c.phone === data.phone
        );
        if (existing) {
            return NextResponse.json({
                success: false,
                error: 'Bu telefon numarasıyla kayıtlı müşteri zaten mevcut'
            }, { status: 409 });
        }

        const customerId = await createDocumentREST(COLLECTION, {
            businessId,
            name: data.name,
            phone: data.phone,
            email: data.email || '',
            notes: data.notes || '',
            tags: data.tags || [],
            totalAppointments: 0,
            totalSpent: 0,
            lastVisit: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, customerId });
    } catch (error) {
        console.error('[Beauty Customers] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update customer
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
        const allCustomers = await getCollectionREST(COLLECTION) as unknown as Customer[];
        const customer = allCustomers.find((c) => c.id === id);
        if (!customer || customer.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Müşteri bulunamadı' }, { status: 404 });
        }

        await updateDocumentREST(COLLECTION, id, {
            ...updateData,
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Beauty Customers] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete customer
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
        const allCustomers = await getCollectionREST(COLLECTION) as unknown as Customer[];
        const customer = allCustomers.find((c) => c.id === id);
        if (!customer || customer.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Müşteri bulunamadı' }, { status: 404 });
        }

        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Beauty Customers] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
