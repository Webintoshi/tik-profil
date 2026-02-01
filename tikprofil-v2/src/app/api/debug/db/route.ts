// Debug API - View all database contents (TEMPORARY - Remove in production)
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

export async function GET() {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Fetch all relevant collections
        const supabase = getSupabaseAdmin();

        const [
            businesses,
            businessOwners,
            roomTypes,
            hotelRooms,
            activeModules,
            industryDefinitions,
            ffProductsResult,
            ffCategoriesResult,
            ffExtraGroupsResult,
            ffExtrasResult,
        ] = await Promise.all([
            getCollectionREST('businesses'),
            getCollectionREST('business_owners'),
            getCollectionREST('room_types'),
            getCollectionREST('hotel_rooms'),
            getCollectionREST('active_modules'),
            getCollectionREST('industry_definitions'),
            supabase.from('ff_products').select('*'),
            supabase.from('ff_categories').select('*'),
            supabase.from('ff_extra_groups').select('*'),
            supabase.from('ff_extras').select('*'),
        ]);

        if (ffProductsResult.error || ffCategoriesResult.error || ffExtraGroupsResult.error || ffExtrasResult.error) {
            throw ffProductsResult.error || ffCategoriesResult.error || ffExtraGroupsResult.error || ffExtrasResult.error;
        }

        const ffProducts = ffProductsResult.data || [];
        const ffCategories = ffCategoriesResult.data || [];
        const ffExtraGroups = ffExtraGroupsResult.data || [];
        const ffExtras = ffExtrasResult.data || [];

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                businesses: {
                    count: businesses.length,
                    items: businesses.map(b => ({
                        id: b.id,
                        name: b.name,
                        slug: b.slug,
                        email: b.email,
                        industry: b.industry_label || b.industry_id,
                        status: b.status
                    }))
                },
                business_owners: {
                    count: businessOwners.length,
                    items: businessOwners.map(o => ({
                        id: o.id,
                        email: o.email,
                        business_id: o.business_id,
                        full_name: o.full_name
                    }))
                },
                ff_products: {
                    count: ffProducts.length,
                    items: ffProducts.map(p => ({
                        id: p.id,
                        name: p.name,
                        businessId: p.business_id,
                        categoryId: p.category_id,
                        price: p.price,
                        isActive: p.is_active,
                        inStock: p.in_stock
                    }))
                },
                ff_categories: {
                    count: ffCategories.length,
                    items: ffCategories.map(c => ({
                        id: c.id,
                        name: c.name,
                        businessId: c.business_id,
                        icon: c.icon,
                        isActive: c.is_active
                    }))
                },
                ff_extra_groups: {
                    count: ffExtraGroups.length,
                    items: ffExtraGroups
                },
                ff_extras: {
                    count: ffExtras.length,
                    items: ffExtras
                },
                room_types: {
                    count: roomTypes.length,
                    items: roomTypes
                },
                hotel_rooms: {
                    count: hotelRooms.length,
                    items: hotelRooms
                },
                active_modules: {
                    count: activeModules.length,
                    items: activeModules.map(m => ({
                        id: m.id,
                        businessId: m.businessId,
                        moduleId: m.moduleId
                    }))
                },
                industry_definitions: {
                    count: industryDefinitions.length,
                    items: industryDefinitions.map(i => ({
                        id: i.id,
                        name: i.name,
                        slug: i.slug
                    }))
                }
            }
        });
    } catch (error) {
        console.error('[Debug DB] Error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
