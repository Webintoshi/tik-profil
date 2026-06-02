import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertBusinessMember } from "@/server/auth/guards";

export async function GET() {
    try {
        const { businessId } = await assertBusinessMember();
        const supabase = getSupabaseAdmin();

        const { data: orders, error } = await supabase
            .from("ecommerce_orders")
            .select("*")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        const transformedOrders = orders?.map((row: any) => ({
            id: row.id,
            orderNumber: row.order_number,
            customer: row.customer,
            items: row.items,
            subtotal: row.subtotal,
            deliveryFee: row.delivery_fee,
            total: row.total,
            paymentMethod: row.payment_method,
            paymentStatus: row.payment_status,
            status: row.order_status,
            customerNote: row.customer_note,
            couponCode: row.coupon_code,
            couponDiscount: typeof row.coupon_discount === "string" ? parseFloat(row.coupon_discount) : row.coupon_discount,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        })) || [];

        return NextResponse.json({ success: true, orders: transformedOrders });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Orders GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const order = body.order;

        if (!order) {
            return NextResponse.json({ error: "Order data required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const orderNumber = `EC${Date.now().toString(36).toUpperCase()}`;

        const { data: newOrder, error } = await supabase
            .from("ecommerce_orders")
            .insert({
                business_id: businessId,
                order_number: orderNumber,
                customer: order.customer,
                items: order.items,
                subtotal: order.subtotal,
                delivery_fee: order.deliveryFee,
                total: order.total,
                payment_method: order.paymentMethod,
                payment_status: order.paymentStatus || "pending",
                order_status: order.status || "pending",
                customer_note: order.customerNote,
                coupon_code: order.couponCode,
                coupon_discount: order.couponDiscount,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, order: newOrder });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Orders POST");
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const { id, status, paymentStatus } = body;

        if (!id) {
            return NextResponse.json({ error: "Order ID required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (status) updateData.order_status = status;
        if (paymentStatus) updateData.payment_status = paymentStatus;

        const { data: order, error } = await supabase
            .from("ecommerce_orders")
            .update(updateData)
            .eq("id", id)
            .eq("business_id", businessId)
            .select()
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, order });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Orders PATCH");
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const id = new URL(request.url).searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Order ID required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from("ecommerce_orders")
            .delete()
            .eq("id", id)
            .eq("business_id", businessId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Orders DELETE");
    }
}
