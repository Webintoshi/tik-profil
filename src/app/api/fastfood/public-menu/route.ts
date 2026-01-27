// Public Fast Food Menu API - No authentication required
// PERFORMANCE OPTIMIZED: Parallel fetching with Promise.all
// SECURITY: Module verification to prevent Restaurant data in FastFood tables
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

        const supabase = getSupabaseAdmin();

        // STEP 1: First get business (required for businessId)
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, slug, phone, whatsapp, logo, active_module, industry_label')
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

        // SECURITY: Verify this is a FastFood business
        if (business.active_module && business.active_module !== 'fastfood') {
            console.error(`[FastFood Public Menu] Business ${businessId} has wrong module: ${business.active_module}`);
            return NextResponse.json({ 
                success: false, 
                error: 'Bu işletme FastFood modülünü kullanmıyor' 
            }, { status: 400 });
        }

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
                order: cat.sort_order || 0,
                icon: cat.icon || '🍔',
            }));

        // Process products
        const products = allProducts
            .filter(p => p.business_id === businessId && p.is_active !== false && p.in_stock !== false)
            .map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                price: Number(p.price) || 0,
                categoryId: p.category_id,
                image: p.image_url || '',
                inStock: p.in_stock !== false,
                order: p.sort_order || 0,
                extras: p.extra_group_ids || [],
                sizes: p.sizes || {},
                prepTime: p.prep_time || null,
                discountPrice: p.discount_price ? Number(p.discount_price) : null,
                discountUntil: p.discount_until ? new Date(p.discount_until) : null,
                calories: p.calories || null,
                spicyLevel: p.spicy_level || null,
                allergens: p.allergens || [],
            }));

        // Process extra groups
        const extraGroups = allExtraGroups
            .filter(eg => eg.business_id === businessId && eg.is_active !== false)
            .map(eg => ({
                id: eg.id,
                name: eg.name,
                selectionType: eg.selection_type || 'single',
                isRequired: eg.is_required || false,
                maxSelections: eg.max_selections || 1,
                order: eg.sort_order || 0,
            }));

        // Process extras
        const extras = allExtras
            .filter(e => e.is_active !== false)
            .map(e => ({
                id: e.id,
                groupId: e.group_id,
                name: e.name,
                priceModifier: Number(e.price_modifier) || 0,
                isDefault: e.is_default || false,
                image: e.image_url || '',
                order: e.sort_order || 0,
            }));

        // Process campaigns
        const campaigns = allCampaigns
            .filter(c => c.business_id === businessId && c.is_active !== false)
            .filter(c => !c.valid_until || new Date(c.valid_until) > new Date())
            .map(c => ({
                id: c.id,
                title: c.title,
                description: c.description || '',
                emoji: c.emoji || '🎉',
            }));

        // Process settings
        const businessSettings = {
            deliveryEnabled: settings?.delivery_enabled !== false,
            pickupEnabled: settings?.pickup_enabled !== false,
            minOrderAmount: Number(settings?.min_order_amount) || 0,
            deliveryFee: Number(settings?.delivery_fee) || 0,
            freeDeliveryAbove: Number(settings?.free_delivery_above) || 0,
            estimatedDeliveryTime: settings?.estimated_delivery_time || null,
            cashPayment: settings?.cash_payment !== false,
            cardOnDelivery: settings?.card_on_delivery !== false,
            onlinePayment: settings?.online_payment !== false,
            workingHours: settings?.working_hours || null,
            useBusinessHours: settings?.use_business_hours !== false,
            whatsappNumber: settings?.whatsapp_number || '',
            notifications: settings?.notifications || {},
            menuTheme: settings?.menu_theme || 'modern',
            waiterCallEnabled: settings?.waiter_call_enabled !== false,
            requestBillEnabled: settings?.request_bill_enabled !== false,
            cartEnabled: settings?.cart_enabled !== false,
            wifiPassword: settings?.wifi_password || '',
            styleId: settings?.style_id || 'modern',
            accentColorId: settings?.accent_color_id || 'emerald',
            showAvatar: settings?.show_avatar !== false,
            isActive: settings?.is_active !== false,
        };

        return NextResponse.json({
            success: true,
            data: {
                businessId,
                businessName: business.name,
                businessLogo: business.logo || '',
                businessPhone: business.phone || '',
                businessWhatsapp: business.whatsapp || business.phone || '',
                tableName,
                categories,
                products,
                extraGroups,
                extras,
                campaigns,
                settings: businessSettings,
            }
        });
    } catch (error) {
        console.error('[FastFood Public Menu] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error'
        }, { status: 500 });
    }
}
