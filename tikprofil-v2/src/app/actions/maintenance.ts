"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
    getCollectionREST,
    deleteDocumentREST,
    deleteByFieldREST
} from "@/lib/documentStore";
import { getSupabaseAdmin } from "@/lib/supabase";

// Cache purge action
export async function purgeCache(): Promise<{ success: boolean; duration: number }> {
    const start = performance.now();

    try {
        // Revalidate all paths
        revalidatePath("/", "layout");
        revalidatePath("/dashboard", "layout");

        // Revalidate tags
        revalidateTag("public-data");
        revalidateTag("businesses");
        revalidateTag("modules");

        const duration = performance.now() - start;

        return { success: true, duration: Math.round(duration) };
    } catch (error) {
        console.error("Cache purge error:", error);
        return { success: false, duration: 0 };
    }
}

interface OrphanRecord {
    collection: string;
    id: string;
    name?: string;
    businessId: string;
}

// Scan for orphan data - finds records linked to non-existent businesses
export async function scanOrphanData(): Promise<{
    success: boolean;
    count: number;
    sizeBytes: number;
    files: string[]; // Actually orphan record IDs in format "collection:id"
    details?: OrphanRecord[];
}> {
    try {
        // Get all existing business IDs
        const businesses = await getCollectionREST("businesses");
        const validBusinessIds = new Set(businesses.map(b => b.id as string));
        const supabase = getSupabaseAdmin();
        // Collect orphan records
        const orphanRecords: OrphanRecord[] = [];

        // Check ff_products
        const { data: ffProductsData, error: ffProductsError } = await supabase
            .from('ff_products')
            .select('id, name, business_id');
        if (ffProductsError) throw ffProductsError;
        for (const p of ffProductsData || []) {
            const businessId = p.business_id as string;
            if (businessId && !validBusinessIds.has(businessId)) {
                orphanRecords.push({
                    collection: "ff_products",
                    id: p.id as string,
                    name: p.name as string,
                    businessId
                });
            }
        }
        // Check ff_categories
        const { data: ffCategoriesData, error: ffCategoriesError } = await supabase
            .from('ff_categories')
            .select('id, name, business_id');
        if (ffCategoriesError) throw ffCategoriesError;
        const catOrphans = (ffCategoriesData || []).filter(c => c.business_id && !validBusinessIds.has(c.business_id as string));
        for (const c of catOrphans) {
            orphanRecords.push({
                collection: "ff_categories",
                id: c.id as string,
                name: c.name as string,
                businessId: c.business_id as string
            });
        }
        // Check ff_extra_groups
        const { data: ffExtraGroupsData, error: ffExtraGroupsError } = await supabase
            .from('ff_extra_groups')
            .select('id, name, business_id');
        if (ffExtraGroupsError) throw ffExtraGroupsError;
        const groupOrphans = (ffExtraGroupsData || []).filter(g => g.business_id && !validBusinessIds.has(g.business_id as string));
        const extraGroupBusinessMap = new Map(
            (ffExtraGroupsData || []).map(group => [group.id as string, group.business_id as string])
        );
        for (const g of groupOrphans) {
            orphanRecords.push({
                collection: "ff_extra_groups",
                id: g.id as string,
                name: g.name as string,
                businessId: g.business_id as string
            });
        }

        // Check ff_extras
        const { data: ffExtrasData, error: ffExtrasError } = await supabase
            .from('ff_extras')
            .select('id, name, group_id');
        if (ffExtrasError) throw ffExtrasError;
        const extraOrphans = (ffExtrasData || []).filter(extra => {
            const groupBusinessId = extraGroupBusinessMap.get(extra.group_id as string);
            return groupBusinessId && !validBusinessIds.has(groupBusinessId);
        });
        for (const e of extraOrphans) {
            orphanRecords.push({
                collection: "ff_extras",
                id: e.id as string,
                name: e.name as string,
                businessId: extraGroupBusinessMap.get(e.group_id as string) as string
            });
        }

        // Check room_types
        const roomTypes = await getCollectionREST("room_types");
        const roomOrphans = roomTypes.filter(r => r.businessId && !validBusinessIds.has(r.businessId as string));
        for (const r of roomOrphans) {
            orphanRecords.push({
                collection: "room_types",
                id: r.id as string,
                name: r.name as string,
                businessId: r.businessId as string
            });
        }

        // Check hotel_rooms
        const hotelRooms = await getCollectionREST("hotel_rooms");
        const hotelOrphans = hotelRooms.filter(h => h.businessId && !validBusinessIds.has(h.businessId as string));
        for (const h of hotelOrphans) {
            orphanRecords.push({
                collection: "hotel_rooms",
                id: h.id as string,
                name: h.roomNumber as string || h.name as string,
                businessId: h.businessId as string
            });
        }

        // Check active_modules
        const activeModules = await getCollectionREST("active_modules");
        const moduleOrphans = activeModules.filter(m => m.businessId && !validBusinessIds.has(m.businessId as string));
        for (const m of moduleOrphans) {
            orphanRecords.push({
                collection: "active_modules",
                id: m.id as string,
                name: m.moduleId as string,
                businessId: m.businessId as string
            });
        }

        // Check business_owners for orphaned owners
        const businessOwners = await getCollectionREST("business_owners");
        const ownerOrphans = businessOwners.filter(o => o.business_id && !validBusinessIds.has(o.business_id as string));
        for (const o of ownerOrphans) {
            orphanRecords.push({
                collection: "business_owners",
                id: o.id as string,
                name: o.email as string,
                businessId: o.business_id as string
            });
        }
        // Format files array as "collection:id"
        const files = orphanRecords.map(r => `${r.collection}:${r.id}`);

        return {
            success: true,
            count: orphanRecords.length,
            sizeBytes: orphanRecords.length * 1024, // Estimate ~1KB per record
            files,
            details: orphanRecords
        };
    } catch (error) {
        console.error("[Orphan Scan] Error:", error);
        return {
            success: false,
            count: 0,
            sizeBytes: 0,
            files: []
        };
    }
}

// Clean orphan data - actually deletes the orphan records from document store
export async function cleanOrphanData(files: string[]): Promise<{ success: boolean; cleaned: number }> {
    let cleaned = 0;

    try {
        const supabase = getSupabaseAdmin();
        for (const file of files) {
            const [collection, id] = file.split(":");
            if (collection && id) {
                try {
                    if (collection.startsWith("ff_") || collection.startsWith("fb_")) {
                        const filterColumn = collection === "ff_settings" || collection === "fb_settings" ? "business_id" : "id";
                        const { error } = await supabase
                            .from(collection)
                            .delete()
                            .eq(filterColumn, id);
                        if (error) throw error;
                    } else {
                        await deleteDocumentREST(collection, id);
                    }
                    cleaned++;
                } catch (err) {
                    console.error(`[Orphan Clean] Failed to delete ${collection}/${id}:`, err);
                }
            }
        }
        return {
            success: true,
            cleaned
        };
    } catch (error) {
        console.error("[Orphan Clean] Error:", error);
        return {
            success: false,
            cleaned
        };
    }
}
