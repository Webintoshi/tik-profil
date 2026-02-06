import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST - Call waiter
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

        const { data, error } = await supabase
            .from("coffee_call_waiter")
            .insert({
                business_id: business.id,
                table_id: body.table_id,
                table_number: body.table_number,
                notes: body.notes,
                status: "pending"
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Call Waiter POST] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to call waiter" },
            { status: 500 }
        );
    }
}

// GET - List pending calls (admin)
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
            .from("coffee_call_waiter")
            .select("*")
            .eq("business_id", businessId)
            .eq("status", "pending")
            .order("called_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Call Waiter GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch calls" },
            { status: 500 }
        );
    }
}

// PUT - Update call status
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = getSupabaseAdmin();
        const now = new Date().toISOString();

        const updateData: any = { status: body.status };
        if (body.status === "acknowledged") updateData.acknowledged_at = now;
        if (body.status === "completed") updateData.completed_at = now;

        const { data, error } = await supabase
            .from("coffee_call_waiter")
            .update(updateData)
            .eq("id", body.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[Coffee Call Waiter PUT] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update call" },
            { status: 500 }
        );
    }
}

// DELETE - Cancel call
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Call ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from("coffee_call_waiter")
            .update({ status: "cancelled" })
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Coffee Call Waiter DELETE] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to cancel call" },
            { status: 500 }
        );
    }
}
