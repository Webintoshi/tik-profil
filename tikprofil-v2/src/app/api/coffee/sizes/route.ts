import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const sizeSchema = z.object({
    name: z.string().min(1).max(50),
    name_en: z.string().optional(),
    volume_ml: z.number().int().positive().optional(),
    volume_oz: z.number().int().positive().optional(),
    price_modifier: z.number().default(0),
    sort_order: z.number().default(0)
});

// GET - List sizes
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

        const { data: sizes, error } = await supabase
            .from("coffee_sizes")
            .select("*")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, data: sizes });
    } catch (error) {
        console.error("[Coffee Sizes GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch sizes" },
            { status: 500 }
        );
    }
}

// POST - Create size
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = sizeSchema.parse(body);
        const businessId = body.business_id;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: size, error } = await supabase
            .from("coffee_sizes")
            .insert({
                business_id: businessId,
                name: validated.name,
                name_en: validated.name_en,
                volume_ml: validated.volume_ml,
                volume_oz: validated.volume_oz,
                price_modifier: validated.price_modifier ?? 0,
                sort_order: validated.sort_order ?? 0,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: size });
    } catch (error) {
        console.error("[Coffee Sizes POST] Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Failed to create size" },
            { status: 500 }
        );
    }
}

// PUT - Update size
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Size ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: size, error } = await supabase
            .from("coffee_sizes")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: size });
    } catch (error) {
        console.error("[Coffee Sizes PUT] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update size" },
            { status: 500 }
        );
    }
}

// DELETE - Delete size
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Size ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from("coffee_sizes")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Coffee Sizes DELETE] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete size" },
            { status: 500 }
        );
    }
}
