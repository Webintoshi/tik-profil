export type HotelRequestStatus =
    | "pending"
    | "in_progress"
    | "completed"
    | "cancelled";

export type HotelOrderStatus =
    | "pending"
    | "preparing"
    | "delivered"
    | "cancelled";

export interface HotelPanelRequest {
    id: string;
    roomNumber: string;
    requestType: string;
    requestLabel: string;
    message?: string;
    status: HotelRequestStatus;
    createdAt: string;
    completedAt?: string;
}

export interface HotelPanelOrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export interface HotelPanelOrder {
    id: string;
    roomNumber: string;
    items: HotelPanelOrderItem[];
    total: number;
    note?: string;
    status: HotelOrderStatus;
    createdAt: string;
    deliveredAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function toStringValue(value: unknown, fallback = ""): string {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

export function normalizeHotelRequestStatus(value: unknown): HotelRequestStatus {
    switch (value) {
        case "pending":
        case "in_progress":
        case "completed":
        case "cancelled":
            return value;
        default:
            return "pending";
    }
}

export function normalizeHotelOrderStatus(value: unknown): HotelOrderStatus {
    switch (value) {
        case "pending":
        case "preparing":
        case "delivered":
        case "cancelled":
            return value;
        default:
            return "pending";
    }
}

export function normalizeHotelPanelRequest(
    value: Partial<HotelPanelRequest>,
): HotelPanelRequest {
    return {
        id: toStringValue(value.id, ""),
        roomNumber: toStringValue(value.roomNumber, "-"),
        requestType: toStringValue(value.requestType, "other"),
        requestLabel: toStringValue(value.requestLabel, "Diger"),
        message: toStringValue(value.message),
        status: normalizeHotelRequestStatus(value.status),
        createdAt: toStringValue(value.createdAt, new Date(0).toISOString()),
        completedAt: toStringValue(value.completedAt),
    };
}

export function normalizeHotelOrderItems(
    value: unknown,
): HotelPanelOrderItem[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (!isRecord(item)) {
            return [];
        }

        const id = toStringValue(item.id);
        const name = toStringValue(item.name);
        const quantity = Math.max(1, Math.trunc(toNumberValue(item.quantity, 1)));
        const price = toNumberValue(item.price, 0);

        if (!id || !name) {
            return [];
        }

        return [{ id, name, quantity, price }];
    });
}

export function normalizeHotelPanelOrder(
    value: Partial<HotelPanelOrder> & { items?: unknown; total?: unknown },
): HotelPanelOrder {
    return {
        id: toStringValue(value.id, ""),
        roomNumber: toStringValue(value.roomNumber, "-"),
        items: normalizeHotelOrderItems(value.items),
        total: toNumberValue(value.total, 0),
        note: toStringValue(value.note),
        status: normalizeHotelOrderStatus(value.status),
        createdAt: toStringValue(value.createdAt, new Date(0).toISOString()),
        deliveredAt: toStringValue(value.deliveredAt),
    };
}
