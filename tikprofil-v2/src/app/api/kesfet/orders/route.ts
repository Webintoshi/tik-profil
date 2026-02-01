import { NextResponse } from "next/server";
import { createDocumentREST, getDocumentREST } from "@/lib/documentStore";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const COLLECTION = "kesfet_orders";

// GET /api/kesfet/orders - List user's orders
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = request.headers.get("x-user-id"); // From auth middleware
        const status = searchParams.get("status");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = getSupabaseClient();

        const statusFilter =
            status && status !== "all"
                ? status === "active"
                    ? ["pending", "confirmed", "preparing", "ready", "delivering"]
                    : status === "completed"
                        ? ["delivered"]
                        : status === "cancelled"
                            ? ["cancelled"]
                            : null
                : null;

        let queryBuilder = supabase
            .from("app_documents")
            .select("id,data", { count: "exact" })
            .eq("collection", COLLECTION)
            .eq("data->>userId", userId);

        if (statusFilter) {
            queryBuilder = queryBuilder.in("data->>status", statusFilter);
        }

        const startIndex = (page - 1) * limit;
        const { data, error, count } = await queryBuilder.range(startIndex, startIndex + limit - 1);
        if (error) throw error;

        const orders = (data || []).map((row: any) => {
            const o = row.data as Record<string, unknown>;
            return {
                id: row.id as string,
                userId: o.userId as string,
                businessId: o.businessId as string,
                businessName: o.businessName as string,
                businessLogo: o.businessLogo as string | undefined,
                items: o.items as Array<{
                    productId: string;
                    name: string;
                    quantity: number;
                    unitPrice: number;
                    totalPrice: number;
                }>,
                subtotal: o.subtotal as number,
                deliveryFee: o.deliveryFee as number,
                discount: o.discount as number,
                total: o.total as number,
                status: o.status as string,
                paymentMethod: o.paymentMethod as string,
                paymentStatus: o.paymentStatus as string,
                createdAt: o.createdAt as string,
                estimatedDelivery: o.estimatedDelivery as string | undefined,
            };
        });

        return NextResponse.json({
            success: true,
            data: orders,
            total: count || orders.length,
            page,
            limit,
            hasMore: startIndex + limit < (count || 0),
        });
    } catch (error) {
        console.error("[Orders API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

// POST /api/kesfet/orders - Create new order
export async function POST(request: Request) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { businessId, items, deliveryAddressId, paymentMethod, notes } = body;

        if (!businessId || !items?.length || !deliveryAddressId || !paymentMethod) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get business details
        const business = await getDocumentREST("businesses", businessId);
        if (!business) {
            return NextResponse.json(
                { success: false, error: "Business not found" },
                { status: 404 }
            );
        }

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: { totalPrice: number }) =>
            sum + item.totalPrice, 0
        );
        const deliveryFee = 15; // TODO: Calculate based on distance
        const total = subtotal + deliveryFee;

        const orderData = {
            userId,
            businessId,
            businessName: business.name || "İşletme",
            businessLogo: business.logo || null,
            items,
            subtotal,
            deliveryFee,
            discount: 0,
            total,
            status: "pending",
            paymentMethod,
            paymentStatus: paymentMethod === "wallet" ? "paid" : "pending",
            notes: notes || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const orderId = await createDocumentREST(COLLECTION, orderData);

        return NextResponse.json({
            success: true,
            data: { id: orderId, ...orderData },
            message: "Sipariş oluşturuldu",
        });
    } catch (error) {
        console.error("[Orders API] Create error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
