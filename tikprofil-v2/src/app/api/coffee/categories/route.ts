import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const categorySchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100),
    icon: z.string().optional(),
    description: z.string().optional(),
    sort_order: z.number().default(0)
});

// GET - List categories
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

        const { data: categories, error } = await supabase
            .from("coffee_categories")
            .select("*")
            .eq("business_id", businessId)
            .order("sort_order", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, data: categories });
    } catch (error) {
        console.error("[Coffee Categories GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

// POST - Create category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = categorySchema.parse(body.data);
        const businessId = body.business_id;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: category, error } = await supabase
            .from("coffee_categories")
            .insert({
                business_id: businessId,
                ...validated
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: category });
    } catch (error) {
        console.error("[Coffee Categories POST] Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Failed to create category" },
            { status: 500 }
        );
    }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Category ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: category, error } = await supabase
            .from("coffee_categories")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: category });
    } catch (error) {
        console.error("[Coffee Categories PUT] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update category" },
            { status: 500 }
        );
    }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Category ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from("coffee_categories")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Coffee Categories DELETE] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete category" },
            { status: 500 }
        );
    }
}
