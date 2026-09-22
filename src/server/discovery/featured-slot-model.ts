import type {
    CategoryPageCursor,
    FeaturedSlotInput,
    FeaturedSlotInventoryItem,
    FeaturedSlotStatus,
} from "./category-page.types.ts";

const FEATURED_POSITIONS = [1, 2, 3, 4, 5] as const;
const FEATURED_STATUSES = new Set<FeaturedSlotStatus>([
    "scheduled",
    "active",
    "paused",
    "cancelled",
]);

function requireText(value: unknown, label: string): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${label} zorunludur.`);
    }
    return value.trim();
}

function parseDate(value: unknown, label: string): Date {
    const text = requireText(value, label);
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label} geçerli bir tarih olmalıdır.`);
    }
    return date;
}

export function validateFeaturedSlotInput(input: FeaturedSlotInput): FeaturedSlotInput {
    const position = Number(input.position);
    if (!Number.isInteger(position) || position < 1 || position > 5) {
        throw new Error("Vitrin pozisyonu 1 ile 5 arasında olmalıdır.");
    }

    if (!FEATURED_STATUSES.has(input.status)) {
        throw new Error("Vitrin durumu geçersizdir.");
    }

    const startsAt = parseDate(input.startsAt, "Başlangıç tarihi");
    const endsAt = parseDate(input.endsAt, "Bitiş tarihi");
    if (endsAt.getTime() <= startsAt.getTime()) {
        throw new Error("Bitiş tarihi başlangıç tarihinden sonra olmalıdır.");
    }

    return {
        ...input,
        businessId: requireText(input.businessId, "İşletme"),
        childCategoryId: requireText(input.childCategoryId, "Alt kategori"),
        city: requireText(input.city, "Şehir"),
        position,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        createdBy: input.createdBy?.trim() || null,
    };
}

export function encodeCategoryCursor(cursor: CategoryPageCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCategoryCursor(value: string | null | undefined): CategoryPageCursor | null {
    if (!value) {
        return null;
    }

    try {
        const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<CategoryPageCursor>;
        if (typeof decoded.id !== "string" || !decoded.id || typeof decoded.score !== "number" || !Number.isFinite(decoded.score)) {
            return null;
        }
        return { id: decoded.id, score: decoded.score };
    } catch {
        return null;
    }
}

export function buildFiveSlotInventory<TAssignment extends { position: number }>(
    assignments: readonly TAssignment[],
): Array<FeaturedSlotInventoryItem<TAssignment>> {
    const byPosition = new Map(assignments.map((assignment) => [assignment.position, assignment]));
    return FEATURED_POSITIONS.map((position) => ({
        position,
        assignment: byPosition.get(position) ?? null,
    }));
}
