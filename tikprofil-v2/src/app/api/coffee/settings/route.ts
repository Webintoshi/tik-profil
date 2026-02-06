import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET - Get or create settings
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get("business_id");

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Get or create settings
        let { data, error } = await supabase
            .from("coffee_settings")
            .select("*")
            .eq("business_id", businessId)
            .single();

        if (!data) {
            const { data: newSettings } = await supabase
                .from("coffee_settings")
                .insert({ business_id: businessId })
                .select()
                .single();
            data = newSettings;
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Settings GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from("coffee_settings")
            .upsert({
                business_id: body.business_id,
                wifi_name: body.wifi_name,
                wifi_password: body.wifi_password,
                loyalty_enabled: body.loyalty_enabled ?? true,
                loyalty_type: body.loyalty_type ?? "stamps",
                stamps_for_free_drink: body.stamps_for_free_drink ?? 10,
                points_per_currency: body.points_per_currency ?? 10,
                points_for_free_drink: body.points_for_free_drink ?? 500,
                tier_enabled: body.tier_enabled ?? true,
                tier_bronze_threshold: body.tier_bronze_threshold ?? 0,
                tier_silver_threshold: body.tier_silver_threshold ?? 500,
                tier_gold_threshold: body.tier_gold_threshold ?? 2000,
                subscription_enabled: body.subscription_enabled ?? false,
                subscription_price: body.subscription_price ?? 299.00,
                tip_enabled: body.tip_enabled ?? true,
                tip_percentages: body.tip_percentages ?? [10, 15, 20],
                auto_accept_orders: body.auto_accept_orders ?? false,
                preparation_time_default: body.preparation_time_default ?? 5,
                pickup_enabled: body.pickup_enabled ?? true,
                pickup_min_hours: body.pickup_min_hours ?? 0,
                pickup_max_hours: body.pickup_max_hours ?? 168,
                payment_cash: body.payment_cash ?? true,
                payment_credit_card: body.payment_credit_card ?? true,
                payment_mobile: body.payment_mobile ?? true,
                tax_rate: body.tax_rate ?? 10
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Settings PUT] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
