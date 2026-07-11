import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { publicReadOnly, resolvePublicBusinessContext } from "@/server/auth/guards";

const TABLE = "ecommerce_settings";

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function finiteAmount(value: unknown): number | null {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function hasUsablePaymentMethod(value: unknown): value is Record<string, boolean> {
    if (!isRecord(value)) return false;
    return ["cash", "card", "transfer", "online"]
        .some((method) => value[method] === true);
}

function hasUsableShippingOption(value: unknown): value is Array<Record<string, unknown>> {
    if (!Array.isArray(value) || !value.length) return false;
    return value.some((raw) => {
        if (!isRecord(raw) || raw.isActive === false || typeof raw.id !== "string" || !raw.id.trim()) return false;
        return finiteAmount(raw.price ?? raw.fee) !== null;
    });
}

function hasUsableCheckoutSettings(value: unknown): value is Record<string, boolean> {
    if (!isRecord(value)) return false;
    return ["requirePhone", "requireEmail", "requireAddress", "allowNotes"]
        .every((field) => typeof value[field] === "boolean");
}

function unavailableSettingsResponse() {
    return NextResponse.json({ nativeEnabled: false, settings: null, success: true });
}

export async function GET(request: NextRequest) {
    try {
        publicReadOnly();
        const businessContext = resolvePublicBusinessContext({
            businessId: request.nextUrl.searchParams.get("businessId"),
        });
        if (!businessContext.businessId) {
            return NextResponse.json({ error: "Business ID required" }, { status: 400 });
        }
        const businessId = businessContext.businessId;
        const { data, error } = await getSupabaseAdmin()
            .from(TABLE)
            .select("*")
            .eq("business_id", businessId)
            .maybeSingle();
        if (error) throw error;
        if (!data || data.is_active !== true
            || !hasUsableShippingOption(data.shipping_options)
            || !hasUsablePaymentMethod(data.payment_methods)
            || !hasUsableCheckoutSettings(data.checkout_settings)) {
            return unavailableSettingsResponse();
        }

        const minOrderAmount = finiteAmount(data.min_order_amount);
        const taxRate = finiteAmount(data.tax_rate);
        const freeShippingThreshold = data.free_shipping_threshold == null
            ? null
            : finiteAmount(data.free_shipping_threshold);
        if (minOrderAmount === null || taxRate === null
            || (data.free_shipping_threshold != null && freeShippingThreshold === null)) {
            return unavailableSettingsResponse();
        }

        return NextResponse.json({
            nativeEnabled: true,
            settings: {
                checkoutSettings: data.checkout_settings,
                currency: data.currency || "TRY",
                freeShippingThreshold,
                id: businessId,
                minOrderAmount,
                paymentMethods: data.payment_methods,
                shippingOptions: data.shipping_options,
                storeDescription: data.store_description || "",
                storeName: data.store_name || "Magazam",
                taxRate,
            },
            success: true,
        });
    } catch (error) {
        console.error("[Public Ecommerce Settings GET] Unexpected error:", error);
        return NextResponse.json({ error: "Settings could not be loaded." }, { status: 500 });
    }
}
