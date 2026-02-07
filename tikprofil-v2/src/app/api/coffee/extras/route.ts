import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const extraGroupSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100),
    selection_type: z.enum(["single", "multiple"]).default("single"),
    min_selection: z.number().int().min(0).default(0),
    max_selection: z.number().int().min(1).default(1),
    is_required: z.boolean().default(false),
    sort_order: z.number().default(0)
});

const extraSchema = z.object({
    extra_group_id: z.string().uuid(),
    name: z.string().min(1).max(100),
    name_en: z.string().optional(),
    price_modifier: z.number().default(0),
    calories: z.number().int().optional(),
    sort_order: z.number().default(0)
});

// GET - List extra groups with extras
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

        const { data: groups, error } = await supabase
            .from("coffee_extra_groups")
            .select(`
                *,
                coffee_extras(*)
            `)
            .eq("business_id", businessId)
            .order("sort_order", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, data: groups });
    } catch (error) {
        console.error("[Coffee Extras GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch extras" },
            { status: 500 }
        );
    }
}

// POST - Create extra group
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = extraGroupSchema.parse(body);
        const businessId = body.business_id;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: group, error } = await supabase
            .from("coffee_extra_groups")
            .insert({
                business_id: businessId,
                name: validated.name,
                slug: validated.slug,
                selection_type: validated.selection_type,
                min_selection: validated.min_selection,
                max_selection: validated.max_selection,
                is_required: validated.is_required,
                sort_order: validated.sort_order ?? 0,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: group });
    } catch (error) {
        console.error("[Coffee Extras POST] Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Failed to create extra group" },
            { status: 500 }
        );
    }
}

// POST Extra Item - Create extra item
export async function POST_ITEM(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = extraSchema.parse(body);
        const businessId = body.business_id;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: extra, error } = await supabase
            .from("coffee_extras")
            .insert({
                business_id: businessId,
                extra_group_id: validated.extra_group_id,
                name: validated.name,
                name_en: validated.name_en,
                price_modifier: validated.price_modifier ?? 0,
                calories: validated.calories,
                sort_order: validated.sort_order ?? 0,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: extra });
    } catch (error) {
        console.error("[Coffee Extra Item POST] Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Failed to create extra" },
            { status: 500 }
        );
    }
}

// PUT - Update extra group
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Extra group ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: group, error } = await supabase
            .from("coffee_extra_groups")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: group });
    } catch (error) {
        console.error("[Coffee Extras PUT] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update extra group" },
            { status: 500 }
        );
    }
}

// DELETE - Delete extra group
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Extra group ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from("coffee_extra_groups")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Coffee Extras DELETE] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete extra group" },
            { status: 500 }
        );
    }
}
