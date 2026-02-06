import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const productSchema = z.object({
    name: z.string().min(1).max(100),
    name_en: z.string().optional(),
    description: z.string().optional(),
    description_en: z.string().optional(),
    category_id: z.string().uuid(),
    image_url: z.string().optional(),
    temperature: z.enum(["hot", "iced", "both"]).default("hot"),
    coffee_type: z.enum(["espresso", "filter", "french_press", "cold_brew", "tea", "none"]).default("espresso"),
    caffeine_level: z.enum(["none", "low", "medium", "high"]).default("medium"),
    base_shots: z.number().int().min(0).default(1),
    has_milk: z.boolean().default(false),
    base_price: z.number().positive(),
    discount_price: z.number().optional(),
    discount_percent: z.number().int().min(0).max(100).optional(),
    calories: z.number().int().optional(),
    preparation_time: z.number().int().min(1).default(5),
    is_featured: z.boolean().default(false),
    is_available: z.boolean().default(true),
    sort_order: z.number().default(0),
    extra_group_ids: z.array(z.string().uuid()).default([])
});

// GET - List products
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get("business_id");
        const categoryId = searchParams.get("category_id");

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        let query = supabase
            .from("coffee_products")
            .select("*, coffee_product_extras(extra_group_id)")
            .eq("business_id", businessId)
            .order("sort_order", { ascending: true });

        if (categoryId) {
            query = query.eq("category_id", categoryId);
        }

        const { data: products, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        console.error("[Coffee Products GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch products" },
            { status: 500 }
        );
    }
}

// POST - Create product
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = productSchema.parse(body.data);
        const businessId = body.business_id;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { extra_group_ids, ...productData } = validated;

        // Create product
        const { data: product, error } = await supabase
            .from("coffee_products")
            .insert({
                business_id: businessId,
                ...productData
            })
            .select()
            .single();

        if (error) throw error;

        // Create product-extra relations
        if (extra_group_ids.length > 0 && product) {
            const relations = extra_group_ids.map((groupId: string, index: number) => ({
                product_id: product.id,
                extra_group_id: groupId,
                sort_order: index
            }));

            await supabase.from("coffee_product_extras").insert(relations);
        }

        return NextResponse.json({ success: true, data: product });
    } catch (error) {
        console.error("[Coffee Products POST] Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Failed to create product" },
            { status: 500 }
        );
    }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, extra_group_ids, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Product ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Update product
        const { data: product, error } = await supabase
            .from("coffee_products")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        // Update extra group relations if provided
        if (extra_group_ids !== undefined) {
            // Delete existing relations
            await supabase
                .from("coffee_product_extras")
                .delete()
                .eq("product_id", id);

            // Create new relations
            if (extra_group_ids.length > 0) {
                const relations = extra_group_ids.map((groupId: string, index: number) => ({
                    product_id: id,
                    extra_group_id: groupId,
                    sort_order: index
                }));

                await supabase.from("coffee_product_extras").insert(relations);
            }
        }

        return NextResponse.json({ success: true, data: product });
    } catch (error) {
        console.error("[Coffee Products PUT] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update product" },
            { status: 500 }
        );
    }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Product ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Delete product (cascades to coffee_product_extras)
        const { error } = await supabase
            .from("coffee_products")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Coffee Products DELETE] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete product" },
            { status: 500 }
        );
    }
}
