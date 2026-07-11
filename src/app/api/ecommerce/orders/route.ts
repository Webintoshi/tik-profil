import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertBusinessMember } from "@/server/auth/guards";

const ORDER_STATUSES = new Set(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]);
const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded"]);

function amount(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function mapOrder(row: Record<string, any>) {
    const customerInfo = {
        address: row.customer_address || "",
        city: row.customer_city || "",
        district: row.customer_district || "",
        email: row.customer_email || "",
        name: row.customer_name || "",
        phone: row.customer_phone || "",
    };
    return {
        couponCode: row.coupon_code,
        couponDiscount: amount(row.coupon_discount),
        createdAt: row.created_at,
        customer: customerInfo,
        customerInfo,
        customerNote: row.customer_note,
        deliveryFee: amount(row.shipping_fee),
        discount: amount(row.coupon_discount),
        id: row.id,
        items: row.items || [],
        orderNumber: row.order_number,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        shippingCost: amount(row.shipping_fee),
        shippingMethod: row.shipping_method,
        status: row.order_status,
        subtotal: amount(row.subtotal),
        total: amount(row.total),
        updatedAt: row.updated_at,
    };
}

export async function GET() {
    try {
        const { businessId } = await assertBusinessMember();
        const supabase = getSupabaseAdmin();
        const { data: orders, error } = await supabase
            .from("ecommerce_orders")
            .select("*")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json({ success: true, orders: (orders || []).map(mapOrder) });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Orders GET");
    }
}

// Orders are created only by the authoritative public checkout transaction.
export async function POST() {
    return NextResponse.json({ error: "Use the public checkout endpoint to create orders." }, { status: 405 });
}

export async function PATCH(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const id = typeof body.id === "string" ? body.id.trim() : "";
        if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });
        if (body.status !== undefined && !ORDER_STATUSES.has(body.status)) {
            return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
        }
        if (body.paymentStatus !== undefined && !PAYMENT_STATUSES.has(body.paymentStatus)) {
            return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
        }
        if (body.status === undefined && body.paymentStatus === undefined) {
            return NextResponse.json({ error: "Status update required" }, { status: 400 });
        }

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.status !== undefined) updateData.order_status = body.status;
        if (body.paymentStatus !== undefined) updateData.payment_status = body.paymentStatus;
        const supabase = getSupabaseAdmin();
        const { data: row, error } = await supabase
            .from("ecommerce_orders")
            .update(updateData)
            .eq("id", id)
            .eq("business_id", businessId)
            .select()
            .maybeSingle();
        if (error) throw error;
        if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        return NextResponse.json({ success: true, order: mapOrder(row) });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Orders PATCH");
    }
}

export async function PUT(request: NextRequest) {
    return PATCH(request);
}

export async function DELETE(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });
        const { error } = await getSupabaseAdmin()
            .from("ecommerce_orders")
            .delete()
            .eq("id", id)
            .eq("business_id", businessId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Orders DELETE");
    }
}
