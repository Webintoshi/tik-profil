import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get("slug");

        if (!slug) {
            return NextResponse.json(
                { success: false, error: "Business slug required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Get business
        const { data: business, error: businessError } = await supabase
            .from("businesses")
            .select("id, name, slug, image_url, address, phone, working_hours, description")
            .eq("slug", slug)
            .eq("is_active", true)
            .single();

        if (businessError || !business) {
            return NextResponse.json(
                { success: false, error: "Business not found" },
                { status: 404 }
            );
        }

        // Get settings
        const { data: settings } = await supabase
            .from("coffee_settings")
            .select("*")
            .eq("business_id", business.id)
            .single();

        // Get categories
        const { data: categories } = await supabase
            .from("coffee_categories")
            .select("id, name, slug, icon, image_url, description, sort_order")
            .eq("business_id", business.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        // Get sizes
        const { data: sizes } = await supabase
            .from("coffee_sizes")
            .select("id, name, volume_ml, price_modifier")
            .eq("business_id", business.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        // Get products with extras
        const { data: products } = await supabase
            .from("coffee_products")
            .select(`
                id, name, name_en, description, description_en, image_url,
                temperature, coffee_type, caffeine_level, base_shots, has_milk,
                base_price, discount_price, discount_percent, calories, preparation_time,
                is_featured, is_available, category_id,
                coffee_product_extras(extra_group_id)
            `)
            .eq("business_id", business.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        // Get extra groups with extras
        const { data: extraGroups } = await supabase
            .from("coffee_extra_groups")
            .select(`
                id, name, slug, selection_type, min_selection, max_selection, is_required,
                coffee_extras(id, name, name_en, price_modifier, calories)
            `)
            .eq("business_id", business.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        // Get active coupons
        const { data: coupons } = await supabase
            .from("coffee_coupons")
            .select("code, name, description, discount_type, discount_value, min_order_amount")
            .eq("business_id", business.id)
            .eq("is_active", true)
            .lte("valid_from", new Date().toISOString())
            .gte("valid_until", new Date().toISOString());

        return NextResponse.json({
            success: true,
            data: {
                business,
                settings: settings || {},
                categories: categories || [],
                sizes: sizes || [],
                products: products || [],
                extraGroups: extraGroups || [],
                coupons: coupons || [],
            },
        });
    } catch (error) {
        console.error("[Coffee Public Menu] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch menu" },
            { status: 500 }
        );
    }
}
