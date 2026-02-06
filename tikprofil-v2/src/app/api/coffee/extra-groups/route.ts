import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET - List all extra groups for a business
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

        const { data, error } = await supabase
            .from("coffee_extra_groups")
            .select("*, coffee_extras(*)")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("sort_order");

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Extra Groups GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch extra groups" },
            { status: 500 }
        );
    }
}

// POST - Create new extra group
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from("coffee_extra_groups")
            .insert({
                business_id: body.business_id,
                name: body.name,
                slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-"),
                selection_type: body.selection_type || "single",
                min_selection: body.min_selection || 0,
                max_selection: body.max_selection || 1,
                is_required: body.is_required || false,
                sort_order: body.sort_order || 0
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Extra Groups POST] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create extra group" },
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

        const { data, error } = await supabase
            .from("coffee_extra_groups")
            .update({
                name: updates.name,
                selection_type: updates.selection_type,
                min_selection: updates.min_selection,
                max_selection: updates.max_selection,
                is_required: updates.is_required,
                sort_order: updates.sort_order,
                is_active: updates.is_active
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Extra Groups PUT] Error:", error);
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
            .update({ is_active: false })
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Coffee Extra Groups DELETE] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete extra group" },
            { status: 500 }
        );
    }
}
