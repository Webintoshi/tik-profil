export interface PublicMenuExtraRow {
    id: string;
    group_id: string | null;
    name: string;
    price_modifier: number | string | null;
    is_default: boolean | null;
    image_url: string | null;
    sort_order: number | null;
    is_active: boolean | null;
}

export interface PublicMenuExtra {
    id: string;
    groupId: string;
    name: string;
    priceModifier: number;
    isDefault: boolean;
    image: string;
    order: number;
}

export function filterAndMapPublicMenuExtras(
    extras: PublicMenuExtraRow[],
    allowedGroupIds: Iterable<string>,
): PublicMenuExtra[] {
    const allowedGroupIdSet = new Set(allowedGroupIds);

    return extras
        .filter((extra) => Boolean(extra.group_id) && allowedGroupIdSet.has(extra.group_id as string))
        .filter((extra) => extra.is_active !== false)
        .map((extra) => ({
            id: extra.id,
            groupId: extra.group_id as string,
            name: extra.name,
            priceModifier: Number(extra.price_modifier) || 0,
            isDefault: extra.is_default || false,
            image: extra.image_url || "",
            order: extra.sort_order || 0,
        }));
}
