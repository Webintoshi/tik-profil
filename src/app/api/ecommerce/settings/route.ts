import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { settingsSchema } from "@/types/ecommerce";
import { assertBusinessMember } from "@/server/auth/guards";

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
        orderNotifications: {
            email: false,
            whatsapp: true,
        },
        stockSettings: {
            trackStock: true,
            allowBackorder: false,
            lowStockThreshold: 5,
        },
        checkoutSettings: {
            requirePhone: true,
            requireEmail: false,
            requireAddress: true,
            allowNotes: true,
        },
    };
}

function mapSettings(data: Record<string, any>, businessId: string) {
    return {
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
        orderNotifications: data.order_notifications || {
            email: false,
            whatsapp: true,
        },
        stockSettings: data.stock_settings || {
            trackStock: true,
            allowBackorder: false,
            lowStockThreshold: 5,
        },
        checkoutSettings: data.checkout_settings || {
            requirePhone: true,
            requireEmail: false,
            requireAddress: true,
            allowNotes: true,
        },
    };
}

export async function GET() {
    try {
        const { businessId } = await assertBusinessMember();
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select("*")
            .eq("business_id", businessId)
            .single();

        if (error || !data) {
            return NextResponse.json(getDefaultSettings(businessId));
        }

        return NextResponse.json(mapSettings(data, businessId));
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Settings GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const { businessId: _ignoredBusinessId, ...settingsData } = body;
        const validationResult = settingsSchema.safeParse(settingsData);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Gecersiz veri", details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const validData = validationResult.data;
        const supabase = getSupabaseAdmin();
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select("business_id")
            .eq("business_id", businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        const dataToSave = {
            business_id: businessId,
            store_name: validData.storeName || "Magazam",
            store_description: validData.storeDescription || null,
            currency: validData.currency || "TRY",
            min_order_amount: validData.minOrderAmount || 0,
            free_shipping_threshold: validData.freeShippingThreshold || null,
            tax_rate: validData.taxRate || 0,
            shipping_options: validData.shippingOptions || [],
            payment_methods: validData.paymentMethods || {
                cash: true,
                card: false,
                transfer: false,
                online: false,
            },
            order_notifications: validData.orderNotifications || {
                email: false,
                whatsapp: true,
            },
            stock_settings: validData.stockSettings || {
                trackStock: true,
                allowBackorder: false,
                lowStockThreshold: 5,
            },
            checkout_settings: validData.checkoutSettings || {
                requirePhone: true,
                requireEmail: false,
                requireAddress: true,
                allowNotes: true,
            },
        };

        if (existingData) {
            const { error: updateError } = await supabase
                .from(TABLE)
                .update(dataToSave)
                .eq("business_id", businessId);

            if (updateError) {
                throw updateError;
            }
        } else {
            const { error: insertError } = await supabase
                .from(TABLE)
                .insert(dataToSave);

            if (insertError) {
                throw insertError;
            }
        }

        return NextResponse.json({
            success: true,
            message: "Ayarlar guncellendi",
        });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Settings POST");
    }
}
