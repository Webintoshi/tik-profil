import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError, validateOrThrow } from '@/lib/errors';
import { customerSchema } from '@/types/ecommerce';

const TABLE = 'ecommerce_customers';

interface CustomerRow {
    id: string;
    business_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    postal_code: string | null;
    total_spent: number | null;
    total_orders: number | null;
    created_at: string;
    updated_at: string;
}

function mapCustomer(row: CustomerRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        city: row.city,
        country: row.country,
        postalCode: row.postal_code,
        totalSpent: row.total_spent || 0,
        totalOrders: row.total_orders || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const customerId = searchParams.get('id');
        const search = searchParams.get('search');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        if (customerId) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('id', customerId)
                .eq('business_id', businessId)
                .single();

            if (error || !data) {
                return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
            }

            return NextResponse.json(mapCustomer(data));
        }

        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId);

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        const customers = (data || []).map(mapCustomer);

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...customerData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        validateOrThrow(customerSchema, customerData);

        const supabase = getSupabaseAdmin();

        const { data: existingCustomers, error: checkError } = await supabase
            .from(TABLE)
            .select('phone')
            .eq('business_id', businessId)
            .eq('phone', customerData.phone)
            .range(0, 0);

        if (checkError) throw checkError;

        if (existingCustomers && existingCustomers.length > 0) {
            return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address,
                city: customerData.city,
                country: customerData.country,
                postal_code: customerData.postalCode,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            id: data.id,
            customer: mapCustomer(data)
        });
    } catch (error) {
        console.error('[Ecommerce Customers POST Error]:', error);
        return NextResponse.json(
            { error: 'Müşteri oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, ...updateData } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Customer ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        if (updateData.phone && updateData.phone !== existing.phone) {
            const { data: existingCustomers, error: duplicateError } = await supabase
                .from(TABLE)
                .select('id')
                .eq('business_id', businessId)
                .eq('phone', updateData.phone)
                .neq('id', id)
                .range(0, 0);

            if (duplicateError) throw duplicateError;

            if (existingCustomers && existingCustomers.length > 0) {
                return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 400 });
            }
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update({
                name: updateData.name,
                email: updateData.email,
                phone: updateData.phone,
                address: updateData.address,
                city: updateData.city,
                country: updateData.country,
                postal_code: updateData.postalCode,
            })
            .eq('id', id)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Customers PUT Error]:', error);
        return NextResponse.json(
            { error: 'Müşteri güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const id = searchParams.get('id');

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Customer ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id, business_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Customers DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Müşteri silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
