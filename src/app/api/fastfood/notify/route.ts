import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { getSessionSecretBytes } from "@/lib/env";
import { prepareStoredFastFoodOrderNotification } from "@/server/fastfood/order-notification-repository";
import type { FastFoodNotificationStatus } from "@/server/fastfood/order-notification";

async function getBusinessId(): Promise<string | null> {
    try {
        const token = (await cookies()).get("tikprofil_owner_session")?.value;
        if (!token) return null;
        const { payload } = await jwtVerify(token, getSessionSecretBytes());
        return typeof payload.businessId === "string" ? payload.businessId : null;
    } catch {
        return null;
    }
}

function isStatus(value: unknown): value is FastFoodNotificationStatus {
    return value === "pending" || value === "preparing" || value === "on_way" || value === "delivered";
}

export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const body = await request.json() as Record<string, unknown>;
        if (typeof body.orderId !== "string" || !body.orderId || !isStatus(body.status)) {
            return NextResponse.json({ success: false, error: "orderId and valid status required" }, { status: 400 });
        }

        const result = await prepareStoredFastFoodOrderNotification({
            businessId,
            orderId: body.orderId,
            status: body.status,
        });
        if (!result.success) {
            return NextResponse.json(result, { status: result.error === "ORDER_NOT_FOUND" ? 404 : 400 });
        }
        return NextResponse.json(result);
    } catch {
        console.error("[FastFood Notification] request failed");
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
