// Public Fast Food Menu API - No authentication required
// PERFORMANCE OPTIMIZED: Parallel fetching with Promise.all
// Original sequential version preserved as comments for rollback
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Get public menu (categories + products + extras) for a business
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');
        const tableId = searchParams.get('tableId');

        if (!businessSlug) {
            return NextResponse.json({ success: false, error: 'businessSlug required' }, { status: 400 });
        }

        // STEP 1: First get business (required for businessId)
        const supabase = getSupabaseAdmin();
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, slug, phone, whatsapp, logo')
            .ilike('slug', businessSlug)
            .order('created_at', { ascending: true });

        if (businessError) {
            throw businessError;
        }

        const matchingBusinesses = businesses || [];
        const business = matchingBusinesses[matchingBusinesses.length - 1];

        if (!business) {
            return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
        }

        const businessId = business.id as string;

        // Get table info if tableId is provided
        let tableName = null;
        if (tableId) {
            const { data: tableData } = await supabase
                .from('fb_tables')
                .select('name')
                .eq('id', tableId)
                .maybeSingle();
            tableName = tableData?.name || null;
        }

        // ============================================
        // PERFORMANCE OPTIMIZATION: Parallel fetching
        // All 6 collections fetched simultaneously
        // Expected improvement: 5-6s → 1-2s
        // ============================================
        const [
            categoriesResult,
            productsResult,
            groupsResult,
            extrasResult,
            campaignsResult,
            settingsResult
        ] = await Promise.all([
            supabase.from('ff_categories').select('*').eq('business_id', businessId),
            supabase.from('ff_products').select('*').eq('business_id', businessId),
            supabase.from('ff_extra_groups').select('*').eq('business_id', businessId),
            supabase.from('ff_extras').select('*'),
            supabase.from('ff_campaigns').select('*').eq('business_id', businessId),
            supabase.from('ff_settings').select('*').eq('business_id', businessId).maybeSingle()
        ]);

        if (categoriesResult.error || productsResult.error || groupsResult.error || extrasResult.error || campaignsResult.error || settingsResult.error) {
            throw categoriesResult.error || productsResult.error || groupsResult.error || extrasResult.error || campaignsResult.error || settingsResult.error;
        }

        const allCategories = categoriesResult.data || [];
        const allProducts = productsResult.data || [];
        const allExtraGroups = groupsResult.data || [];
        const allExtras = extrasResult.data || [];
        const allCampaigns = campaignsResult.data || [];
        const settings = settingsResult.data || null;

        /* ============================================
         * ORIGINAL SEQUENTIAL VERSION (for rollback):
         * ============================================
         * const allCategories = await getCollectionREST('ff_categories');
         * const allProducts = await getCollectionREST('ff_products');
         * const allExtraGroups = await getCollectionREST('ff_extra_groups');
         * const allExtras = await getCollectionREST('ff_extras');
         * const allCampaigns = await getCollectionREST('ff_campaigns');
         * const settings = await getDocumentREST('ff_settings', businessId);
         * ============================================
         */

        // Process categories
        const categories = allCategories
            .filter(cat => cat.business_id === businessId && cat.is_active !== false)
            .map(cat => ({
                id: cat.id,
                name: cat.name,
                icon: cat.icon || '🍔',
                emoji: cat.icon || '🍔',
                sortOrder: cat.sort_order || 0,
                isActive: true,
            }))
            .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

        // Process products
        const productsForBusiness = allProducts.filter(p => p.business_id === businessId);
        const uniqueBusinessIds = [...new Set(allProducts.map(p => p.business_id))];
        const products = productsForBusiness
            .filter(p => p.is_active !== false && p.in_stock !== false)
            .map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                price: Number(p.price) || 0,
                categoryId: p.category_id,
                imageUrl: p.image_url || '',
                image: p.image_url || '',
                sortOrder: p.sort_order || 0,
                isActive: true,
                inStock: true,
                extraGroupIds: p.extra_group_ids || [],
            }))
            .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

        // Process extra groups
        const extraGroups = allExtraGroups
            .filter(g => g.business_id === businessId && g.is_active !== false)
            .map(group => ({
                id: group.id,
                name: group.name,
                selectionType: group.selection_type || 'single',
                isRequired: group.is_required || false,
                maxSelections: group.max_selections || 1,
                sortOrder: group.sort_order || 0,
                extras: allExtras
                    .filter(e => e.group_id === group.id && e.is_active !== false)
                    .map(e => ({
                        id: e.id,
                        groupId: e.group_id,
                        name: e.name,
                        priceModifier: Number(e.price_modifier) || 0,
                        isDefault: e.is_default || false,
                        imageUrl: e.image_url || '',
                        sortOrder: e.sort_order || 0,
                    }))
                    .sort((a, b) => ((a as any).sortOrder || 0) - ((b as any).sortOrder || 0))
            }))
            .sort((a, b) => ((a as any).sortOrder || 0) - ((b as any).sortOrder || 0));

        // Process campaigns
        const now = new Date();
        const campaigns = allCampaigns
            .filter(c => c.business_id === businessId && c.is_active !== false)
            .filter(c => {
                if (c.valid_until) {
                    const validDate = new Date(c.valid_until as string);
                    return validDate >= now;
                }
                return true;
            })
            .map(c => ({
                id: c.id,
                title: c.title,
                description: c.description || '',
                emoji: c.emoji || '🔥',
                isActive: true,
                validUntil: c.valid_until || null,
            }))
            .sort((a, b) => ((a as any).sortOrder || 0) - ((b as any).sortOrder || 0));

        // Process settings
        const minOrderAmount = Number(settings?.min_order_amount) || 0;
        const deliveryFee = Number(settings?.delivery_fee) || 0;
        const freeDeliveryAbove = Number(settings?.free_delivery_above) || 0;
        const pickupEnabled = settings?.pickup_enabled !== false;
        const deliveryEnabled = settings?.delivery_enabled !== false;
        const cashPayment = settings?.cash_payment !== false;
        const cardOnDelivery = settings?.card_on_delivery !== false;
        const estimatedDeliveryTime = settings?.estimated_delivery_time || '30-45 dk';
        const businessLogoUrl = settings?.business_logo_url || business.logo || '';

        return NextResponse.json({
            success: true,
            data: {
                businessId,
                categories,
                products,
                extraGroups,
                campaigns,
                businessName: business.name,
                businessLogoUrl,
                whatsapp: business.whatsapp || business.phone,
                whatsappNumber: business.whatsapp || business.phone,
                tableName,
                minOrderAmount,
                deliveryFee,
                freeDeliveryAbove,
                pickupEnabled,
                deliveryEnabled,
                cashPayment,
                cardOnDelivery,
                estimatedDeliveryTime,
                workingHours: settings?.working_hours || null,
                useBusinessHours: settings?.use_business_hours !== false,
                _debug: {
                    matchingBusinessesCount: matchingBusinesses.length,
                    usedBusinessId: businessId,
                    totalProductsInDb: allProducts.length,
                    productsForThisBusiness: productsForBusiness.length,
                    uniqueBusinessIdsInProducts: uniqueBusinessIds,
                    extraGroupsCount: extraGroups.length,
                    campaignsCount: campaigns.length,
                    optimizationEnabled: true, // Flag to verify optimization is active
                }
            }
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error('[Public FF Menu] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
