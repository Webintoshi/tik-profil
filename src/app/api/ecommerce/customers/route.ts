import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertBusinessMember } from "@/server/auth/guards";

export async function GET() {
    try {
        const { businessId } = await assertBusinessMember();
        const supabase = getSupabaseAdmin();

        const { data: customers, error } = await supabase
            .from("ecommerce_customers")
            .select("*")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, customers });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Customers GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const customer = body.customer;

        if (!customer) {
            return NextResponse.json({ error: "Customer data required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: existingCustomer, error: existingError } = await supabase
            .from("ecommerce_customers")
            .select("id")
            .eq("business_id", businessId)
            .eq("email", customer.email)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        let result;
        if (existingCustomer) {
            const { data, error } = await supabase
                .from("ecommerce_customers")
                .update({
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    city: customer.city,
                    country: customer.country,
                    postal_code: customer.postalCode,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existingCustomer.id)
                .eq("business_id", businessId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            result = data;
        } else {
            const { data, error } = await supabase
                .from("ecommerce_customers")
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

            if (error) {
                throw error;
            }

            result = data;
        }

        return NextResponse.json({ success: true, customer: result });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Customers POST");
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const id = new URL(request.url).searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from("ecommerce_customers")
            .delete()
            .eq("id", id)
            .eq("business_id", businessId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Customers DELETE");
    }
}
