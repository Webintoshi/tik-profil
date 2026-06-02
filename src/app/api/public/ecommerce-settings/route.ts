import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { publicReadOnly, resolvePublicBusinessContext } from "@/server/auth/guards";

const TABLE = "ecommerce_settings";

function getDefaultSettings(businessId: string) {
    return {
        id: businessId,
        storeName: "Magazam",
        storeDescription: "",
        currency: "TRY",
        minOrderAmount: 0,
        freeShippingThreshold: undefined,
        taxRate: 0,
        shippingOptions: [
            {
                id: "standard",
                name: "Standart Kargo",
                price: 50,
                estimatedDays: "2-4 is gunu",
                isActive: true,
            },
        ],
        paymentMethods: {
            cash: true,
            card: false,
            transfer: false,
            online: false,
        },
        checkoutSettings: {
            requirePhone: true,
            requireEmail: false,
            requireAddress: true,
            allowNotes: true,
        },
    };
}

export async function GET(request: NextRequest) {
    try {
        publicReadOnly();

        const businessContext = await resolvePublicBusinessContext({
            businessId: request.nextUrl.searchParams.get("businessId"),
        });

        if (!businessContext?.businessId) {
            return NextResponse.json({ error: "Business ID required" }, { status: 400 });
        }
        const businessId = businessContext.businessId;

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select("*")
            .eq("business_id", businessId)
            .single();

        if (error || !data) {
            return NextResponse.json(getDefaultSettings(businessId));
        }

        return NextResponse.json({
            id: businessId,
            storeName: data.store_name || "Magazam",
            storeDescription: data.store_description || "",
            currency: data.currency || "TRY",
            minOrderAmount: typeof data.min_order_amount === "string" ? parseFloat(data.min_order_amount) : (data.min_order_amount || 0),
            freeShippingThreshold: data.free_shipping_threshold ? (typeof data.free_shipping_threshold === "string" ? parseFloat(data.free_shipping_threshold) : data.free_shipping_threshold) : undefined,
            taxRate: typeof data.tax_rate === "string" ? parseFloat(data.tax_rate) : (data.tax_rate || 0),
            shippingOptions: data.shipping_options || [],
            paymentMethods: data.payment_methods || {
                cash: true,
                card: false,
                transfer: false,
                online: false,
            },
            checkoutSettings: data.checkout_settings || {
                requirePhone: true,
                requireEmail: false,
                requireAddress: true,
                allowNotes: true,
            },
        });
    } catch (error) {
        console.error("[Public Ecommerce Settings GET Error]:", error);
        return NextResponse.json(
            { error: "Ayarlar alinirken hata olustu" },
            { status: 500 }
        );
    }
}
