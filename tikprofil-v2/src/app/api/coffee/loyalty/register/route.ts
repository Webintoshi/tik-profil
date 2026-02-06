import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = getSupabaseAdmin();

        // Get business by slug
        const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("slug", body.business_slug)
            .single();

        if (!business) {
            return NextResponse.json(
                { success: false, error: "Business not found" },
                { status: 404 }
            );
        }

        // Check if customer exists
        const { data: existing } = await supabase
            .from("coffee_loyalty_customers")
            .select("*")
            .eq("business_id", business.id)
            .eq("customer_phone", body.customer_phone)
            .single();

        if (existing) {
            return NextResponse.json({
                success: true,
                data: {
                    customer_id: existing.id,
                    stamps: existing.stamps_earned,
                    points: existing.points_balance,
                    tier: existing.tier
                }
            });
        }

        // Create new customer
        const { data, error } = await supabase
            .from("coffee_loyalty_customers")
            .insert({
                business_id: business.id,
                customer_phone: body.customer_phone,
                customer_name: body.customer_name,
                customer_device_id: body.customer_device_id,
                tier: "bronze"
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Loyalty Register] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to register customer" },
            { status: 500 }
        );
    }
}
