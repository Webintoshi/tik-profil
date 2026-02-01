// Debug API - Scan for orphan data
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCollectionREST } from '@/lib/documentStore';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

export const dynamic = 'force-dynamic';

const getJwtSecret = () => getSessionSecretBytes();

async function isAdmin(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_session")?.value;
        if (!token) return false;

        await jwtVerify(token, getJwtSecret());
        return true;
    } catch {
        return false;
    }
}

interface OrphanRecord {
    collection: string;
    id: string;
    name?: string;
    businessId: string;
}

export async function GET() {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Get all existing business IDs
        const businesses = await getCollectionREST("businesses");
        const validBusinessIds = new Set(businesses.map(b => b.id as string));
        const supabase = getSupabaseAdmin();

        const orphanRecords: OrphanRecord[] = [];

        // Check ff_products
        const { data: ffProductsData, error: ffProductsError } = await supabase
            .from('ff_products')
            .select('id, name, business_id');
        if (ffProductsError) throw ffProductsError;
        for (const p of ffProductsData || []) {
            if (p.business_id && !validBusinessIds.has(p.business_id as string)) {
                orphanRecords.push({
                    collection: "ff_products",
                    id: p.id as string,
                    name: p.name as string,
                    businessId: p.business_id as string
                });
            }
        }

        // Check ff_categories
        const { data: ffCategoriesData, error: ffCategoriesError } = await supabase
            .from('ff_categories')
            .select('id, name, business_id');
        if (ffCategoriesError) throw ffCategoriesError;
        for (const c of ffCategoriesData || []) {
            if (c.business_id && !validBusinessIds.has(c.business_id as string)) {
                orphanRecords.push({
                    collection: "ff_categories",
                    id: c.id as string,
                    name: c.name as string,
                    businessId: c.business_id as string
                });
            }
        }

        // Check ff_extra_groups
        const { data: ffExtraGroupsData, error: ffExtraGroupsError } = await supabase
            .from('ff_extra_groups')
            .select('id, name, business_id');
        if (ffExtraGroupsError) throw ffExtraGroupsError;
        const extraGroupBusinessMap = new Map(
            (ffExtraGroupsData || []).map(group => [group.id as string, group.business_id as string])
        );
        for (const g of ffExtraGroupsData || []) {
            if (g.business_id && !validBusinessIds.has(g.business_id as string)) {
                orphanRecords.push({
                    collection: "ff_extra_groups",
                    id: g.id as string,
                    name: g.name as string,
                    businessId: g.business_id as string
                });
            }
        }

        // Check ff_extras
        const { data: ffExtrasData, error: ffExtrasError } = await supabase
            .from('ff_extras')
            .select('id, name, group_id');
        if (ffExtrasError) throw ffExtrasError;
        for (const e of ffExtrasData || []) {
            const groupBusinessId = extraGroupBusinessMap.get(e.group_id as string);
            if (groupBusinessId && !validBusinessIds.has(groupBusinessId)) {
                orphanRecords.push({
                    collection: "ff_extras",
                    id: e.id as string,
                    name: e.name as string,
                    businessId: groupBusinessId
                });
            }
        }

        // Check room_types
        const roomTypes = await getCollectionREST("room_types");
        for (const r of roomTypes) {
            if (r.businessId && !validBusinessIds.has(r.businessId as string)) {
                orphanRecords.push({
                    collection: "room_types",
                    id: r.id as string,
                    name: r.name as string,
                    businessId: r.businessId as string
                });
            }
        }

        // Check hotel_rooms
        const hotelRooms = await getCollectionREST("hotel_rooms");
        for (const h of hotelRooms) {
            if (h.businessId && !validBusinessIds.has(h.businessId as string)) {
                orphanRecords.push({
                    collection: "hotel_rooms",
                    id: h.id as string,
                    name: (h.roomNumber || h.name) as string,
                    businessId: h.businessId as string
                });
            }
        }

        // Check active_modules
        const activeModules = await getCollectionREST("active_modules");
        for (const m of activeModules) {
            if (m.businessId && !validBusinessIds.has(m.businessId as string)) {
                orphanRecords.push({
                    collection: "active_modules",
                    id: m.id as string,
                    name: m.moduleId as string,
                    businessId: m.businessId as string
                });
            }
        }

        // Check business_owners
        const businessOwners = await getCollectionREST("business_owners");
        for (const o of businessOwners) {
            if (o.business_id && !validBusinessIds.has(o.business_id as string)) {
                orphanRecords.push({
                    collection: "business_owners",
                    id: o.id as string,
                    name: o.email as string,
                    businessId: o.business_id as string
                });
            }
        }

        // Group by businessId for better readability
        const byBusinessId: Record<string, OrphanRecord[]> = {};
        for (const record of orphanRecords) {
            if (!byBusinessId[record.businessId]) {
                byBusinessId[record.businessId] = [];
            }
            byBusinessId[record.businessId].push(record);
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalOrphans: orphanRecords.length,
                orphanBusinessIds: Object.keys(byBusinessId),
                validBusinessIds: Array.from(validBusinessIds)
            },
            orphansByBusinessId: byBusinessId,
            allOrphans: orphanRecords
        });
    } catch (error) {
        console.error('[Debug Orphans] Error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
