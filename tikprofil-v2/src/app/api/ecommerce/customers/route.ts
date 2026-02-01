import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/ecommerce/customers - Get all customers for a business
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: customers, error } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching customers:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, customers });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/ecommerce/customers - Create or update a customer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, customer } = body;

        if (!businessId || !customer) {
            return NextResponse.json({ error: 'Business ID and customer data required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Check if customer exists by email
        const { data: existingCustomer } = await supabase
            .from('ecommerce_customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('email', customer.email)
            .maybeSingle();

        let result;
        if (existingCustomer) {
            // Update existing customer
            const { data, error } = await supabase
                .from('ecommerce_customers')
                .update({
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    city: customer.city,
                    country: customer.country,
                    postal_code: customer.postalCode,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingCustomer.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Create new customer
            const { data, error } = await supabase
                .from('ecommerce_customers')
                .insert({
                    business_id: businessId,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    city: customer.city,
                    country: customer.country,
                    postal_code: customer.postalCode,
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return NextResponse.json({ success: true, customer: result });
    } catch (error) {
        console.error('Error saving customer:', error);
        return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 });
    }
}

// DELETE /api/ecommerce/customers - Delete a customer
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from('ecommerce_customers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting customer:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
