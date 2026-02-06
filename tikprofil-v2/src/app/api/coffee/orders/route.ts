import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const orderItemSchema = z.object({
    product_id: z.string().uuid(),
    size_id: z.string().uuid().optional(),
    quantity: z.number().int().min(1).max(99),
    selected_extras: z.array(z.object({
        extra_group_id: z.string().uuid(),
        extra_ids: z.array(z.string().uuid())
    })).default([]),
    notes: z.string().max(200).optional()
});

const orderSchema = z.object({
    business_slug: z.string(),
    customer_name: z.string().min(2).max(100),
    customer_phone: z.string().regex(/^5[0-9]{9}$/, "Geçerli Türkiye telefon numarası girin"),
    customer_email: z.string().email().optional(),
    order_type: z.enum(["dine_in", "takeaway", "delivery", "app_order"]),
    table_id: z.string().optional(),
    pickup_time: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
    coupon_code: z.string().optional(),
    tip_amount: z.number().min(0).default(0),
    payment_method: z.enum(["cash", "credit_card", "mobile", "prepaid"]),
    customer_notes: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = orderSchema.parse(body);

        const supabase = getSupabaseAdmin();

        // Get business
        const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("slug", validated.business_slug)
            .single();

        if (!business) {
            return NextResponse.json(
                { success: false, error: "Business not found" },
                { status: 404 }
            );
        }

        // Generate order number
        const orderNumber = `CF${Date.now().toString(36).toUpperCase()}`;

        // Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of validated.items) {
            // Get product
            const { data: product } = await supabase
                .from("coffee_products")
                .select("name, base_price, discount_price")
                .eq("id", item.product_id)
                .single();

            if (!product) continue;

            const unitPrice = product.discount_price || product.base_price;
            let sizeModifier = 0;
            let sizeName = null;

            // Get size modifier
            if (item.size_id) {
                const { data: size } = await supabase
                    .from("coffee_sizes")
                    .select("name, price_modifier")
                    .eq("id", item.size_id)
                    .single();
                if (size) {
                    sizeModifier = size.price_modifier;
                    sizeName = size.name;
                }
            }

            // Calculate extras
            let extrasTotal = 0;
            const selectedExtras = [];

            for (const extraGroup of item.selected_extras) {
                for (const extraId of extraGroup.extra_ids) {
                    const { data: extra } = await supabase
                        .from("coffee_extras")
                        .select("name, price_modifier")
                        .eq("id", extraId)
                        .single();
                    if (extra) {
                        extrasTotal += extra.price_modifier;
                        selectedExtras.push({
                            extra_group_id: extraGroup.extra_group_id,
                            extra_id: extraId,
                            name: extra.name,
                            price_modifier: extra.price_modifier
                        });
                    }
                }
            }

            const lineTotal = (unitPrice + sizeModifier + extrasTotal) * item.quantity;
            subtotal += lineTotal;

            orderItems.push({
                product_id: item.product_id,
                product_name: product.name,
                product_snapshot: product,
                size_id: item.size_id,
                size_name: sizeName,
                size_price_modifier: sizeModifier,
                unit_price: unitPrice,
                quantity: item.quantity,
                selected_extras: selectedExtras,
                extras_total: extrasTotal,
                line_total: lineTotal,
                notes: item.notes
            });
        }

        // Apply coupon
        let discountAmount = 0;
        if (validated.coupon_code) {
            const { data: coupon } = await supabase
                .from("coffee_coupons")
                .select("discount_type, discount_value, max_discount_amount, min_order_amount")
                .eq("business_id", business.id)
                .eq("code", validated.coupon_code)
                .eq("is_active", true)
                .single();

            if (coupon && subtotal >= (coupon.min_order_amount || 0)) {
                if (coupon.discount_type === "percentage") {
                    discountAmount = subtotal * (coupon.discount_value / 100);
                    if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
                        discountAmount = coupon.max_discount_amount;
                    }
                } else if (coupon.discount_type === "fixed") {
                    discountAmount = Math.min(coupon.discount_value, subtotal);
                }

                // Update coupon usage
                await supabase
                    .from("coffee_coupons")
                    .update({ used_count: supabase.rpc("increment", { x: 1 }) })
                    .eq("id", coupon.id);
            }
        }

        // Calculate totals
        const taxAmount = (subtotal - discountAmount) * 0.10; // 10% tax
        const totalAmount = subtotal - discountAmount + taxAmount + validated.tip_amount;

        // Create order
        const { data: order, error: orderError } = await supabase
            .from("coffee_orders")
            .insert({
                business_id: business.id,
                order_number: orderNumber,
                customer_name: validated.customer_name,
                customer_phone: validated.customer_phone,
                customer_email: validated.customer_email,
                order_type: validated.order_type,
                order_source: "web",
                table_id: validated.table_id,
                pickup_time: validated.pickup_time,
                subtotal,
                discount_amount: discountAmount,
                tax_amount: taxAmount,
                tip_amount: validated.tip_amount,
                total_amount: totalAmount,
                coupon_code: validated.coupon_code,
                coupon_discount: discountAmount,
                payment_method: validated.payment_method,
                payment_status: validated.payment_method === "cash" ? "pending" : "paid",
                is_paid: validated.payment_method !== "cash",
                status: "pending",
                customer_notes: validated.customer_notes
            })
            .select()
            .single();

        if (orderError || !order) {
            throw orderError || new Error("Failed to create order");
        }

        // Insert order items
        const orderItemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id
        }));

        await supabase.from("coffee_order_items").insert(orderItemsWithOrderId);

        // Handle loyalty
        await handleLoyalty(supabase, business.id, validated.customer_phone, validated.customer_name, totalAmount, order.id);

        return NextResponse.json({
            success: true,
            data: {
                order_id: order.id,
                order_number: orderNumber,
                total_amount: totalAmount,
                estimated_time: 10 // minutes
            }
        });
    } catch (error) {
        console.error("[Coffee Orders] Error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Failed to create order" },
            { status: 500 }
        );
    }
}

async function handleLoyalty(
    supabase: any,
    businessId: string,
    phone: string,
    name: string,
    totalAmount: number,
    orderId: string
) {
    // Get or create customer
    let { data: customer } = await supabase
        .from("coffee_loyalty_customers")
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_phone", phone)
        .single();

    if (!customer) {
        const { data: newCustomer } = await supabase
            .from("coffee_loyalty_customers")
            .insert({
                business_id: businessId,
                customer_phone: phone,
                customer_name: name
            })
            .select()
            .single();
        customer = newCustomer;
    }

    // Calculate stamps (1 per order, or 1 per X TL)
    const stampsEarned = 1;
    const pointsEarned = Math.floor(totalAmount * 10); // 10 points per TL

    // Update customer
    await supabase
        .from("coffee_loyalty_customers")
        .update({
            stamps_earned: customer.stamps_earned + stampsEarned,
            stamps_total: customer.stamps_total + stampsEarned,
            points_balance: customer.points_balance + pointsEarned,
            points_earned: customer.points_earned + pointsEarned,
            total_spent: customer.total_spent + totalAmount,
            visits_count: customer.visits_count + 1,
            last_visit_at: new Date().toISOString()
        })
        .eq("id", customer.id);

    // Create transaction record
    await supabase.from("coffee_loyalty_transactions").insert({
        business_id: businessId,
        customer_id: customer.id,
        order_id: orderId,
        transaction_type: "stamps_earned",
        stamps_change: stampsEarned,
        points_change: pointsEarned,
        stamps_before: customer.stamps_earned,
        stamps_after: customer.stamps_earned + stampsEarned,
        points_before: customer.points_balance,
        points_after: customer.points_balance + pointsEarned,
        description: `Order ${orderId}`
    });

    // Check for free drink
    const settings = await supabase
        .from("coffee_settings")
        .select("stamps_for_free_drink")
        .eq("business_id", businessId)
        .single();

    if (settings?.stamps_for_free_drink && 
        (customer.stamps_total + stampsEarned) >= settings.stamps_for_free_drink) {
        await supabase
            .from("coffee_loyalty_customers")
            .update({
                free_drinks_earned: customer.free_drinks_earned + 1,
                stamps_total: 0 // Reset stamps
            })
            .eq("id", customer.id);
    }
}

// Admin: Get orders
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get("business_id");
        const status = searchParams.get("status");

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "Business ID required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        let query = supabase
            .from("coffee_orders")
            .select("*, coffee_order_items(*)")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false });

        if (status) {
            query = query.eq("status", status);
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data: orders });
    } catch (error) {
        console.error("[Coffee Orders GET] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch orders" },
            { status: 500 }
        );
    }
}
