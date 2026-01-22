import { NextRequest, NextResponse } from 'next/server';
import {
    getCollectionREST,
    getDocumentREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { customerSchema } from '@/types/ecommerce';
import type { Customer } from '@/types/ecommerce';

const COLLECTION = 'ecommerce_customers';

// GET: List customers or get single customer
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const customerId = searchParams.get('id');
        const search = searchParams.get('search');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Get single customer
        if (customerId) {
            const customer = await getDocumentREST(COLLECTION, customerId);
            if (!customer || customer.businessId !== businessId) {
                return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
            }
            return NextResponse.json(customer);
        }

        // Get all customers for business
        const allCustomers = await getCollectionREST(COLLECTION) as unknown as Customer[];
        let customers = allCustomers.filter(c => c.businessId === businessId);

        // Search if provided
        if (search) {
            const searchLower = search.toLowerCase();
            customers = customers.filter(c =>
                c.name.toLowerCase().includes(searchLower) ||
                c.email.toLowerCase().includes(searchLower) ||
                c.phone.includes(search)
            );
        }

        // Sort by totalSpent descending
        customers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));

        // Calculate stats
        const stats = {
            total: customers.length,
            totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
            avgOrderValue: customers.length > 0
                ? customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) /
                Math.max(1, customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0))
                : 0,
        };

        return NextResponse.json({ success: true, customers, stats });
    } catch (error) {
        console.error('[Ecommerce Customers GET Error]:', error);
        return NextResponse.json(
            { error: 'Müşteriler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// POST: Create new customer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...customerData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Validate
        const validation = customerSchema.safeParse(customerData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        // Check for duplicate phone in same business
        const allCustomers = await getCollectionREST(COLLECTION) as unknown as Customer[];
        const duplicate = allCustomers.find(
            c => c.businessId === businessId && c.phone === data.phone
        );
        if (duplicate) {
            return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 400 });
        }

        const newCustomer = {
            ...data,
            businessId,
            totalOrders: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const id = await createDocumentREST(COLLECTION, newCustomer);

        return NextResponse.json({
            success: true,
            id,
            customer: { id, ...newCustomer }
        });
    } catch (error) {
        console.error('[Ecommerce Customers POST Error]:', error);
        return NextResponse.json(
            { error: 'Müşteri oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT: Update customer
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, ...updateData } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Customer ID required' }, { status: 400 });
        }

        // Check customer exists and belongs to business
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Validate
        const validation = customerSchema.partial().safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        // Check for duplicate phone if phone changed
        if (data.phone && data.phone !== existing.phone) {
            const allCustomers = await getCollectionREST(COLLECTION) as unknown as Customer[];
            const duplicate = allCustomers.find(
                c => c.businessId === businessId && c.phone === data.phone && c.id !== id
            );
            if (duplicate) {
                return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 400 });
            }
        }

        await updateDocumentREST(COLLECTION, id, {
            ...data,
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Customers PUT Error]:', error);
        return NextResponse.json(
            { error: 'Müşteri güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE: Delete customer
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const id = searchParams.get('id');

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Customer ID required' }, { status: 400 });
        }

        // Check customer exists and belongs to business
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Customers DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Müşteri silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
